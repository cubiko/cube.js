export class QueryQueue {
    constructor(redisQueuePrefix: any, options: any);
    redisQueuePrefix: any;
    concurrency: any;
    continueWaitTimeout: any;
    executionTimeout: any;
    orphanedTimeout: any;
    heartBeatInterval: any;
    sendProcessMessageFn: any;
    sendCancelMessageFn: any;
    queryHandlers: any;
    cancelHandlers: any;
    logger: any;
    queueDriver: RedisQueueDriver | LocalQueueDriver;
    skipQueue: any;
    executeInQueue(queryHandler: any, queryKey: any, query: any, priority: any, options: any): Promise<any>;
    parseResult(result: any): any;
    reconcileQueue(): Promise<any>;
    reconcileAgain: boolean;
    reconcilePromise: any;
    getQueries(): Promise<any[]>;
    reconcileQueueImpl(): Promise<void>;
    queryTimeout(promise: any): Promise<any>;
    fetchQueryStageState(): Promise<any[]>;
    getQueryStage(stageQueryKey: any, priorityFilter: any, queryStageState: any): Promise<{
        stage: string;
        timeElapsed: number;
    } | {
        stage: string;
        timeElapsed?: undefined;
    }>;
    processQuerySkipQueue(query: any): Promise<{
        result: any;
        error?: undefined;
    } | {
        error: any;
        result?: undefined;
    }>;
    processQuery(queryKey: any): Promise<void>;
    processCancel(query: any): Promise<void>;
    redisHash(queryKey: any): string;
}
import { RedisQueueDriver } from "./RedisQueueDriver";
import { LocalQueueDriver } from "./LocalQueueDriver";
//# sourceMappingURL=QueryQueue.d.ts.map