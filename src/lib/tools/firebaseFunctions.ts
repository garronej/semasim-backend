import * as fbAdmin from "firebase-admin";

//TODO: change by send push

let hasInit= false;

export function init(serviceAccount: fbAdmin.ServiceAccount){

    if( hasInit ) return;

    fbAdmin.initializeApp({
        "credential": fbAdmin.credential.cert(serviceAccount)
    });

    hasInit= true;

}

export function sendPushNotification(
    registrationToken: string
): Promise<fbAdmin.messaging.MessagingDevicesResponse>{

    let payload: fbAdmin.messaging.MessagingPayload= { "data": {}};

    let options: fbAdmin.messaging.MessagingOptions= { "priority": "high" };

    return fbAdmin.messaging().sendToDevice(registrationToken, payload, options);

}