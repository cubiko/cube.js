"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRedisUrl = void 0;
/* eslint-disable no-restricted-syntax */
const querystring = __importStar(require("querystring"));
function parseHostPort(addr) {
    if (addr.includes(':')) {
        const parts = addr.split(':');
        if (parts.length === 2) {
            return {
                host: parts[0],
                port: parseInt(parts[1], 10),
            };
        }
        throw new Error(`Unsupported host:port part inside REDIS_URL: ${addr}`);
    }
    return {
        host: addr,
        port: 6379,
    };
}
function parseAddrPart(addr) {
    if (addr.includes('@')) {
        const parts = addr.split('@');
        if (parts.length !== 2) {
            throw new Error(`Unsupported host part inside REDIS_URL: ${addr}`);
        }
        const credentials = parts[0].split(':');
        if (credentials.length !== 2) {
            throw new Error(`Unsupported credentials part inside REDIS_URL: ${addr}`);
        }
        return {
            username: credentials[0],
            password: credentials[1],
            ...parseHostPort(parts[1]),
        };
    }
    return parseHostPort(addr);
}
function parseHostPartBasic(addUrl, result) {
    const { host, port, password, username } = parseAddrPart(addUrl);
    result.password = password;
    result.username = username;
    result.host = host;
    result.port = port;
    return result;
}
function parseHostPartSentinel(addUrl, result) {
    const servers = addUrl.split(',');
    result.sentinels = servers.map((addr) => parseHostPort(addr));
    return result;
}
function parseUrl(url, result, parseAddPartFn) {
    if (url.includes('/')) {
        const parts = url.split('/');
        if (parts.length === 2) {
            result.db = parseInt(parts[1], 10);
        }
        else if (parts.length === 3) {
            result.name = parts[1];
            result.db = parseInt(parts[2], 10);
        }
        else {
            throw new Error(`Unsupported REDIS_URL: "${url}"`);
        }
        return parseAddPartFn(parts[0], result);
    }
    return parseAddPartFn(url, result);
}
function parseUnixUrl(url, result) {
    if (url.includes('?')) {
        const parts = url.split('?');
        if (parts.length === 2) {
            const query = querystring.parse(parts[1]);
            for (const key of Object.keys(query)) {
                switch (key.toLowerCase()) {
                    case 'db':
                        result.db = parseInt(query[key], 10);
                        break;
                    default:
                        break;
                }
            }
            return {
                ...result,
                path: parts[0],
            };
        }
        throw new Error(`Unsupported REDIS_URL: "${url}"`);
    }
    result.path = url;
    return result;
}
function parseRedisUrl(url) {
    const result = {
        username: undefined,
        password: undefined,
        host: undefined,
        port: undefined,
        ssl: false,
        sentinels: undefined,
        db: undefined,
        name: undefined,
    };
    if (!url) {
        return result;
    }
    if (url.startsWith('redis://')) {
        return parseUrl(url.substr('redis://'.length), result, parseHostPartBasic);
    }
    if (url.startsWith('rediss://')) {
        result.ssl = true;
        return parseUrl(url.substr('rediss://'.length), result, parseHostPartBasic);
    }
    if (url.startsWith('redis+sentinel://')) {
        return parseUrl(url.substr('redis+sentinel://'.length), result, parseHostPartSentinel);
    }
    if (url.startsWith('unix://')) {
        return parseUnixUrl(url.substr('unix://'.length), result);
    }
    return parseUrl(url, result, parseHostPartBasic);
}
exports.parseRedisUrl = parseRedisUrl;
//# sourceMappingURL=utils.js.map