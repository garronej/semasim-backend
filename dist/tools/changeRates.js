"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetch = void 0;
const scriptLib = require("scripting-tools");
async function fetch() {
    const { rates: changeRates } = JSON.parse(await scriptLib.web_get("http://data.fixer.io/api/latest?access_key=857917c8f382f3febee2a4d377966bc0&base=EUR"));
    for (const currencyUpperCase in changeRates) {
        const rate = changeRates[currencyUpperCase];
        delete changeRates[currencyUpperCase];
        changeRates[currencyUpperCase.toLowerCase()] = rate;
    }
    return changeRates;
}
exports.fetch = fetch;
