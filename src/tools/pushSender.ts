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

export function launch(
    credentials: PushNotificationCredentials
) {

    const { android, iOS } = credentials;

    const apnProvider = new apn.Provider({
        "token": {
            "key": iOS.pathToKey,
            "keyId": iOS.keyId,
            "teamId": iOS.teamId
        },
        "production": false
    });

    const serviceAccount: fbAdmin.ServiceAccount = require(android.pathToServiceAccount);

    const fbApp= fbAdmin.initializeApp({
        "credential": fbAdmin.credential.cert(serviceAccount)
    });

    close= async ()=> {
        
        //NOTE: Api does not expose methods to track when completed.
        apnProvider.shutdown();

        await fbApp.delete();

    };

    const sendByPlatform: { [platform: string]: (token: string, data?: Record<string,string>) => Promise<void> } = {
        "android": async (token, data) => {

            const payload: fbAdmin.messaging.MessagingPayload = { "data": data || {} };

            const options: fbAdmin.messaging.MessagingOptions = { "priority": "high" };

            try {

                await fbApp.messaging().sendToDevice(token, payload, options);

            } catch (error) {

                throw error;

            }

        },
        "iOS": async token => {

            //TODO: Implement data payload.

            const notification = new apn.Notification({
                "topic": `${iOS.appId}.voip`,
                "expiry": Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
                "payload": {}
            });

            const { failed } = await apnProvider.send(notification, token);

            if (failed.length) {

                let error = new Error("Apple send push notification failed");

                error["responseFailure"] = failed.pop();

                throw error;

            }
        }
    };

    send = (platform, token, data) => sendByPlatform[platform](token, data);

}

export let close: ()=> Promise<void> = 
    () => { throw new Error("PushSender not initialized"); };


export let send: (platform: Platform, token: string, data?: Record<string,string>) => Promise<void> =
    () => { throw new Error("PushSender not initialized"); };

