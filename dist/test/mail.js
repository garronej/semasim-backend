"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.once("unhandledRejection", error => { throw error; });
const emailSender = require("../lib/emailSender");
const db_1 = require("./db");
const transfer_tools_1 = require("transfer-tools");
const geoiplookup_1 = require("../tools/geoiplookup");
const crypto = require("crypto");
(async () => {
    const simOwnerEmail = "alice-foobar@gmail.com";
    const targetUserEmail = "joseph.garrone.gj@gmail.com";
    const userSim = await (async () => {
        const sim = db_1.generateSim(0, "NO SPECIAL CHAR");
        const out = {
            sim,
            "friendlyName": " chinese: 漢字汉字 😅😅",
            "password": transfer_tools_1.testing.genHexStr(32),
            "towardSimEncryptKeyStr": crypto.randomBytes(150).toString("base64"),
            "dongle": {
                "imei": db_1.genUniq.imsi(),
                "isVoiceEnabled": (Date.now() % 2 === 0) ? true : undefined,
                "manufacturer": transfer_tools_1.testing.genHexStr(7),
                "model": transfer_tools_1.testing.genHexStr(7),
                "firmwareVersion": `1.${transfer_tools_1.testing.genDigits(3)}.${transfer_tools_1.testing.genDigits(3)}`
            },
            "gatewayLocation": await (async () => {
                const ip = db_1.genIp();
                try {
                    const { countryIso, subdivisions, city } = await geoiplookup_1.geoiplookup(ip);
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
            })(),
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
            })),
            "isGsmConnectivityOk": true,
            "cellSignalStrength": "GOOD"
        };
        return out;
    })();
    await emailSender.sharingRequest(simOwnerEmail, userSim, "I will be busy this week end, could you handle customer request for me ?", [{ "email": targetUserEmail, "isRegistered": false }]);
    await emailSender.passwordRenewalRequest("joseph.garrone.gj@gmail.com", "123123123123131323");
    await emailSender.emailValidation("joseph.garrone.gj@gmail.com", "1234");
    console.log("DONE !");
})();
