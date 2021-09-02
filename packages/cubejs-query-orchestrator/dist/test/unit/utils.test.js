"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../src/orchestrator/utils");
describe('parseRedisUrl', () => {
    test('parse', async () => {
        expect(utils_1.parseRedisUrl('localhost')).toEqual({
            username: undefined,
            password: undefined,
            host: 'localhost',
            port: 6379,
            sentinels: undefined,
            ssl: false,
            db: undefined,
            name: undefined,
        });
        expect(utils_1.parseRedisUrl('localhost:6666')).toEqual({
            username: undefined,
            password: undefined,
            host: 'localhost',
            port: 6666,
            sentinels: undefined,
            ssl: false,
            db: undefined,
            name: undefined,
        });
        expect(utils_1.parseRedisUrl('redis://localhost/0')).toEqual({
            username: undefined,
            password: undefined,
            host: 'localhost',
            port: 6379,
            sentinels: undefined,
            ssl: false,
            db: 0,
            name: undefined,
        });
        expect(utils_1.parseRedisUrl('rediss://localhost/0')).toEqual({
            username: undefined,
            password: undefined,
            host: 'localhost',
            port: 6379,
            sentinels: undefined,
            ssl: true,
            db: 0,
            name: undefined,
        });
        expect(utils_1.parseRedisUrl('rediss://user:password@localhost/0')).toEqual({
            username: 'user',
            password: 'password',
            host: 'localhost',
            port: 6379,
            sentinels: undefined,
            ssl: true,
            db: 0,
            name: undefined,
        });
        expect(utils_1.parseRedisUrl('rediss://user:password@localhost:6666/6')).toEqual({
            username: 'user',
            password: 'password',
            host: 'localhost',
            port: 6666,
            sentinels: undefined,
            ssl: true,
            db: 6,
            name: undefined,
        });
        expect(utils_1.parseRedisUrl('unix:///path/to/socket.sock?db=6')).toEqual({
            username: undefined,
            password: undefined,
            host: undefined,
            port: undefined,
            path: '/path/to/socket.sock',
            sentinels: undefined,
            ssl: false,
            db: 6,
            name: undefined,
        });
        expect(utils_1.parseRedisUrl('redis+sentinel://localhost:26379,otherhost:26479/mymaster/5')).toEqual({
            username: undefined,
            password: undefined,
            host: undefined,
            port: undefined,
            sentinels: [
                {
                    host: 'localhost',
                    port: 26379,
                },
                {
                    host: 'otherhost',
                    port: 26479,
                }
            ],
            ssl: false,
            db: 5,
            name: 'mymaster',
        });
    });
});
//# sourceMappingURL=utils.test.js.map