import * as fbAdmin from "firebase-admin";

let hasInit= false;

export function init(pathToFirebaseAdminAccount: string){

    if( hasInit ) return;

    let serviceAccount: fbAdmin.ServiceAccount= require( pathToFirebaseAdminAccount );

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