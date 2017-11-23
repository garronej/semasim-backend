import * as fs from "fs";
import * as path from "path";
import { c as shared } from "../semasim-gateway";
import { PushNotificationCredentials } from "../tools/pushSender";

const pathToPrivate = path.join(__dirname, "..", "..", "..", "private");

export class c {

    public static readonly shared= shared;

    public static readonly serviceName= "semasim-backend";

    public static readonly dbParamsBackend = {
        "host": "127.0.0.1",
        "user": "semasim",
        "password": "semasim",
        "database": "semasim"
    };

    public static pushNotificationCredentials: PushNotificationCredentials = {
        "android": {
            "pathToServiceAccount": path.join(pathToPrivate, "semasimdev-firebase-adminsdk.json")
        },
        "iOS": {
            "pathToKey": path.join(pathToPrivate, "AuthKey_Y84XM8SSNL.p8"),
            "keyId": "Y84XM8SSNL",
            "teamId": "TW9WZG49Q3",
            "appId": "com.semasim.semasim"
        }
    };

    private static __tlsOptions__: { key: string; cert: string; ca: string; } | undefined = undefined;

    public static get tlsOptions() {

        if (this.__tlsOptions__) return this.__tlsOptions__;

        let pathToCerts = path.join(pathToPrivate, "tls-certs");

        let key = fs.readFileSync(path.join(pathToCerts, "privkey.pem"), "utf8");
        let cert = fs.readFileSync(path.join(pathToCerts, "fullchain.pem"), "utf8");
        let ca = fs.readFileSync(path.join(pathToCerts, "chain.pem"), "utf8");

        this.__tlsOptions__ = { key, cert, ca };

        return this.tlsOptions;

    }

    public static readonly reg_expires = 21601;

    public static readonly regExpImei = /^[0-9]{15}$/;

    public static readonly regExpIccid = /^[0-9]{6,22}$/;

    public static readonly regExpEmail =
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    //TODO: better regexp
    public static readonly regExpPassword = /^[0-9a-zA-Z]{6,}$/;

    public static readonly regExpFourDigits = /^[0-9]{4}$/;


}