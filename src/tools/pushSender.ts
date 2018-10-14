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

let sendByPlatform: { 
    [platform: string]: (tokens: string[], data?: Record<string, string>) => Promise<void> 
} | undefined = undefined;

let _close: (()=> Promise<void>) | undefined = undefined;

export function launch( credentials: PushNotificationCredentials) {

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

    _close= async ()=> {
        
        //NOTE: Api does not expose methods to track when completed.
        apnProvider.shutdown();

        await fbApp.delete();

    };

     sendByPlatform  = {
        "android": async (tokens, data) => {

            if( tokens.length === 0 ){
                return;
            }

            const payload: fbAdmin.messaging.MessagingPayload = { "data": data || {} };

            const options: fbAdmin.messaging.MessagingOptions = { "priority": "high" };

            try {

                await fbApp.messaging().sendToDevice(tokens, payload, options);

            } catch (error) {

                throw error;

            }

        },
        "iOS": async tokens => {

            if( tokens.length === 0 ){
                return;
            }

            //TODO: Implement data payload.

            const notification = new apn.Notification({
                "topic": `${iOS.appId}.voip`,
                "expiry": Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
                "payload": {}
            });

            const { failed } = await apnProvider.send(notification, tokens);

            if (failed.length) {

                let error = new Error("Apple send push notification failed");

                error["responseFailure"] = failed.pop();

                throw error;

            }
        }
    };

}


export function close(): Promise<void> {

    if( _close === undefined ){

        throw new Error("PushSender not initialized");

    }

    return _close();

}



export function send(platform: Platform, tokens: string[], data?: Record<string,string>): Promise<void> {

    if( sendByPlatform === undefined ){

        throw new Error("PushSender not initialized");

    }

    return sendByPlatform[platform](tokens, data);

}

