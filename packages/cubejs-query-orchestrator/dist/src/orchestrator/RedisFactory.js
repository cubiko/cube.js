"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisClient = void 0;
const redis_1 = __importDefault(require("redis"));
const shared_1 = require("@cubejs-backend/shared");
const util_1 = require("util");
function decorateRedisClient(client) {
    [
        'brpop',
        'del',
        'get',
        'hget',
        'rpop',
        'set',
        'zadd',
        'zrange',
        'zrangebyscore',
        'keys',
        'watch',
        'unwatch',
        'incr',
        'decr',
        'lpush',
    ].forEach(k => {
        client[`${k}Async`] = util_1.promisify(client[k]);
    });
    return client;
}
redis_1.default.Multi.prototype.execAsync = function execAsync() {
    return new Promise((resolve, reject) => this.exec((err, res) => (err ? reject(err) : resolve(res))));
};
async function createRedisClient(url, opts = {}) {
    const options = {
        url,
    };
    if (shared_1.getEnv('redisTls')) {
        options.tls = {};
    }
    if (shared_1.getEnv('redisPassword')) {
        options.password = shared_1.getEnv('redisPassword');
    }
    return decorateRedisClient(redis_1.default.createClient({
        ...options,
        ...opts,
    }));
}
exports.createRedisClient = createRedisClient;
//# sourceMappingURL=RedisFactory.js.map