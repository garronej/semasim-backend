import * as path from "path";
import { PushNotificationCredentials } from "../tools/pushSender";
import { sharedConstants as shared } from "../semasim-gateway";

export { shared };

export const serviceName = "semasim-backend";

export const dbParamsBackend = {
    "host": "127.0.0.1",
    "user": "semasim",
    "password": "semasim"
};

const pathToPrivate = path.join(__dirname, "..", "..", "..", "private");

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

export const tlsPath = (() => {

    let build = (fileName: string) => path.join(pathToPrivate, "tls-certs", fileName);

    return {
        "key": build("privkey.pem"),
        "cert": build("fullchain.pem"),
        "ca": build("chain.pem")
    };

})();




