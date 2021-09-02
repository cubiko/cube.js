"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LargeStreamWarning = void 0;
const stream_1 = __importDefault(require("stream"));
const shared_1 = require("@cubejs-backend/shared");
const THREASHOLD_LIMIT = 100000;
class LargeStreamWarning extends stream_1.default.Transform {
    constructor(preAggregationName) {
        let count = 0;
        super({
            objectMode: true,
            transform(row, encoding, callback) {
                count++;
                if (count === THREASHOLD_LIMIT) {
                    shared_1.displayCLIWarning(`The pre-aggregation "${preAggregationName}" has more then ${THREASHOLD_LIMIT} rows. Consider exporting this pre-aggregation.`);
                }
                this.push(row);
                callback();
            }
        });
    }
}
exports.LargeStreamWarning = LargeStreamWarning;
//# sourceMappingURL=StreamObjectsCounter.js.map