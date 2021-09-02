"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheDriver = void 0;
const shared_1 = require("@cubejs-backend/shared");
class RedisCacheDriver {
    constructor({ pool }) {
        this.withLock = (key, cb, expiration = 60, freeAfter = true) => shared_1.createCancelablePromise(async (tkn) => {
            const client = await this.getClient();
            try {
                if (tkn.isCanceled()) {
                    return false;
                }
                const response = await client.setAsync(key, '1', 
                // Only set the key if it does not already exist.
                'NX', 'EX', expiration);
                if (response === 'OK') {
                    try {
                        await tkn.with(cb());
                    }
                    finally {
                        if (freeAfter) {
                            await client.delAsync(key);
                        }
                    }
                    return true;
                }
                return false;
            }
            finally {
                this.redisPool.release(client);
            }
        });
        this.redisPool = pool;
    }
    async getClient() {
        return this.redisPool.getClient();
    }
    async get(key) {
        const client = await this.getClient();
        try {
            const res = await client.getAsync(key);
            return res && JSON.parse(res);
        }
        finally {
            this.redisPool.release(client);
        }
    }
    async set(key, value, expiration) {
        const client = await this.getClient();
        try {
            return await client.setAsync(key, JSON.stringify(value), 'EX', expiration);
        }
        finally {
            this.redisPool.release(client);
        }
    }
    async remove(key) {
        const client = await this.getClient();
        try {
            return await client.delAsync(key);
        }
        finally {
            this.redisPool.release(client);
        }
    }
    async keysStartingWith(prefix) {
        const client = await this.getClient();
        try {
            return await client.keysAsync(`${prefix}*`);
        }
        finally {
            this.redisPool.release(client);
        }
    }
    async cleanup() {
        return this.redisPool.cleanup();
    }
    async testConnection() {
        const client = await this.getClient();
        try {
            await client.ping();
        }
        finally {
            this.redisPool.release(client);
        }
    }
}
exports.RedisCacheDriver = RedisCacheDriver;
//# sourceMappingURL=RedisCacheDriver.js.map