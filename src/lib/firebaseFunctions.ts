import * as fbAdmin from "firebase-admin";
import * as c from "./constants";

fbAdmin.initializeApp({
  "credential": fbAdmin.credential.cert(c.serviceAccount)
});

export function wakeUpDevice(
    registrationToken: string
): Promise<fbAdmin.messaging.MessagingDevicesResponse>{

    let payload: fbAdmin.messaging.MessagingPayload= { "data": {}};

    let options: fbAdmin.messaging.MessagingOptions= { "priority": "high" };

    return fbAdmin.messaging().sendToDevice(registrationToken, payload, options);

}