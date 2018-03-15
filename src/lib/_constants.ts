import * as path from "path";
import { sharedConstants as shared } from "../semasim-gateway";
import { PushNotificationCredentials } from "../tools/pushSender";

export const nginxUpdaterServiceName= "semasim-nginx-updater";
export const modulePath = path.join(__dirname, "..", "..");
export const path_to_nginx = path.join("/", "etc", "nginx");
export const path_to_tcpconf_d = path.join(modulePath, "res", "nginx", "tcpconf.d");

export { shared };

export const semasim_lan= "172.31.20.0/24";

export const dbAuth = {
    "host": "172.31.19.1",
    "port": 3306,
    "user": "semasim",
    "password": "5iv2hG50BAhbU7bL"
};

const pathToPrivate = path.join(__dirname, "..", "..", "..", "private");

export const tlsPath = (() => {

    let build = (fileName: string) => path.join(pathToPrivate, "tls-certs", fileName);

    return {
        "key": build("privkey.pem"),
        "cert": build("fullchain.pem"),
        "ca": build("chain.pem")
    };

})();

export const pushNotificationCredentials: PushNotificationCredentials = {
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

