
process.once("unhandledRejection", error => { throw error; });

import * as emailSender from "../lib/emailSender";
import { generateSim, genUniq, genIp } from "./dbSemasim";
import * as feTypes from "../frontend/types";
import { testing as ttTesting } from "transfer-tools";
import { geoiplookup } from "../tools/geoiplookup";
import * as crypto from "crypto";

(async () => {

    const simOwnerEmail= "alice-foobar@gmail.com";
    const targetUserEmail= "joseph.garrone.gj@gmail.com";

    const userSim = await (async () => {

        const sim= generateSim(0, "NO SPECIAL CHAR");

        const out: feTypes.UserSim.Owned = {
            sim,
            "friendlyName": " chinese: 漢字汉字 😅😅",
            "password": ttTesting.genHexStr(32),
            "towardSimEncryptKeyStr": crypto.randomBytes(150).toString("base64"),
            "dongle": {
                "imei": genUniq.imsi(),
                "isVoiceEnabled": (Date.now() % 2 === 0) ? true : undefined,
                "manufacturer": ttTesting.genHexStr(7),
                "model": ttTesting.genHexStr(7),
                "firmwareVersion": `1.${ttTesting.genDigits(3)}.${ttTesting.genDigits(3)}`
            },
            "gatewayLocation": await (async () => {

                const ip = genIp();

                try {

                    const { countryIso, subdivisions, city } = await geoiplookup(ip);

                    return { ip, countryIso, subdivisions, city };

                } catch{

                    return {
                        ip,
                        "countryIso": undefined,
                        "subdivisions": undefined,
                        "city": undefined
                    };

                }

            })(),
            "ownership": {
                "status": "OWNED",
                "sharedWith": {
                    "confirmed": [],
                    "notConfirmed": [ targetUserEmail ]
                }
            },
            "phonebook": sim.storage.contacts.map(c => ({
                "mem_index": c.index,
                "name": c.name,
                "number_raw": c.number
            })),
            "reachableSimState": {
                "isGsmConnectivityOk": true,
                "cellSignalStrength": "GOOD",
                "ongoingCall": undefined
            }
        };

        return out;

    })();

    await emailSender.sharingRequest(
        simOwnerEmail,
        userSim,
        "I will be busy this week end, could you handle customer request for me ?",
        [ { "email": targetUserEmail, "isRegistered": false } ]
    );

    await emailSender.passwordRenewalRequest("joseph.garrone.gj@gmail.com", "123123123123131323");

    await emailSender.emailValidation("joseph.garrone.gj@gmail.com", "1234");

    console.log("DONE !");

})();
