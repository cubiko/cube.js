"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseQueueDriver = void 0;
const crypto_1 = __importDefault(require("crypto"));
class BaseQueueDriver {
    redisHash(queryKey) {
        return typeof queryKey === 'string' && queryKey.length < 256 ?
            queryKey :
            crypto_1.default.createHash('md5').update(JSON.stringify(queryKey)).digest('hex');
    }
}
exports.BaseQueueDriver = BaseQueueDriver;
//# sourceMappingURL=BaseQueueDriver.js.map