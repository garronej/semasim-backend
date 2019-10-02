"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apn = require("apn");
const fbAdmin = require("firebase-admin");
let sendByPlatform = undefined;
let _close = undefined;
function launch(credentials) {
    const { android, iOS } = credentials;
    const apnProvider = new apn.Provider({
        "token": {
            "key": iOS.pathToKey,
            "keyId": iOS.keyId,
            "teamId": iOS.teamId
        },
        "production": false
    });
    const serviceAccount = require(android.pathToServiceAccount);
    const fbApp = fbAdmin.initializeApp({
        "credential": fbAdmin.credential.cert(serviceAccount)
    });
    _close = async () => {
        //NOTE: Api does not expose methods to track when completed.
        apnProvider.shutdown();
        await fbApp.delete();
    };
    sendByPlatform = {
        "android": async (tokens, data) => {
            if (tokens.length === 0) {
                return;
            }
            const payload = { "data": data || {} };
            const options = { "priority": "high" };
            try {
                await fbApp.messaging().sendToDevice(tokens, payload, options);
            }
            catch (error) {
                throw error;
            }
        },
        "iOS": async (tokens) => {
            if (tokens.length === 0) {
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
exports.launch = launch;
function close() {
    if (_close === undefined) {
        throw new Error("PushSender not initialized");
    }
    return _close();
}
exports.close = close;
function send(platform, tokens, data) {
    if (sendByPlatform === undefined) {
        throw new Error("PushSender not initialized");
    }
    return sendByPlatform[platform](tokens, data);
}
exports.send = send;
