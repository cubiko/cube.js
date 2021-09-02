import LRUCache from 'lru-cache';
import { MaybeCancelablePromise } from '@cubejs-backend/shared';
import { QueryQueue } from './QueryQueue';
import { CacheDriverInterface } from './cache-driver.interface';
import { DriverFactory, DriverFactoryByDataSource } from './DriverFactory';
import { BaseDriver } from '../driver';
declare type QueryOptions = {
    external?: boolean;
    renewalThreshold?: number;
};
export declare type QueryTuple = [sql: string, params: unknown[], options?: QueryOptions];
export declare type QueryWithParams = QueryTuple | string;
declare type Query = {
    requestId?: string;
    dataSource: string;
};
declare type CacheEntry = {
    time: number;
    result: any;
    renewalKey: string;
};
export declare class QueryCache {
    protected readonly redisPrefix: string;
    protected readonly driverFactory: DriverFactoryByDataSource;
    protected readonly logger: any;
    protected readonly options: {
        refreshKeyRenewalThreshold?: number;
        externalQueueOptions?: any;
        externalDriverFactory?: DriverFactory;
        backgroundRenew?: Boolean;
        queueOptions?: object | ((dataSource: String) => object);
        redisPool?: any;
        continueWaitTimeout?: number;
        cacheAndQueueDriver?: 'redis' | 'memory';
        maxInMemoryCacheEntries?: number;
        skipExternalCacheAndQueue?: boolean;
    };
    protected readonly cacheDriver: CacheDriverInterface;
    protected queue: {
        [dataSource: string]: QueryQueue;
    };
    protected externalQueue: QueryQueue | null;
    protected memoryCache: LRUCache<string, CacheEntry>;
    constructor(redisPrefix: string, driverFactory: DriverFactoryByDataSource, logger: any, options?: {
        refreshKeyRenewalThreshold?: number;
        externalQueueOptions?: any;
        externalDriverFactory?: DriverFactory;
        backgroundRenew?: Boolean;
        queueOptions?: object | ((dataSource: String) => object);
        redisPool?: any;
        continueWaitTimeout?: number;
        cacheAndQueueDriver?: 'redis' | 'memory';
        maxInMemoryCacheEntries?: number;
        skipExternalCacheAndQueue?: boolean;
    });
    cachedQueryResult(queryBody: any, preAggregationsTablesToTempTables: any): Promise<{
        data: any;
        refreshKeyValues: any[];
        lastRefreshTime: Date;
    } | {
        data: any;
        lastRefreshTime?: undefined;
    } | {
        data: any;
        lastRefreshTime: Date;
    }>;
    private getExpireSecs;
    private cacheKeyQueriesFrom;
    static queryCacheKey(queryBody: any): any[];
    protected static replaceAll(replaceThis: any, withThis: any, inThis: any): any;
    static replacePreAggregationTableNames(queryAndParams: QueryWithParams, preAggregationsTablesToTempTables: any): any;
    queryWithRetryAndRelease(query: any, values: any, { priority, cacheKey, external, requestId, dataSource }: {
        priority?: number;
        cacheKey: object;
        external: boolean;
        requestId?: string;
        dataSource: string;
    }): Promise<any>;
    getQueue(dataSource?: string): QueryQueue;
    getExternalQueue(): QueryQueue;
    static createQueue(redisPrefix: string, clientFactory: DriverFactory, executeFn: (client: BaseDriver, q: any) => any, options?: Record<string, any>): QueryQueue;
    startRenewCycle(query: any, values: any, cacheKeyQueries: any, expireSecs: any, cacheKey: any, renewalThreshold: any, options: {
        requestId?: string;
        skipRefreshKeyWaitForRenew?: boolean;
        external?: boolean;
        dataSource: string;
    }): void;
    renewQuery(query: any, values: any, cacheKeyQueries: any, expireSecs: any, cacheKey: any, renewalThreshold: any, options: {
        requestId?: string;
        skipRefreshKeyWaitForRenew?: boolean;
        external?: boolean;
        dataSource: string;
    }): Promise<{
        data: any;
        refreshKeyValues: any[];
        lastRefreshTime: Date;
    }>;
    loadRefreshKeysFromQuery(query: Query): Promise<any[]>;
    loadRefreshKeys(cacheKeyQueries: QueryWithParams[], expireSecs: number, options: {
        requestId?: string;
        skipRefreshKeyWaitForRenew?: boolean;
        dataSource: string;
    }): Promise<any>[];
    withLock: <T = any>(key: string, ttl: number, callback: () => import("@cubejs-backend/shared").Optional<import("@cubejs-backend/shared").CancelablePromise<T>, "cancel">) => import("@cubejs-backend/shared").CancelablePromise<boolean>;
    cacheQueryResult(query: any, values: any, cacheKey: any, expiration: any, options: {
        renewalThreshold?: number;
        renewalKey?: any;
        priority?: number;
        external?: boolean;
        requestId?: string;
        dataSource: string;
        waitForRenew?: boolean;
        forceNoCache?: boolean;
        useInMemory?: boolean;
    }): Promise<any>;
    protected lastRefreshTime(cacheKey: any): Promise<Date>;
    resultFromCacheIfExists(queryBody: any): Promise<{
        data: any;
        lastRefreshTime: Date;
    }>;
    queryRedisKey(cacheKey: any): string;
    cleanup(): Promise<void>;
    testConnection(): Promise<void>;
}
export {};
//# sourceMappingURL=QueryCache.d.ts.map