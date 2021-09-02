import { MaybeCancelablePromise } from '@cubejs-backend/shared';
import { CacheDriverInterface } from './cache-driver.interface';
export declare class LocalCacheDriver implements CacheDriverInterface {
    protected readonly store: Record<string, any>;
    constructor();
    get(key: string): Promise<any>;
    set(key: string, value: any, expiration: any): Promise<void>;
    remove(key: string): Promise<void>;
    keysStartingWith(prefix: string): Promise<string[]>;
    cleanup(): Promise<void>;
    testConnection(): Promise<void>;
    withLock: (key: string, cb: () => MaybeCancelablePromise<any>, expiration?: number, freeAfter?: boolean) => import("@cubejs-backend/shared").CancelablePromise<boolean>;
}
//# sourceMappingURL=LocalCacheDriver.d.ts.map