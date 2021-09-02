"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisPool = void 0;
/* eslint-disable global-require */
const generic_pool_1 = __importDefault(require("generic-pool"));
const shared_1 = require("@cubejs-backend/shared");
const RedisFactory_1 = require("./RedisFactory");
const IORedisFactory_1 = require("./IORedisFactory");
function createRedisClient(url, opts = {}) {
    if (shared_1.getEnv('redisUseIORedis')) {
        return IORedisFactory_1.createIORedisClient(url, opts);
    }
    return RedisFactory_1.createRedisClient(url, opts);
}
const MAX_ALLOWED_POOL_ERRORS = 100;
class RedisPool {
    constructor(options = {}) {
        this.pool = null;
        this.create = null;
        this.poolErrors = 0;
        const min = (typeof options.poolMin !== 'undefined') ? options.poolMin : shared_1.getEnv('redisPoolMin');
        const max = (typeof options.poolMax !== 'undefined') ? options.poolMax : shared_1.getEnv('redisPoolMax');
        const opts = {
            min,
            max,
            acquireTimeoutMillis: 5000,
            evictionRunIntervalMillis: 1500,
            numTestsPerEvictionRun: 20,
            softIdleTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
        };
        const create = options.createClient || (async () => createRedisClient(shared_1.getEnv('redisUrl')));
        if (max > 0) {
            const destroy = options.destroyClient || (async (client) => client.end(true));
            this.pool = generic_pool_1.default.createPool({ create, destroy }, opts);
            this.pool.on('factoryCreateError', (error) => {
                this.poolErrors++;
                // prevent the infinite loop when pool creation fails too many times
                if (this.poolErrors > MAX_ALLOWED_POOL_ERRORS) {
                    // @ts-ignore
                    // eslint-disable-next-line
                    this.pool._waitingClientsQueue.dequeue().reject(error);
                }
            });
        }
        else {
            // fallback to un-pooled behavior if pool max is 0
            this.create = create;
        }
    }
    async getClient() {
        if (this.pool) {
            return this.pool.acquire();
        }
        else {
            return this.create();
        }
    }
    release(client) {
        if (this.pool) {
            this.pool.release(client);
        }
        else if (client) {
            client.quit();
        }
    }
    async testConnection() {
        const client = await this.getClient();
        try {
            await client.ping();
        }
        finally {
            this.release(client);
        }
    }
    async cleanup() {
        if (this.pool) {
            await this.pool.drain();
            this.pool.clear();
        }
    }
}
exports.RedisPool = RedisPool;
//# sourceMappingURL=RedisPool.js.map