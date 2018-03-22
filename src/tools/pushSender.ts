import * as apn from "apn";
import * as fbAdmin from "firebase-admin";

export type PushNotificationCredentials = {
    android: {
        pathToServiceAccount: string;
    },
    iOS: {
        pathToKey: string;
        keyId: string;
        teamId: string;
        appId: string;
    }
};

export type Platform = "android" | "iOS";

export let send: (platform: Platform, token: string) => Promise<void> =
    () => { throw new Error("PushSender not initialized") };

export function launch(
    credentials: PushNotificationCredentials
) {

    let { android, iOS } = credentials;

    let apnProvider = new apn.Provider({
        "token": {
            "key": iOS.pathToKey,
            "keyId": iOS.keyId,
            "teamId": iOS.teamId
        },
        "production": false
    });

    let serviceAccount: fbAdmin.ServiceAccount = require(android.pathToServiceAccount);

    fbAdmin.initializeApp({
        "credential": fbAdmin.credential.cert(serviceAccount)
    });

    let sendByPlatform: { [platform: string]: (token: string) => Promise<void> } = {
        "android": async token => {

            console.log("sending push notification to android device");

            let payload: fbAdmin.messaging.MessagingPayload = { "data": {} };

            let options: fbAdmin.messaging.MessagingOptions = { "priority": "high" };

            try{

            await fbAdmin.messaging().sendToDevice(token, payload, options);

            }catch(error){

                console.log("failed to sent push notification to android device");

                throw error;

            }

        },
        "iOS": async token => {

            console.log("sending push notification to iOS device");

            let notification = new apn.Notification({
                "topic": `${iOS.appId}.voip`,
                "expiry": Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
                "payload": {}
            });

            let { failed } = await apnProvider.send(notification, token);

            if (failed.length) {

                console.log("failed to send push notification to iOS device");

                let error = new Error("Apple send push notification failed");

                error["responseFailure"] = failed.pop();

                throw error;

            }
        }
    };

    send = (platform, token) => sendByPlatform[platform](token);

}

