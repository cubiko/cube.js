import { QueryCache } from './QueryCache';
import { PreAggregations } from './PreAggregations';
import { RedisPool, RedisPoolOptions } from './RedisPool';
import { DriverFactory, DriverFactoryByDataSource } from './DriverFactory';
export declare type CacheAndQueryDriverType = 'redis' | 'memory';
export interface QueryOrchestratorOptions {
    externalDriverFactory?: DriverFactory;
    cacheAndQueueDriver?: CacheAndQueryDriverType;
    redisPoolOptions?: RedisPoolOptions;
    queryCacheOptions?: any;
    preAggregationsOptions?: any;
    rollupOnlyMode?: boolean;
    continueWaitTimeout?: number;
    skipExternalCacheAndQueue?: boolean;
}
export declare class QueryOrchestrator {
    protected readonly redisPrefix: string;
    protected readonly driverFactory: DriverFactoryByDataSource;
    protected readonly logger: any;
    protected readonly queryCache: QueryCache;
    protected readonly preAggregations: PreAggregations;
    protected readonly redisPool: RedisPool | undefined;
    protected readonly rollupOnlyMode: boolean;
    constructor(redisPrefix: string, driverFactory: DriverFactoryByDataSource, logger: any, options?: QueryOrchestratorOptions);
    fetchQuery(queryBody: any): Promise<any>;
    loadRefreshKeys(query: any): Promise<any[]>;
    queryStage(queryBody: any): Promise<{
        stage: string;
        timeElapsed: number;
    } | {
        stage: string;
        timeElapsed?: undefined;
    }>;
    resultFromCacheIfExists(queryBody: any): Promise<{
        data: any;
        lastRefreshTime: Date;
    }>;
    testConnections(): Promise<void>;
    cleanup(): Promise<void>;
    getPreAggregationVersionEntries(preAggregations: {
        preAggregation: any;
        partitions: any[];
    }[], preAggregationsSchema: string, requestId: string): Promise<any[]>;
    getPreAggregationPreview(requestId: any, preAggregation: any, versionEntry: any): Promise<any>;
    getPreAggregationQueueStates(): Promise<any[]>;
}
//# sourceMappingURL=QueryOrchestrator.d.ts.map