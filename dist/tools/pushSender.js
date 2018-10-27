"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    _close = () => __awaiter(this, void 0, void 0, function* () {
        //NOTE: Api does not expose methods to track when completed.
        apnProvider.shutdown();
        yield fbApp.delete();
    });
    sendByPlatform = {
        "android": (tokens, data) => __awaiter(this, void 0, void 0, function* () {
            if (tokens.length === 0) {
                return;
            }
            const payload = { "data": data || {} };
            const options = { "priority": "high" };
            try {
                yield fbApp.messaging().sendToDevice(tokens, payload, options);
            }
            catch (error) {
                throw error;
            }
        }),
        "iOS": (tokens) => __awaiter(this, void 0, void 0, function* () {
            if (tokens.length === 0) {
                return;
            }
            //TODO: Implement data payload.
            const notification = new apn.Notification({
                "topic": `${iOS.appId}.voip`,
                "expiry": Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
                "payload": {}
            });
            const { failed } = yield apnProvider.send(notification, tokens);
            if (failed.length) {
                let error = new Error("Apple send push notification failed");
                error["responseFailure"] = failed.pop();
                throw error;
            }
        })
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
