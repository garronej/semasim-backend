
import * as logger_ from "logger";

logger_.disableStdout();

const console_ = { ...console };

const log: typeof logger_.log = (...args) => {

    console_.log(...args);

    return logger_.log(...args);

}


Object.assign(
    console,
    (() => {

        const logProxy = (target: "log" | "warn") =>
            (...args: Parameters<typeof log>) =>
                log(...[`[console.${target}]`, ...args] as const)
            ;

        return {
            "log": logProxy("log"),
            "warn": logProxy("warn")
        }

    })()


);

process.on("warning", error => log("[process.emitWarning]", error));

export const logger = {
    ...logger_,
    log,
    "debugFactory": logger_.debugFactory.bind(
        logger_,
        undefined,
        undefined,
        log
    )
};




