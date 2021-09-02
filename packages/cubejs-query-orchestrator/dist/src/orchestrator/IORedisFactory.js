"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIORedisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const shared_1 = require("@cubejs-backend/shared");
const utils_1 = require("./utils");
// @ts-ignore
ioredis_1.default.Pipeline.prototype.execAsync = function execAsync() {
    return this.exec()
        .then((array) => (array ? array.map((skipFirst) => skipFirst[1]) : array));
};
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
        client[`${k}Async`] = client[k];
    });
    client.end = () => client.disconnect();
    return client;
}
async function createIORedisClient(url, opts) {
    const options = {
        enableReadyCheck: true,
        lazyConnect: true
    };
    const parsedUrl = utils_1.parseRedisUrl(url);
    if (parsedUrl.sentinels) {
        options.sentinels = parsedUrl.sentinels;
        options.name = parsedUrl.name;
        options.db = parsedUrl.db;
        options.enableOfflineQueue = false;
    }
    else {
        options.username = parsedUrl.username;
        options.password = parsedUrl.password;
        options.host = parsedUrl.host;
        options.port = parsedUrl.port;
        options.path = parsedUrl.path;
        options.db = parsedUrl.db;
        if (parsedUrl.ssl) {
            options.tls = {};
        }
    }
    if (shared_1.getEnv('redisTls')) {
        options.tls = {};
    }
    const password = shared_1.getEnv('redisPassword');
    if (password) {
        options.password = password;
    }
    const client = new ioredis_1.default({
        ...options,
        ...opts,
    });
    await client.connect();
    return decorateRedisClient(client);
}
exports.createIORedisClient = createIORedisClient;
//# sourceMappingURL=IORedisFactory.js.map