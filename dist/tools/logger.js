"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_ = require("logger");
logger_.disableStdout();
const console_ = Object.assign({}, console);
const log = (...args) => {
    console_.log(...args);
    return logger_.log(...args);
};
Object.assign(console, (() => {
    const logProxy = (target) => (...args) => log(...[`[console.${target}]`, ...args]);
    return {
        "log": logProxy("log"),
        "warn": logProxy("warn")
    };
})());
process.on("warning", error => log("[process.emitWarning]", error));
exports.logger = Object.assign(Object.assign({}, logger_), { log, "debugFactory": logger_.debugFactory.bind(logger_, undefined, undefined, log) });
