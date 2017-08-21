import * as fbAdmin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

export const dbParams = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "abcde12345"
};

export const gain = `${4000}`;

export const jitterBuffer = {
    //type: "fixed",
    //params: "2500,10000"
    //type: "fixed",
    //params: "default"
    type: "adaptive",
    params: "default"
};

//TODO: not defined here get from chan-dongle-extended-client
export const dongleCallContext= "from-dongle";

export const phoneNumber = "_[+0-9].";

export const sipCallContext = "from-sip-call";

export const sipMessageContext = "from-sip-message";

export const serviceAccount: fbAdmin.ServiceAccount= require("../../res/semasimdev-firebase-adminsdk.json");

export const outboundSipProxyListeningPortForDevices = 50610;

export const flowTokenKey = "flowtoken";

export const outboundHostname= "semasim.com";

export function getTlsOptions(): { key: string; cert: string; ca: string } {

        let pathToCerts = path.join("/", "home", "admin", "ns.semasim.com");

        let key = fs.readFileSync(path.join(pathToCerts, "privkey2.pem"), "utf8");
        let cert = fs.readFileSync(path.join(pathToCerts, "fullchain2.pem"), "utf8");
        let ca = fs.readFileSync(path.join(pathToCerts, "chain2.pem"), "utf8");

        return { key, cert, ca };

}


export const webApiPath = "api";
export const webApiPort = 4430;