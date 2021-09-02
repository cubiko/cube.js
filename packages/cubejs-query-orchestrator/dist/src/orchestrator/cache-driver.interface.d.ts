import { CancelablePromise, MaybeCancelablePromise } from '@cubejs-backend/shared';
export interface CacheDriverInterface {
    get(key: string): Promise<any>;
    set(key: string, value: any, expiration: any): Promise<void>;
    remove(key: string): Promise<void>;
    keysStartingWith(prefix: string): Promise<any[]>;
    cleanup(): Promise<void>;
    testConnection(): Promise<void>;
    withLock(key: string, cb: () => MaybeCancelablePromise<any>, expiration: number, freeAfter: boolean): CancelablePromise<boolean>;
}
//# sourceMappingURL=cache-driver.interface.d.ts.map