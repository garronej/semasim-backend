import * as apn from "apn";
import * as fbAdmin from "firebase-admin";
import * as path from "path";

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

export function init(
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

  let sendByPlatform: { [platform: string]: (token: string)=> Promise<void> } = {
    "android": async token => {

        let payload: fbAdmin.messaging.MessagingPayload = { "data": {} };

        let options: fbAdmin.messaging.MessagingOptions = { "priority": "high" };

        await fbAdmin.messaging().sendToDevice(token, payload, options);

    },
    "iOS": async token => {

        let notification = new apn.Notification({
          "topic": `${iOS.appId}.voip`,
          "expiry": Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
          "payload": {}
        });

        let { failed } = await apnProvider.send(notification, token);

        if (failed.length) {

          let error = new Error("Apple send push notification failed");

          error["responseFailure"] = failed.pop();

          throw error;

        }
    }
  };

  send = (platform, token) => sendByPlatform[platform](token);


}

