import { Pool } from 'generic-pool';
import AsyncRedisClient from './AsyncRedisClient';
export declare type CreateRedisClientFn = () => Promise<AsyncRedisClient>;
export interface RedisPoolOptions {
    poolMin?: number;
    poolMax?: number;
    idleTimeoutSeconds?: number;
    softIdleTimeoutSeconds?: number;
    createClient?: CreateRedisClientFn;
    destroyClient?: (client: AsyncRedisClient) => Promise<void>;
}
export declare class RedisPool {
    protected readonly pool: Pool<AsyncRedisClient> | null;
    protected readonly create: CreateRedisClientFn | null;
    protected poolErrors: number;
    constructor(options?: RedisPoolOptions);
    getClient(): Promise<AsyncRedisClient>;
    release(client: any): void;
    testConnection(): Promise<void>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=RedisPool.d.ts.map