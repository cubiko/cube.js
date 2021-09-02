import { MaybeCancelablePromise } from '@cubejs-backend/shared';
import { RedisPool } from './RedisPool';
import { CacheDriverInterface } from './cache-driver.interface';
interface RedisCacheDriverOptions {
    pool: RedisPool;
}
export declare class RedisCacheDriver implements CacheDriverInterface {
    protected readonly redisPool: RedisPool;
    constructor({ pool }: RedisCacheDriverOptions);
    protected getClient(): Promise<import("./AsyncRedisClient").default>;
    get(key: string): Promise<any>;
    withLock: (key: string, cb: () => MaybeCancelablePromise<any>, expiration?: number, freeAfter?: boolean) => import("@cubejs-backend/shared").CancelablePromise<boolean>;
    set(key: string, value: any, expiration: any): Promise<any>;
    remove(key: string): Promise<any>;
    keysStartingWith(prefix: string): Promise<any>;
    cleanup(): Promise<void>;
    testConnection(): Promise<void>;
}
export {};
//# sourceMappingURL=RedisCacheDriver.d.ts.map