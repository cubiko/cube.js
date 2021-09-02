"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@cubejs-backend/shared");
const QueryCache_abstract_1 = require("../unit/QueryCache.abstract");
const RedisPool_1 = require("../../src/orchestrator/RedisPool");
function doRedisTest(useIORedis) {
    process.env.CUBEJS_REDIS_USE_IOREDIS = useIORedis;
    const title = `RedisPool, Driver: ${useIORedis ? 'plain redis' : 'ioredis'}`;
    QueryCache_abstract_1.QueryCacheTest(title, {
        cacheAndQueueDriver: 'redis',
        redisPool: new RedisPool_1.RedisPool()
    });
    QueryCache_abstract_1.QueryCacheTest(`${title} without pool`, {
        cacheAndQueueDriver: 'redis',
        redisPool: new RedisPool_1.RedisPool({ poolMin: 0, poolMax: 0 })
    });
}
if (process.env.CUBEJS_REDIS_USE_IOREDIS !== undefined) {
    doRedisTest(shared_1.getEnv('redisUseIORedis'));
}
else {
    doRedisTest(true);
    doRedisTest(false);
}
//# sourceMappingURL=QueryCacheRedis.test.js.map