import { MaybeCancelablePromise } from '@cubejs-backend/shared';
export declare type SaveCancelFn = <T>(promise: MaybeCancelablePromise<T>) => Promise<T>;
export declare function cancelCombinator(fn: any): any;
//# sourceMappingURL=utils.d.ts.map