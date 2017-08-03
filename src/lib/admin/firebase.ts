import * as fbAdmin from "firebase-admin";

let serviceAccount: fbAdmin.ServiceAccount= require("../../../res/semasimdev-firebase-adminsdk.json");

fbAdmin.initializeApp({
  "credential": fbAdmin.credential.cert(serviceAccount)
});

export function wakeUpDevice(
    registrationToken: string
): Promise<fbAdmin.messaging.MessagingDevicesResponse>{

    let payload: fbAdmin.messaging.MessagingPayload= { "data": {}};

    let options: fbAdmin.messaging.MessagingOptions= { "priority": "high" };

    return fbAdmin.messaging().sendToDevice(registrationToken, payload, options);

}

