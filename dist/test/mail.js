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
process.once("unhandledRejection", error => { throw error; });
const emailSender = require("../lib/emailSender");
const db_1 = require("./db");
const transfer_tools_1 = require("transfer-tools");
const geoiplookup_1 = require("../tools/geoiplookup");
(() => __awaiter(this, void 0, void 0, function* () {
    const simOwnerEmail = "alice-foobar@gmail.com";
    const targetUserEmail = "joseph.garrone.gj@gmail.com";
    const userSim = yield (() => __awaiter(this, void 0, void 0, function* () {
        const sim = db_1.generateSim(0, "NO SPECIAL CHAR");
        const out = {
            sim,
            "friendlyName": " ching chong: 漢字汉字 😅😅",
            "password": transfer_tools_1.testing.genHexStr(32),
            "dongle": {
                "imei": db_1.genUniq.imsi(),
                "isVoiceEnabled": (Date.now() % 2 === 0) ? true : undefined,
                "manufacturer": transfer_tools_1.testing.genHexStr(7),
                "model": transfer_tools_1.testing.genHexStr(7),
                "firmwareVersion": `1.${transfer_tools_1.testing.genDigits(3)}.${transfer_tools_1.testing.genDigits(3)}`
            },
            "gatewayLocation": yield (() => __awaiter(this, void 0, void 0, function* () {
                const ip = db_1.genIp();
                try {
                    const { countryIso, subdivisions, city } = yield geoiplookup_1.geoiplookup(ip);
                    return { ip, countryIso, subdivisions, city };
                }
                catch (_a) {
                    return {
                        ip,
                        "countryIso": undefined,
                        "subdivisions": undefined,
                        "city": undefined
                    };
                }
            }))(),
            "isOnline": true,
            "ownership": {
                "status": "OWNED",
                "sharedWith": {
                    "confirmed": [],
                    "notConfirmed": [targetUserEmail]
                }
            },
            "phonebook": sim.storage.contacts.map(c => ({
                "mem_index": c.index,
                "name": c.name,
                "number_raw": c.number
            }))
        };
        return out;
    }))();
    yield emailSender.sharingRequest({ "email": simOwnerEmail, "user": NaN }, userSim, "I will be busy this week end, could you handle customer request for me ?", [{ "email": targetUserEmail, "isRegistered": false }]);
    yield emailSender.passwordRenewalRequest("joseph.garrone.gj@gmail.com", "123123123123131323");
    yield emailSender.emailValidation("joseph.garrone.gj@gmail.com", "1234");
    console.log("DONE !");
}))();
