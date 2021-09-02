import { ClientOpts } from 'redis';
import AsyncRedisClient from './AsyncRedisClient';
export declare type RedisOptions = ClientOpts;
export declare function createRedisClient(url: string, opts?: ClientOpts): Promise<AsyncRedisClient>;
//# sourceMappingURL=RedisFactory.d.ts.map