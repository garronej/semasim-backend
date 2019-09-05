export declare function buildNoThrowProxyFunction<T extends (...args: any[]) => Promise<any>>(anAsyncFunctionThatMayThrow: T, context?: any): T;
