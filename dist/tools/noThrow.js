"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger = require("logger");
const debug = logger.debugFactory();
function buildNoThrowProxyFunction(anAsyncFunctionThatMayThrow, context = null) {
    return (function anAsyncFunctionThatNeverThrow(...args) {
        return anAsyncFunctionThatMayThrow.apply(context, args)
            .catch(error => {
            debug(error instanceof Error ? error.stack : error);
            return new Promise(() => { });
        });
    });
}
exports.buildNoThrowProxyFunction = buildNoThrowProxyFunction;
