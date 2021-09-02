"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreAggregations = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ramda_1 = __importDefault(require("ramda"));
const shared_1 = require("@cubejs-backend/shared");
const utils_1 = require("../driver/utils");
const RedisCacheDriver_1 = require("./RedisCacheDriver");
const LocalCacheDriver_1 = require("./LocalCacheDriver");
const QueryCache_1 = require("./QueryCache");
const ContinueWaitError_1 = require("./ContinueWaitError");
const StreamObjectsCounter_1 = require("./StreamObjectsCounter");
function encodeTimeStamp(time) {
    return Math.floor(time / 1000).toString(32);
}
function decodeTimeStamp(time) {
    return parseInt(time, 32) * 1000;
}
function version(cacheKey) {
    let result = '';
    const hashCharset = 'abcdefghijklmnopqrstuvwxyz012345';
    const digestBuffer = crypto_1.default.createHash('md5').update(JSON.stringify(cacheKey)).digest();
    let residue = 0;
    let shiftCounter = 0;
    for (let i = 0; i < 5; i++) {
        const byte = digestBuffer.readUInt8(i);
        shiftCounter += 8;
        // eslint-disable-next-line operator-assignment,no-bitwise
        residue = (byte << (shiftCounter - 8)) | residue;
        // eslint-disable-next-line no-bitwise
        while (residue >> 5) {
            result += hashCharset.charAt(residue % 32);
            shiftCounter -= 5;
            // eslint-disable-next-line operator-assignment,no-bitwise
            residue = residue >> 5;
        }
    }
    result += hashCharset.charAt(residue % 32);
    return result;
}
function getStructureVersion(preAggregation) {
    return version(preAggregation.indexesSql && preAggregation.indexesSql.length ?
        [preAggregation.loadSql, preAggregation.indexesSql] :
        preAggregation.loadSql);
}
const tablesToVersionEntries = (schema, tables) => ramda_1.default.sortBy(table => -table.last_updated_at, tables.map(table => {
    const match = (table.table_name || table.TABLE_NAME).match(/(.+)_(.+)_(.+)_(.+)/);
    if (!match) {
        return null;
    }
    const entity = {
        table_name: `${schema}.${match[1]}`,
        content_version: match[2],
        structure_version: match[3]
    };
    if (match[4].length < 13) {
        entity.last_updated_at = decodeTimeStamp(match[4]);
        entity.naming_version = 2;
    }
    else {
        entity.last_updated_at = parseInt(match[4], 10);
    }
    return entity;
}).filter(ramda_1.default.identity));
class PreAggregationLoadCache {
    constructor(redisPrefix, clientFactory, queryCache, preAggregations, options = { dataSource: 'default' }) {
        this.redisPrefix = `${redisPrefix}_${options.dataSource}`;
        this.dataSource = options.dataSource;
        this.driverFactory = clientFactory;
        this.queryCache = queryCache;
        this.preAggregations = preAggregations;
        this.queryResults = {};
        this.cacheDriver = preAggregations.cacheDriver;
        this.externalDriverFactory = preAggregations.externalDriverFactory;
        this.requestId = options.requestId;
        this.versionEntries = {};
        this.tables = {};
    }
    async tablesFromCache(preAggregation, forceRenew) {
        let tables = forceRenew ? null : await this.cacheDriver.get(this.tablesRedisKey(preAggregation));
        if (!tables) {
            tables = await this.preAggregations.getLoadCacheQueue(this.dataSource).executeInQueue('query', `Fetch tables for ${preAggregation.preAggregationsSchema}`, {
                preAggregation, requestId: this.requestId
            }, 0, { requestId: this.requestId });
        }
        return tables;
    }
    async fetchTables(preAggregation) {
        if (preAggregation.external && !this.externalDriverFactory) {
            throw new Error('externalDriverFactory is not provided. Please make sure @cubejs-backend/cubestore-driver is installed and use CUBEJS_DEV_MODE=true or provide Cube Store connection env variables for production usage.');
        }
        const newTables = await this.fetchTablesNoCache(preAggregation);
        await this.cacheDriver.set(this.tablesRedisKey(preAggregation), newTables, this.preAggregations.options.preAggregationsSchemaCacheExpire || 60 * 60);
        return newTables;
    }
    async fetchTablesNoCache(preAggregation) {
        const client = preAggregation.external ?
            await this.externalDriverFactory() :
            await this.driverFactory();
        return client.getTablesQuery(preAggregation.preAggregationsSchema);
    }
    tablesRedisKey(preAggregation) {
        return `SQL_PRE_AGGREGATIONS_TABLES_${this.redisPrefix}_${preAggregation.dataSource}${preAggregation.external ? '_EXT' : ''}`;
    }
    async getTablesQuery(preAggregation) {
        const redisKey = this.tablesRedisKey(preAggregation);
        if (!this.tables[redisKey]) {
            this.tables[redisKey] = this.preAggregations.options.skipExternalCacheAndQueue && preAggregation.external ?
                await this.fetchTablesNoCache(preAggregation) :
                await this.tablesFromCache(preAggregation);
        }
        return this.tables[redisKey];
    }
    async getVersionEntries(preAggregation) {
        const redisKey = this.tablesRedisKey(preAggregation);
        if (!this.versionEntries[redisKey]) {
            let versionEntries = tablesToVersionEntries(preAggregation.preAggregationsSchema, await this.getTablesQuery(preAggregation));
            // It presumes strong consistency guarantees for external pre-aggregation tables ingestion
            if (!preAggregation.external) {
                // eslint-disable-next-line
                const [active, toProcess, queries] = await this.fetchQueryStageState();
                const targetTableNamesInQueue = (Object.keys(queries))
                    // eslint-disable-next-line no-use-before-define
                    .map(q => PreAggregations.targetTableName(queries[q].query.newVersionEntry));
                versionEntries = versionEntries.filter(
                // eslint-disable-next-line no-use-before-define
                e => targetTableNamesInQueue.indexOf(PreAggregations.targetTableName(e)) === -1);
            }
            const byContent = {};
            const byStructure = {};
            const byTableName = {};
            versionEntries.forEach(e => {
                const contentKey = `${e.table_name}_${e.content_version}`;
                if (!byContent[contentKey]) {
                    byContent[contentKey] = e;
                }
                const structureKey = `${e.table_name}_${e.structure_version}`;
                if (!byStructure[structureKey]) {
                    byStructure[structureKey] = e;
                }
                if (!byTableName[e.table_name]) {
                    byTableName[e.table_name] = e;
                }
            });
            this.versionEntries[redisKey] = { versionEntries, byContent, byStructure, byTableName };
        }
        return this.versionEntries[redisKey];
    }
    async keyQueryResult(sqlQuery, waitForRenew, priority) {
        const [query, values, queryOptions] = Array.isArray(sqlQuery) ? sqlQuery : [sqlQuery, [], {}];
        if (!this.queryResults[this.queryCache.queryRedisKey([query, values])]) {
            this.queryResults[this.queryCache.queryRedisKey([query, values])] = await this.queryCache.cacheQueryResult(query, values, [query, values], 60 * 60, {
                renewalThreshold: this.queryCache.options.refreshKeyRenewalThreshold
                    || (queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.renewalThreshold) || 2 * 60,
                renewalKey: [query, values],
                waitForRenew,
                priority,
                requestId: this.requestId,
                dataSource: this.dataSource,
                useInMemory: true,
                external: queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.external
            });
        }
        return this.queryResults[this.queryCache.queryRedisKey([query, values])];
    }
    hasKeyQueryResult(keyQuery) {
        return !!this.queryResults[this.queryCache.queryRedisKey(keyQuery)];
    }
    async getQueryStage(stageQueryKey) {
        const queue = this.preAggregations.getQueue(this.dataSource);
        await this.fetchQueryStageState(queue);
        return queue.getQueryStage(stageQueryKey, undefined, this.queryStageState);
    }
    async fetchQueryStageState(queue) {
        queue = queue || this.preAggregations.getQueue(this.dataSource);
        if (!this.queryStageState) {
            this.queryStageState = await queue.fetchQueryStageState();
        }
        return this.queryStageState;
    }
    async reset(preAggregation) {
        await this.tablesFromCache(preAggregation, true);
        this.tables = {};
        this.queryStageState = undefined;
        this.versionEntries = {};
    }
}
class PreAggregationLoader {
    constructor(redisPrefix, driverFactory, logger, queryCache, 
    // eslint-disable-next-line no-use-before-define
    preAggregations, preAggregation, preAggregationsTablesToTempTables, loadCache, options = {}) {
        this.redisPrefix = redisPrefix;
        this.driverFactory = driverFactory;
        this.logger = logger;
        this.queryCache = queryCache;
        this.preAggregations = preAggregations;
        this.preAggregation = preAggregation;
        this.preAggregationsTablesToTempTables = preAggregationsTablesToTempTables;
        this.loadCache = loadCache;
        this.waitForRenew = options.waitForRenew;
        this.forceBuild = options.forceBuild;
        this.orphanedTimeout = options.orphanedTimeout;
        this.externalDriverFactory = preAggregations.externalDriverFactory;
        this.requestId = options.requestId;
        this.structureVersionPersistTime = preAggregations.structureVersionPersistTime;
        this.externalRefresh = options.externalRefresh;
        if (this.externalRefresh && this.waitForRenew) {
            const message = 'Invalid configuration - when externalRefresh is true, it will not perform a renew, therefore you cannot wait for it using waitForRenew.';
            if (['production', 'test'].includes(shared_1.getEnv('nodeEnv'))) {
                throw new Error(message);
            }
            else {
                this.logger('Invalid Configuration', {
                    requestId: this.requestId,
                    warning: message,
                });
                this.waitForRenew = false;
            }
        }
    }
    async loadPreAggregation() {
        const notLoadedKey = (this.preAggregation.invalidateKeyQueries || [])
            .find(keyQuery => !this.loadCache.hasKeyQueryResult(keyQuery));
        if (notLoadedKey && !this.waitForRenew) {
            const structureVersion = getStructureVersion(this.preAggregation);
            const getVersionsStarted = new Date();
            const { byStructure } = await this.loadCache.getVersionEntries(this.preAggregation);
            this.logger('Load PreAggregations Tables', {
                preAggregation: this.preAggregation,
                requestId: this.requestId,
                duration: (new Date().getTime() - getVersionsStarted.getTime())
            });
            const versionEntryByStructureVersion = byStructure[`${this.preAggregation.tableName}_${structureVersion}`];
            if (this.externalRefresh) {
                if (!versionEntryByStructureVersion) {
                    throw new Error('One or more pre-aggregation tables could not be found to satisfy that query');
                }
                // the rollups are being maintained independently of this instance of cube.js,
                // immediately return the latest data it already has
                return this.targetTableName(versionEntryByStructureVersion);
            }
            if (versionEntryByStructureVersion) {
                // this triggers an asyncronous/background load of the pre-aggregation but immediately
                // returns the latest data it already has
                this.loadPreAggregationWithKeys().catch(e => {
                    if (!(e instanceof ContinueWaitError_1.ContinueWaitError)) {
                        this.logger('Error loading pre-aggregation', {
                            error: (e.stack || e),
                            preAggregation: this.preAggregation,
                            requestId: this.requestId
                        });
                    }
                });
                return this.targetTableName(versionEntryByStructureVersion);
            }
            else {
                // no rollup has been built yet - build it synchronously as part of responding to this request
                return this.loadPreAggregationWithKeys();
            }
        }
        else {
            // either we have no data cached for this rollup or waitForRenew is true, either way,
            // synchronously renew what data is needed so that the most current data will be returned for the current request
            return {
                targetTableName: await this.loadPreAggregationWithKeys(),
                refreshKeyValues: await this.getInvalidationKeyValues()
            };
        }
    }
    async loadPreAggregationWithKeys() {
        const invalidationKeys = await this.getInvalidationKeyValues();
        const contentVersion = this.contentVersion(invalidationKeys);
        const structureVersion = getStructureVersion(this.preAggregation);
        const versionEntries = await this.loadCache.getVersionEntries(this.preAggregation);
        const getVersionEntryByContentVersion = ({ byContent }) => byContent[`${this.preAggregation.tableName}_${contentVersion}`];
        const versionEntryByContentVersion = getVersionEntryByContentVersion(versionEntries);
        if (versionEntryByContentVersion && !this.forceBuild) {
            return this.targetTableName(versionEntryByContentVersion);
        }
        // TODO this check can be redundant due to structure version is already checked in loadPreAggregation()
        if (!this.waitForRenew &&
            // eslint-disable-next-line no-use-before-define
            await this.loadCache.getQueryStage(PreAggregations.preAggregationQueryCacheKey(this.preAggregation))) {
            const versionEntryByStructureVersion = versionEntries.byStructure[`${this.preAggregation.tableName}_${structureVersion}`];
            if (versionEntryByStructureVersion) {
                return this.targetTableName(versionEntryByStructureVersion);
            }
        }
        if (!versionEntries.versionEntries.length) {
            const client = this.preAggregation.external ?
                await this.externalDriverFactory() :
                await this.driverFactory();
            await client.createSchemaIfNotExists(this.preAggregation.preAggregationsSchema);
        }
        // ensure we find appropriate structure version before invalidating anything
        const versionEntry = versionEntries.byStructure[`${this.preAggregation.tableName}_${structureVersion}`] ||
            versionEntries.byTableName[this.preAggregation.tableName];
        const newVersionEntry = {
            table_name: this.preAggregation.tableName,
            structure_version: structureVersion,
            content_version: contentVersion,
            last_updated_at: new Date().getTime(),
            naming_version: 2,
        };
        const mostRecentTargetTableName = async () => {
            await this.loadCache.reset(this.preAggregation);
            const lastVersion = getVersionEntryByContentVersion(await this.loadCache.getVersionEntries(this.preAggregation));
            if (!lastVersion) {
                throw new Error(`Pre-aggregation table is not found for ${this.preAggregation.tableName} after it was successfully created. It usually means database silently truncates table names due to max name length.`);
            }
            return this.targetTableName(lastVersion);
        };
        if (this.forceBuild) {
            this.logger('Force build pre-aggregation', {
                preAggregation: this.preAggregation,
                requestId: this.requestId,
                queryKey: this.preAggregationQueryKey(invalidationKeys),
                newVersionEntry
            });
            await this.executeInQueue(invalidationKeys, this.priority(10), newVersionEntry);
            return mostRecentTargetTableName();
        }
        if (versionEntry) {
            if (versionEntry.structure_version !== newVersionEntry.structure_version) {
                this.logger('Invalidating pre-aggregation structure', {
                    preAggregation: this.preAggregation,
                    requestId: this.requestId,
                    queryKey: this.preAggregationQueryKey(invalidationKeys),
                    newVersionEntry
                });
                await this.executeInQueue(invalidationKeys, this.priority(10), newVersionEntry);
                return mostRecentTargetTableName();
            }
            else if (versionEntry.content_version !== newVersionEntry.content_version) {
                if (this.waitForRenew) {
                    this.logger('Waiting for pre-aggregation renew', {
                        preAggregation: this.preAggregation,
                        requestId: this.requestId,
                        queryKey: this.preAggregationQueryKey(invalidationKeys),
                        newVersionEntry
                    });
                    await this.executeInQueue(invalidationKeys, this.priority(0), newVersionEntry);
                    return mostRecentTargetTableName();
                }
                else {
                    this.scheduleRefresh(invalidationKeys, newVersionEntry);
                }
            }
        }
        else {
            this.logger('Creating pre-aggregation from scratch', {
                preAggregation: this.preAggregation,
                requestId: this.requestId,
                queryKey: this.preAggregationQueryKey(invalidationKeys),
                newVersionEntry
            });
            await this.executeInQueue(invalidationKeys, this.priority(10), newVersionEntry);
            return mostRecentTargetTableName();
        }
        return this.targetTableName(versionEntry);
    }
    contentVersion(invalidationKeys) {
        return version(this.preAggregation.indexesSql && this.preAggregation.indexesSql.length ?
            [this.preAggregation.loadSql, this.preAggregation.indexesSql, invalidationKeys] :
            [this.preAggregation.loadSql, invalidationKeys]);
    }
    priority(defaultValue) {
        return this.preAggregation.priority != null ? this.preAggregation.priority : defaultValue;
    }
    getInvalidationKeyValues() {
        return Promise.all((this.preAggregation.invalidateKeyQueries || []).map((sqlQuery) => this.loadCache.keyQueryResult(sqlQuery, this.waitForRenew, this.priority(10))));
    }
    scheduleRefresh(invalidationKeys, newVersionEntry) {
        this.logger('Refreshing pre-aggregation content', {
            preAggregation: this.preAggregation,
            requestId: this.requestId,
            queryKey: this.preAggregationQueryKey(invalidationKeys),
            newVersionEntry
        });
        this.executeInQueue(invalidationKeys, this.priority(0), newVersionEntry)
            .catch(e => {
            if (!(e instanceof ContinueWaitError_1.ContinueWaitError)) {
                this.logger('Error refreshing pre-aggregation', {
                    error: (e.stack || e), preAggregation: this.preAggregation, requestId: this.requestId
                });
            }
        });
    }
    async executeInQueue(invalidationKeys, priority, newVersionEntry) {
        return this.preAggregations.getQueue(this.preAggregation.dataSource).executeInQueue('query', this.preAggregationQueryKey(invalidationKeys), {
            preAggregation: this.preAggregation,
            preAggregationsTablesToTempTables: this.preAggregationsTablesToTempTables,
            newVersionEntry,
            requestId: this.requestId,
            invalidationKeys,
            forceBuild: this.forceBuild,
            orphanedTimeout: this.orphanedTimeout
        }, priority, 
        // eslint-disable-next-line no-use-before-define
        { stageQueryKey: PreAggregations.preAggregationQueryCacheKey(this.preAggregation), requestId: this.requestId });
    }
    preAggregationQueryKey(invalidationKeys) {
        return this.preAggregation.indexesSql && this.preAggregation.indexesSql.length ?
            [this.preAggregation.loadSql, this.preAggregation.indexesSql, invalidationKeys] :
            [this.preAggregation.loadSql, invalidationKeys];
    }
    targetTableName(versionEntry) {
        // eslint-disable-next-line no-use-before-define
        return PreAggregations.targetTableName(versionEntry);
    }
    refresh(preAggregation, newVersionEntry, invalidationKeys) {
        return (client) => {
            let refreshStrategy = this.refreshImplStoreInSourceStrategy;
            if (this.preAggregation.external) {
                const readOnly = client.config && client.config.readOnly ||
                    client.readOnly && (typeof client.readOnly === 'boolean' ? client.readOnly : client.readOnly());
                refreshStrategy = readOnly ?
                    this.refreshImplStreamExternalStrategy : this.refreshImplTempTableExternalStrategy;
            }
            return utils_1.cancelCombinator(saveCancelFn => refreshStrategy.bind(this)(client, newVersionEntry, saveCancelFn, preAggregation, invalidationKeys));
        };
    }
    logExecutingSql(invalidationKeys, query, params, targetTableName, newVersionEntry) {
        this.logger('Executing Load Pre Aggregation SQL', this.queryOptions(invalidationKeys, query, params, targetTableName, newVersionEntry));
    }
    queryOptions(invalidationKeys, query, params, targetTableName, newVersionEntry) {
        return {
            queryKey: this.preAggregationQueryKey(invalidationKeys),
            query,
            values: params,
            targetTableName,
            requestId: this.requestId,
            newVersionEntry,
        };
    }
    async refreshImplStoreInSourceStrategy(client, newVersionEntry, saveCancelFn, preAggregation, invalidationKeys) {
        const [loadSql, params] = Array.isArray(this.preAggregation.loadSql) ? this.preAggregation.loadSql : [this.preAggregation.loadSql, []];
        const targetTableName = this.targetTableName(newVersionEntry);
        const query = QueryCache_1.QueryCache.replacePreAggregationTableNames(loadSql, this.preAggregationsTablesToTempTables)
            .replace(this.preAggregation.tableName, targetTableName);
        this.logExecutingSql(invalidationKeys, query, params, targetTableName, newVersionEntry);
        // TODO move index creation to the driver
        await saveCancelFn(client.loadPreAggregationIntoTable(targetTableName, query, params, this.queryOptions(invalidationKeys, query, params, targetTableName, newVersionEntry)));
        await this.createIndexes(client, newVersionEntry, saveCancelFn);
        await this.loadCache.fetchTables(this.preAggregation);
        await this.dropOrphanedTables(client, targetTableName, saveCancelFn, false);
        await this.loadCache.fetchTables(this.preAggregation);
    }
    /**
     * Strategy to copy pre-aggregation from source db (with write permissions) to external data
     */
    async refreshImplTempTableExternalStrategy(client, newVersionEntry, saveCancelFn, preAggregation, invalidationKeys) {
        const [loadSql, params] = Array.isArray(this.preAggregation.loadSql) ? this.preAggregation.loadSql : [this.preAggregation.loadSql, []];
        await client.createSchemaIfNotExists(this.preAggregation.preAggregationsSchema);
        const targetTableName = this.targetTableName(newVersionEntry);
        const query = QueryCache_1.QueryCache.replacePreAggregationTableNames(loadSql, this.preAggregationsTablesToTempTables)
            .replace(this.preAggregation.tableName, targetTableName);
        this.logExecutingSql(invalidationKeys, query, params, targetTableName, newVersionEntry);
        await saveCancelFn(client.loadPreAggregationIntoTable(targetTableName, query, params, this.queryOptions(invalidationKeys, query, params, targetTableName, newVersionEntry)));
        const tableData = await this.downloadTempExternalPreAggregation(client, newVersionEntry, preAggregation, saveCancelFn);
        try {
            await this.uploadExternalPreAggregation(tableData, newVersionEntry, saveCancelFn);
        }
        finally {
            if (tableData.release) {
                await tableData.release();
            }
        }
        await this.loadCache.fetchTables(this.preAggregation);
        await this.dropOrphanedTables(client, targetTableName, saveCancelFn, false);
    }
    /**
     * Strategy to copy pre-aggregation from source db (for read-only permissions) to external data
     */
    async refreshImplStreamExternalStrategy(client, newVersionEntry, saveCancelFn, preAggregation, invalidationKeys) {
        const [sql, params] = Array.isArray(this.preAggregation.sql) ? this.preAggregation.sql : [this.preAggregation.sql, []];
        // @todo Deprecated, BaseDriver already implements it, before remove we need to add check for factoryDriver
        if (!client.downloadQueryResults) {
            throw new Error('Can\'t load external pre-aggregation: source driver doesn\'t support downloadQueryResults()');
        }
        this.logExecutingSql(invalidationKeys, sql, params, this.targetTableName(newVersionEntry), newVersionEntry);
        this.logger('Downloading external pre-aggregation via query', {
            preAggregation: this.preAggregation,
            requestId: this.requestId
        });
        const externalDriver = await this.externalDriverFactory();
        const capabilities = externalDriver.capabilities && externalDriver.capabilities();
        const tableData = await saveCancelFn(client.downloadQueryResults(sql, params, {
            ...this.queryOptions(invalidationKeys, sql, params, this.targetTableName(newVersionEntry), newVersionEntry),
            ...capabilities,
            ...this.getStreamingOptions(),
        }));
        try {
            await this.uploadExternalPreAggregation(tableData, newVersionEntry, saveCancelFn);
        }
        finally {
            if (tableData.release) {
                await tableData.release();
            }
        }
        await this.loadCache.fetchTables(this.preAggregation);
    }
    getUnloadOptions() {
        return {
            // Default: 16mb for Snowflake, Should be specified in MBs, because drivers convert it
            maxFileSize: 64
        };
    }
    getStreamingOptions() {
        return {
            // Default: 16384 (16KB), or 16 for objectMode streams. PostgreSQL/MySQL use object streams
            highWaterMark: 10000
        };
    }
    /**
     * Create table (for db with write permissions) and extract data via memory/stream/unload
     */
    async downloadTempExternalPreAggregation(client, newVersionEntry, preAggregation, saveCancelFn) {
        // @todo Deprecated, BaseDriver already implements it, before remove we need to add check for factoryDriver
        if (!client.downloadTable) {
            throw new Error('Can\'t load external pre-aggregation: source driver doesn\'t support downloadTable()');
        }
        const table = this.targetTableName(newVersionEntry);
        this.logger('Downloading external pre-aggregation', {
            preAggregation: this.preAggregation,
            requestId: this.requestId
        });
        const externalDriver = await this.externalDriverFactory();
        const capabilities = externalDriver.capabilities && externalDriver.capabilities();
        let tableData;
        if (capabilities.csvImport && client.unload && await client.isUnloadSupported(this.getUnloadOptions())) {
            tableData = await saveCancelFn(client.unload(table, this.getUnloadOptions()));
        }
        else if (capabilities.streamImport && client.stream) {
            tableData = await saveCancelFn(client.stream(`SELECT * FROM ${table}`, [], this.getStreamingOptions()));
            if (client.unload) {
                const stream = new StreamObjectsCounter_1.LargeStreamWarning(preAggregation.preAggregationId);
                tableData.rowStream.pipe(stream);
                tableData.rowStream = stream;
            }
        }
        else {
            tableData = await saveCancelFn(client.downloadTable(table, capabilities));
        }
        if (!tableData.types) {
            tableData.types = await saveCancelFn(client.tableColumnTypes(table));
        }
        return tableData;
    }
    async uploadExternalPreAggregation(tableData, newVersionEntry, saveCancelFn) {
        const externalDriver = await this.externalDriverFactory();
        const table = this.targetTableName(newVersionEntry);
        this.logger('Uploading external pre-aggregation', {
            preAggregation: this.preAggregation,
            requestId: this.requestId
        });
        await saveCancelFn(externalDriver.uploadTableWithIndexes(table, tableData.types, tableData, this.prepareIndexesSql(newVersionEntry)));
        await this.loadCache.fetchTables(this.preAggregation);
        await this.dropOrphanedTables(externalDriver, table, saveCancelFn, true);
    }
    async createIndexes(driver, newVersionEntry, saveCancelFn) {
        const indexesSql = this.prepareIndexesSql(newVersionEntry);
        for (let i = 0; i < indexesSql.length; i++) {
            const [query, params] = indexesSql[i].sql;
            await saveCancelFn(driver.query(query, params));
        }
    }
    prepareIndexesSql(newVersionEntry) {
        if (!this.preAggregation.indexesSql || !this.preAggregation.indexesSql.length) {
            return [];
        }
        return this.preAggregation.indexesSql.map(({ sql, indexName }) => {
            const [query, params] = sql;
            const indexVersionEntry = {
                ...newVersionEntry,
                table_name: indexName
            };
            this.logger('Creating pre-aggregation index', {
                preAggregation: this.preAggregation,
                requestId: this.requestId,
                sql
            });
            const resultingSql = QueryCache_1.QueryCache.replacePreAggregationTableNames(query, this.preAggregationsTablesToTempTables.concat([
                [this.preAggregation.tableName, { targetTableName: this.targetTableName(newVersionEntry) }],
                [indexName, { targetTableName: this.targetTableName(indexVersionEntry) }]
            ]));
            return { sql: [resultingSql, params] };
        });
    }
    async dropOrphanedTables(client, justCreatedTable, saveCancelFn, external) {
        await this.preAggregations.addTableUsed(justCreatedTable);
        const lockKey = external
            ? 'drop-orphaned-tables-external'
            : `drop-orphaned-tables:${this.preAggregation.dataSource}`;
        return this.queryCache.withLock(lockKey, 60 * 5, async () => {
            const actualTables = await client.getTablesQuery(this.preAggregation.preAggregationsSchema);
            const versionEntries = tablesToVersionEntries(this.preAggregation.preAggregationsSchema, actualTables);
            const versionEntriesToSave = ramda_1.default.pipe(ramda_1.default.groupBy(v => v.table_name), ramda_1.default.toPairs, ramda_1.default.map(p => p[1][0]))(versionEntries);
            const structureVersionsToSave = ramda_1.default.pipe(ramda_1.default.filter((v) => new Date().getTime() - v.last_updated_at < this.structureVersionPersistTime * 1000), ramda_1.default.groupBy(v => `${v.table_name}_${v.structure_version}`), ramda_1.default.toPairs, ramda_1.default.map(p => p[1][0]))(versionEntries);
            const tablesToSave = (await this.preAggregations.tablesUsed())
                .concat(structureVersionsToSave.map(v => this.targetTableName(v)))
                .concat(versionEntriesToSave.map(v => this.targetTableName(v)))
                .concat([justCreatedTable]);
            const toDrop = actualTables
                .map(t => `${this.preAggregation.preAggregationsSchema}.${t.table_name || t.TABLE_NAME}`)
                .filter(t => tablesToSave.indexOf(t) === -1);
            this.logger('Dropping orphaned tables', {
                tablesToDrop: JSON.stringify(toDrop),
                requestId: this.requestId
            });
            await Promise.all(toDrop.map(table => saveCancelFn(client.dropTable(table))));
        });
    }
}
class PreAggregations {
    constructor(redisPrefix, driverFactory, logger, queryCache, options) {
        this.redisPrefix = redisPrefix;
        this.driverFactory = driverFactory;
        this.logger = logger;
        this.queryCache = queryCache;
        this.loadCacheQueue = {};
        this.queue = {};
        this.options = options || {};
        this.cacheDriver = options.cacheAndQueueDriver === 'redis' ?
            new RedisCacheDriver_1.RedisCacheDriver({ pool: options.redisPool }) :
            new LocalCacheDriver_1.LocalCacheDriver();
        this.externalDriverFactory = options.externalDriverFactory;
        this.structureVersionPersistTime = options.structureVersionPersistTime || 60 * 60 * 24 * 30;
        this.usedTablePersistTime = options.usedTablePersistTime || 600;
        this.externalRefresh = options.externalRefresh;
    }
    tablesUsedRedisKey(tableName) {
        // TODO add dataSource?
        return `SQL_PRE_AGGREGATIONS_${this.redisPrefix}_TABLES_USED_${tableName}`;
    }
    async addTableUsed(tableName) {
        return this.cacheDriver.set(this.tablesUsedRedisKey(tableName), true, this.usedTablePersistTime);
    }
    async tablesUsed() {
        return (await this.cacheDriver.keysStartingWith(this.tablesUsedRedisKey('')))
            .map(k => k.replace(this.tablesUsedRedisKey(''), ''));
    }
    loadAllPreAggregationsIfNeeded(queryBody) {
        const preAggregations = queryBody.preAggregations || [];
        const loadCacheByDataSource = queryBody.preAggregationsLoadCacheByDataSource || {};
        const getLoadCacheByDataSource = (dataSource = 'default') => {
            if (!loadCacheByDataSource[dataSource]) {
                loadCacheByDataSource[dataSource] =
                    new PreAggregationLoadCache(this.redisPrefix, () => this.driverFactory(dataSource), this.queryCache, this, {
                        requestId: queryBody.requestId,
                        dataSource
                    });
            }
            return loadCacheByDataSource[dataSource];
        };
        return preAggregations.map(p => (preAggregationsTablesToTempTables) => {
            const loader = new PreAggregationLoader(this.redisPrefix, () => this.driverFactory(p.dataSource || 'default'), this.logger, this.queryCache, this, p, preAggregationsTablesToTempTables, getLoadCacheByDataSource(p.dataSource), {
                waitForRenew: queryBody.renewQuery,
                forceBuild: queryBody.forceBuildPreAggregations,
                requestId: queryBody.requestId,
                orphanedTimeout: queryBody.orphanedTimeout,
                externalRefresh: this.externalRefresh
            });
            const preAggregationPromise = () => loader.loadPreAggregation().then(async (targetTableName) => {
                const usedPreAggregation = {
                    ...(typeof targetTableName === 'string' ? { targetTableName } : targetTableName),
                    type: p.type,
                };
                await this.addTableUsed(usedPreAggregation.targetTableName);
                return [p.tableName, usedPreAggregation];
            });
            return preAggregationPromise().then(res => preAggregationsTablesToTempTables.concat([res]));
        }).reduce((promise, fn) => promise.then(fn), Promise.resolve([]));
    }
    getQueue(dataSource = 'default') {
        if (!this.queue[dataSource]) {
            this.queue[dataSource] = QueryCache_1.QueryCache.createQueue(`SQL_PRE_AGGREGATIONS_${this.redisPrefix}_${dataSource}`, () => this.driverFactory(dataSource), (client, q) => {
                const { preAggregation, preAggregationsTablesToTempTables, newVersionEntry, requestId, invalidationKeys } = q;
                const loader = new PreAggregationLoader(this.redisPrefix, () => this.driverFactory(dataSource), this.logger, this.queryCache, this, preAggregation, preAggregationsTablesToTempTables, new PreAggregationLoadCache(this.redisPrefix, () => this.driverFactory(dataSource), this.queryCache, this, { requestId, dataSource }), { requestId, externalRefresh: this.externalRefresh });
                return loader.refresh(preAggregation, newVersionEntry, invalidationKeys)(client);
            }, {
                concurrency: 1,
                logger: this.logger,
                cacheAndQueueDriver: this.options.cacheAndQueueDriver,
                redisPool: this.options.redisPool,
                // Centralized continueWaitTimeout that can be overridden in queueOptions
                continueWaitTimeout: this.options.continueWaitTimeout,
                ...(typeof this.options.queueOptions === 'function' ?
                    this.options.queueOptions(dataSource) :
                    this.options.queueOptions)
            });
        }
        return this.queue[dataSource];
    }
    getLoadCacheQueue(dataSource = 'default') {
        if (!this.loadCacheQueue[dataSource]) {
            this.loadCacheQueue[dataSource] = QueryCache_1.QueryCache.createQueue(`SQL_PRE_AGGREGATIONS_CACHE_${this.redisPrefix}_${dataSource}`, 
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            () => ({}), (_, q) => {
                const { preAggregation, requestId } = q;
                const loadCache = new PreAggregationLoadCache(this.redisPrefix, () => this.driverFactory(dataSource), this.queryCache, this, { requestId, dataSource });
                return loadCache.fetchTables(preAggregation);
            }, {
                concurrency: 4,
                logger: this.logger,
                cacheAndQueueDriver: this.options.cacheAndQueueDriver,
                redisPool: this.options.redisPool,
                ...this.options.loadCacheQueueOptions
            });
        }
        return this.loadCacheQueue[dataSource];
    }
    static preAggregationQueryCacheKey(preAggregation) {
        return preAggregation.tableName;
    }
    static targetTableName(versionEntry) {
        if (versionEntry.naming_version === 2) {
            return `${versionEntry.table_name}_${versionEntry.content_version}_${versionEntry.structure_version}_${encodeTimeStamp(versionEntry.last_updated_at)}`;
        }
        return `${versionEntry.table_name}_${versionEntry.content_version}_${versionEntry.structure_version}_${versionEntry.last_updated_at}`;
    }
    static structureVersion(preAggregation) {
        return getStructureVersion(preAggregation);
    }
    async getVersionEntries(preAggregations, requestId) {
        const loadCacheByDataSource = [...new Set(preAggregations.map(p => p.dataSource))]
            .reduce((obj, dataSource) => {
            obj[dataSource] = new PreAggregationLoadCache(this.redisPrefix, () => this.driverFactory(dataSource), this.queryCache, this, {
                requestId,
                dataSource
            });
            return obj;
        }, {});
        const firstByCacheKey = {};
        const data = await Promise.all(preAggregations.map(async (preAggregation) => {
            const { dataSource } = preAggregation;
            const cacheKey = loadCacheByDataSource[dataSource].tablesRedisKey(preAggregation);
            if (!firstByCacheKey[cacheKey]) {
                firstByCacheKey[cacheKey] = loadCacheByDataSource[dataSource].getVersionEntries(preAggregation);
                const res = await firstByCacheKey[cacheKey];
                return res.versionEntries;
            }
            return null;
        }));
        return data.filter(res => res);
    }
    async getQueueState(dataSource = undefined) {
        const queries = await this.getQueue(dataSource).getQueries();
        return queries;
    }
}
exports.PreAggregations = PreAggregations;
//# sourceMappingURL=PreAggregations.js.map