"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const scriptLib = require("scripting-tools");
function fetch() {
    return __awaiter(this, void 0, void 0, function* () {
        const { rates: changeRates } = JSON.parse(yield scriptLib.web_get("http://data.fixer.io/api/latest?access_key=857917c8f382f3febee2a4d377966bc0&base=EUR"));
        for (const currencyUpperCase in changeRates) {
            const rate = changeRates[currencyUpperCase];
            delete changeRates[currencyUpperCase];
            changeRates[currencyUpperCase.toLowerCase()] = rate;
        }
        return changeRates;
    });
}
exports.fetch = fetch;
