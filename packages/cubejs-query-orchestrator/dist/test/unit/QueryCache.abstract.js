"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryCacheTest = void 0;
const crypto_1 = __importDefault(require("crypto"));
const shared_1 = require("@cubejs-backend/shared");
const src_1 = require("../../src");
const QueryCacheTest = (name, options) => {
    describe(`QueryQueue${name}`, () => {
        const cache = new src_1.QueryCache(crypto_1.default.randomBytes(16).toString('hex'), jest.fn(() => {
            throw new Error('It`s not implemented mock...');
        }), jest.fn(), options);
        afterAll(async () => {
            await cache.cleanup();
        });
        it('withLock', async () => {
            const RANDOM_KEY_CACHE = crypto_1.default.randomBytes(16).toString('hex');
            const testLock = async () => {
                let started = 0;
                let finished = 0;
                const doLock = (sleep) => cache.withLock(RANDOM_KEY_CACHE, 60 * 10, async () => {
                    started++;
                    await shared_1.pausePromise(sleep);
                    finished++;
                });
                const locks = [
                    doLock(1000)
                ];
                await shared_1.pausePromise(25);
                locks.push(doLock(1000));
                locks.push(doLock(1000));
                const results = await Promise.all(locks);
                expect(results[0]).toEqual(true);
                expect(results[1]).toEqual(false);
                expect(results[2]).toEqual(false);
                expect(started).toEqual(1);
                expect(finished).toEqual(1);
            };
            await testLock();
            await shared_1.pausePromise(500);
            await testLock();
        });
        it('withLock + cancel (test free of lock + cancel inheritance)', async () => {
            const RANDOM_KEY_CACHE = crypto_1.default.randomBytes(16).toString('hex');
            const lockPromise = cache.withLock(RANDOM_KEY_CACHE, 60 * 10, () => shared_1.createCancelablePromise(async (tkn) => {
                await tkn.with(
                // This timeout is useful to test that withLock.cancel use callback as tkn.with
                // If doesn't use it, test will fail with timeout
                shared_1.pausePromise(60 * 60 * 1000));
            }));
            await lockPromise.cancel(true);
            await lockPromise;
            let callbackWasExecuted = false;
            // withLock return boolean, where true success execution & lock
            const statusOfResolve = await cache.withLock(RANDOM_KEY_CACHE, 60 * 10, async () => {
                callbackWasExecuted = true;
            });
            expect(statusOfResolve).toEqual(true);
            expect(callbackWasExecuted).toEqual(true);
        });
    });
};
exports.QueryCacheTest = QueryCacheTest;
//# sourceMappingURL=QueryCache.abstract.js.map