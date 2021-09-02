import { QueryCache } from './QueryCache';
import { DriverFactoryByDataSource } from './DriverFactory';
import { QueryQueue } from './QueryQueue';
declare type VersionEntry = {
    table_name: string;
    content_version: string;
    structure_version: string;
    last_updated_at: number;
    naming_version?: number;
};
declare type PreAggregationsOptions = {
    preAggregationsSchemaCacheExpire?: number;
    loadCacheQueueOptions?: any;
    queueOptions?: object | ((dataSource: String) => object);
    redisPool?: any;
    continueWaitTimeout?: number;
    cacheAndQueueDriver?: 'redis' | 'memory';
    skipExternalCacheAndQueue?: boolean;
};
export declare class PreAggregations {
    private readonly redisPrefix;
    private readonly driverFactory;
    private readonly logger;
    private readonly queryCache;
    options: PreAggregationsOptions;
    private cacheDriver;
    externalDriverFactory: any;
    structureVersionPersistTime: any;
    private readonly usedTablePersistTime;
    private readonly externalRefresh;
    private readonly loadCacheQueue;
    private readonly queue;
    constructor(redisPrefix: string, driverFactory: DriverFactoryByDataSource, logger: any, queryCache: QueryCache, options: any);
    protected tablesUsedRedisKey(tableName: any): string;
    addTableUsed(tableName: any): Promise<void>;
    tablesUsed(): Promise<any[]>;
    loadAllPreAggregationsIfNeeded(queryBody: any): any;
    getQueue(dataSource?: string): QueryQueue;
    getLoadCacheQueue(dataSource?: string): QueryQueue;
    static preAggregationQueryCacheKey(preAggregation: any): any;
    static targetTableName(versionEntry: any): string;
    static structureVersion(preAggregation: any): string;
    getVersionEntries(preAggregations: any, requestId: any): Promise<VersionEntry[][]>;
    getQueueState(dataSource?: any): Promise<any[]>;
}
export {};
//# sourceMappingURL=PreAggregations.d.ts.map