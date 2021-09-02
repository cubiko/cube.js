import { RedisOptions } from 'ioredis';
import AsyncRedisClient from './AsyncRedisClient';
export declare type IORedisOptions = RedisOptions;
export declare function createIORedisClient(url: string, opts: RedisOptions): Promise<AsyncRedisClient>;
//# sourceMappingURL=IORedisFactory.d.ts.map