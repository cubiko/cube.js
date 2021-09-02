"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryOrchestrator = void 0;
const ramda_1 = __importDefault(require("ramda"));
const shared_1 = require("@cubejs-backend/shared");
const QueryCache_1 = require("./QueryCache");
const PreAggregations_1 = require("./PreAggregations");
const RedisPool_1 = require("./RedisPool");
class QueryOrchestrator {
    constructor(redisPrefix, driverFactory, logger, options = {}) {
        this.redisPrefix = redisPrefix;
        this.driverFactory = driverFactory;
        this.logger = logger;
        this.rollupOnlyMode = options.rollupOnlyMode;
        const cacheAndQueueDriver = options.cacheAndQueueDriver || shared_1.getEnv('cacheAndQueueDriver') || ((shared_1.getEnv('nodeEnv') === 'production' || shared_1.getEnv('redisUrl') || shared_1.getEnv('redisUseIORedis'))
            ? 'redis'
            : 'memory');
        if (!['redis', 'memory'].includes(cacheAndQueueDriver)) {
            throw new Error('Only \'redis\' or \'memory\' are supported for cacheAndQueueDriver option');
        }
        const redisPool = cacheAndQueueDriver === 'redis' ? new RedisPool_1.RedisPool(options.redisPoolOptions) : undefined;
        const { externalDriverFactory, continueWaitTimeout, skipExternalCacheAndQueue } = options;
        this.queryCache = new QueryCache_1.QueryCache(this.redisPrefix, driverFactory, this.logger, {
            externalDriverFactory,
            cacheAndQueueDriver,
            redisPool,
            continueWaitTimeout,
            skipExternalCacheAndQueue,
            ...options.queryCacheOptions,
        });
        this.preAggregations = new PreAggregations_1.PreAggregations(this.redisPrefix, this.driverFactory, this.logger, this.queryCache, {
            externalDriverFactory,
            cacheAndQueueDriver,
            redisPool,
            continueWaitTimeout,
            skipExternalCacheAndQueue,
            ...options.preAggregationsOptions
        });
    }
    async fetchQuery(queryBody) {
        const preAggregationsTablesToTempTables = await this.preAggregations.loadAllPreAggregationsIfNeeded(queryBody);
        const usedPreAggregations = ramda_1.default.fromPairs(preAggregationsTablesToTempTables);
        if (this.rollupOnlyMode && Object.keys(usedPreAggregations).length === 0) {
            throw new Error('No pre-aggregation exists for that query');
        }
        if (!queryBody.query) {
            return {
                usedPreAggregations
            };
        }
        const result = await this.queryCache.cachedQueryResult(queryBody, preAggregationsTablesToTempTables);
        return {
            ...result,
            dataSource: queryBody.dataSource,
            external: queryBody.external,
            usedPreAggregations
        };
    }
    async loadRefreshKeys(query) {
        return this.queryCache.loadRefreshKeysFromQuery(query);
    }
    async queryStage(queryBody) {
        const preAggregationsQueryStageStateByDataSource = {};
        const preAggregationsQueryStageState = async (dataSource) => {
            if (!preAggregationsQueryStageStateByDataSource[dataSource]) {
                const queue = this.preAggregations.getQueue(dataSource);
                preAggregationsQueryStageStateByDataSource[dataSource] = queue.fetchQueryStageState();
            }
            return preAggregationsQueryStageStateByDataSource[dataSource];
        };
        const pendingPreAggregationIndex = (await Promise.all((queryBody.preAggregations || [])
            .map(async (p) => this.preAggregations.getQueue(p.dataSource).getQueryStage(PreAggregations_1.PreAggregations.preAggregationQueryCacheKey(p), 10, await preAggregationsQueryStageState(p.dataSource))))).findIndex(p => !!p);
        if (pendingPreAggregationIndex === -1) {
            return this.queryCache.getQueue(queryBody.dataSource).getQueryStage(QueryCache_1.QueryCache.queryCacheKey(queryBody));
        }
        const preAggregation = queryBody.preAggregations[pendingPreAggregationIndex];
        const preAggregationStage = await this.preAggregations.getQueue(preAggregation.dataSource).getQueryStage(PreAggregations_1.PreAggregations.preAggregationQueryCacheKey(preAggregation), undefined, await preAggregationsQueryStageState(preAggregation.dataSource));
        if (!preAggregationStage) {
            return undefined;
        }
        const stageMessage = `Building pre-aggregation ${pendingPreAggregationIndex + 1}/${queryBody.preAggregations.length}`;
        if (preAggregationStage.stage.indexOf('queue') !== -1) {
            return { ...preAggregationStage, stage: `${stageMessage}: ${preAggregationStage.stage}` };
        }
        else {
            return { ...preAggregationStage, stage: stageMessage };
        }
    }
    resultFromCacheIfExists(queryBody) {
        return this.queryCache.resultFromCacheIfExists(queryBody);
    }
    async testConnections() {
        // @todo Possible, We will allow to use different drivers for cache and queue, dont forget to add both
        return this.queryCache.testConnection();
    }
    async cleanup() {
        return this.queryCache.cleanup();
    }
    async getPreAggregationVersionEntries(preAggregations, preAggregationsSchema, requestId) {
        const versionEntries = await this.preAggregations.getVersionEntries(preAggregations.map(p => {
            const { preAggregation } = p.preAggregation;
            const partition = p.partitions[0];
            preAggregation.dataSource = (partition && partition.dataSource) || 'default';
            preAggregation.preAggregationsSchema = preAggregationsSchema;
            return preAggregation;
        }), requestId);
        const flatFn = (arrResult, arrItem) => ([...arrResult, ...arrItem]);
        const partitionsByTableName = preAggregations
            .map(p => p.partitions)
            .reduce(flatFn, [])
            .reduce((obj, partition) => {
            if (partition && partition.sql)
                obj[partition.sql.tableName] = partition;
            return obj;
        }, {});
        return versionEntries
            .reduce(flatFn, [])
            .filter((versionEntry) => {
            const partition = partitionsByTableName[versionEntry.table_name];
            return partition && versionEntry.structure_version === PreAggregations_1.PreAggregations.structureVersion(partition.sql);
        });
    }
    async getPreAggregationPreview(requestId, preAggregation, versionEntry) {
        if (!preAggregation.sql)
            return [];
        const { previewSql, tableName, external, dataSource } = preAggregation.sql;
        const targetTableName = PreAggregations_1.PreAggregations.targetTableName(versionEntry);
        const querySql = QueryCache_1.QueryCache.replacePreAggregationTableNames(previewSql, [[tableName, { targetTableName }]]);
        const query = querySql && querySql[0];
        const data = query && await this.fetchQuery({
            continueWait: true,
            external,
            dataSource,
            query,
            requestId
        });
        return data || [];
    }
    async getPreAggregationQueueStates() {
        return this.preAggregations.getQueueState();
    }
}
exports.QueryOrchestrator = QueryOrchestrator;
//# sourceMappingURL=QueryOrchestrator.js.map