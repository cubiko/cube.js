"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelCombinator = void 0;
function cancelCombinator(fn) {
    const cancelFnArray = [];
    const saveCancelFn = promise => {
        if (promise.cancel) {
            cancelFnArray.push(promise.cancel);
        }
        return promise;
    };
    const promise = fn(saveCancelFn);
    promise.cancel = () => Promise.all(cancelFnArray.map(cancel => cancel()));
    return promise;
}
exports.cancelCombinator = cancelCombinator;
//# sourceMappingURL=utils.js.map