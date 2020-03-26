
import { logger } from "../tools/logger";

const debug = logger.debugFactory();

export function buildNoThrowProxyFunction<T extends (...args) => Promise<any>>(anAsyncFunctionThatMayThrow: T, context: any = null): T {

    return (async function anAsyncFunctionThatNeverThrow(...args) {

        try {

            return await anAsyncFunctionThatMayThrow.apply(context, args);

        } catch (error) {

            debug(error instanceof Error ? error.stack : error);

            await new Promise(() => { });

        }


    }) as T;

}