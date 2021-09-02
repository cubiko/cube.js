export class LocalQueueDriverConnection {
    constructor(driver: any, options: any);
    redisQueuePrefix: any;
    continueWaitTimeout: any;
    heartBeatTimeout: any;
    concurrency: any;
    driver: any;
    results: any;
    resultPromises: any;
    queryDef: any;
    toProcess: any;
    recent: any;
    active: any;
    heartBeat: any;
    processingCounter: any;
    processingLocks: any;
    getResultPromise(resultListKey: any): any;
    getResultBlocking(queryKey: any): Promise<any>;
    getResult(queryKey: any): Promise<any>;
    queueArray(queueObj: any, orderFilterLessThan: any): any[];
    addToQueue(keyScore: any, queryKey: any, orphanedTime: any, queryHandler: any, query: any, priority: any, options: any): number[];
    getToProcessQueries(): any[];
    getActiveQueries(): any[];
    getQueryAndRemove(queryKey: any): Promise<any[]>;
    setResultAndRemoveQuery(queryKey: any, executionResult: any, processingId: any): Promise<boolean>;
    getNextProcessingId(): any;
    getOrphanedQueries(): any[];
    getStalledQueries(): any[];
    getQueryStageState(onlyKeys: any): Promise<any[]>;
    getQueryDef(queryKey: any): Promise<any>;
    updateHeartBeat(queryKey: any): void;
    retrieveForProcessing(queryKey: any, processingId: any): any[];
    freeProcessingLock(queryKey: any, processingId: any, activated: any): void;
    optimisticQueryUpdate(queryKey: any, toUpdate: any, processingId: any): Promise<boolean>;
    release(): void;
    queryRedisKey(queryKey: any, suffix: any): string;
    resultListKey(queryKey: any): string;
    redisHash(queryKey: any): any;
}
export class LocalQueueDriver extends BaseQueueDriver {
    constructor(options: any);
    options: any;
    results: any;
    resultPromises: any;
    queryDef: any;
    toProcess: any;
    recent: any;
    active: any;
    heartBeat: any;
    processingCounter: any;
    processingLocks: any;
    createConnection(): LocalQueueDriverConnection;
    release(client: any): void;
}
import { BaseQueueDriver } from "./BaseQueueDriver";
//# sourceMappingURL=LocalQueueDriver.d.ts.map