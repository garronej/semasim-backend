
import * as logger from "logger";

const debug = logger.debugFactory();

export function buildNoThrowProxyFunction<T extends (...args) => Promise<any>>(anAsyncFunctionThatMayThrow: T, context: any = null): T {

    return (function anAsyncFunctionThatNeverThrow(...args) {

        return anAsyncFunctionThatMayThrow.apply(context, args)
            .catch(error => {

                debug(error instanceof Error ? error.stack : error);

                return new Promise(() => { });

            })
            ;

    }) as T;

}