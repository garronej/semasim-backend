"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../tools/logger");
const debug = logger_1.logger.debugFactory();
function buildNoThrowProxyFunction(anAsyncFunctionThatMayThrow, context = null) {
    return (async function anAsyncFunctionThatNeverThrow(...args) {
        try {
            return await anAsyncFunctionThatMayThrow.apply(context, args);
        }
        catch (error) {
            debug(error instanceof Error ? error.stack : error);
            await new Promise(() => { });
        }
    });
}
exports.buildNoThrowProxyFunction = buildNoThrowProxyFunction;
