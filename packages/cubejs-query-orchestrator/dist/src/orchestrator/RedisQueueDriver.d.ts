export class RedisQueueDriverConnection {
    constructor(driver: any, options: any);
    driver: any;
    redisClient: any;
    redisQueuePrefix: any;
    continueWaitTimeout: any;
    heartBeatTimeout: any;
    concurrency: any;
    getResultBlocking(queryKey: any): Promise<any>;
    getResult(queryKey: any): Promise<any>;
    addToQueue(keyScore: any, queryKey: any, orphanedTime: any, queryHandler: any, query: any, priority: any, options: any): any;
    getToProcessQueries(): any;
    getActiveQueries(): any;
    getQueryAndRemove(queryKey: any): Promise<any[]>;
    setResultAndRemoveQuery(queryKey: any, executionResult: any, processingId: any): Promise<any>;
    getOrphanedQueries(): any;
    getStalledQueries(): any;
    getQueryStageState(onlyKeys: any): Promise<any[]>;
    getQueryDef(queryKey: any): Promise<any>;
    updateHeartBeat(queryKey: any): any;
    getNextProcessingId(): Promise<any>;
    retrieveForProcessing(queryKey: any, processingId: any): Promise<any>;
    freeProcessingLock(queryKey: any, processingId: any, activated: any): Promise<any>;
    optimisticQueryUpdate(queryKey: any, toUpdate: any, processingId: any): Promise<boolean>;
    release(): any;
    toProcessRedisKey(): string;
    recentRedisKey(): string;
    activeRedisKey(): string;
    heartBeatRedisKey(): string;
    queryRedisKey(queryKey: any, suffix: any): string;
    queueRedisKey(suffix: any): string;
    queriesDefKey(): string;
    processingIdKey(): string;
    resultListKey(queryKey: any): string;
    queryProcessingLockKey(queryKey: any): string;
    redisHash(queryKey: any): any;
}
export class RedisQueueDriver extends BaseQueueDriver {
    constructor(options: any);
    redisPool: any;
    options: any;
    createConnection(): Promise<RedisQueueDriverConnection>;
    release(connection: any): void;
}
import { BaseQueueDriver } from "./BaseQueueDriver";
//# sourceMappingURL=RedisQueueDriver.d.ts.map