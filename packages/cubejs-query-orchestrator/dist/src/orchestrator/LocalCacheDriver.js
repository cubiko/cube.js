"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalCacheDriver = void 0;
const shared_1 = require("@cubejs-backend/shared");
const store = {};
class LocalCacheDriver {
    constructor() {
        this.withLock = (key, cb, expiration = 60, freeAfter = true) => shared_1.createCancelablePromise(async (tkn) => {
            if (key in this.store) {
                if (this.store[key].exp < new Date().getTime()) {
                    delete this.store[key];
                }
                return false;
            }
            try {
                this.store[key] = {
                    value: Math.random(),
                    exp: new Date().getTime() + expiration * 1000
                };
                await tkn.with(cb());
                return true;
            }
            finally {
                if (freeAfter) {
                    delete this.store[key];
                }
            }
        });
        this.store = store;
    }
    async get(key) {
        if (this.store[key] && this.store[key].exp < new Date().getTime()) {
            delete this.store[key];
        }
        return this.store[key] && this.store[key].value;
    }
    async set(key, value, expiration) {
        this.store[key] = {
            value,
            exp: new Date().getTime() + expiration * 1000
        };
    }
    async remove(key) {
        delete this.store[key];
    }
    async keysStartingWith(prefix) {
        return Object.keys(this.store)
            .filter(k => k.indexOf(prefix) === 0 && this.store[k].exp > new Date().getTime());
    }
    async cleanup() {
        // Nothing to do
    }
    async testConnection() {
        // Nothing to do
    }
}
exports.LocalCacheDriver = LocalCacheDriver;
//# sourceMappingURL=LocalCacheDriver.js.map