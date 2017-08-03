"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fbAdmin = require("firebase-admin");
var serviceAccount = require("../../../res/semasimdev-firebase-adminsdk.json");
fbAdmin.initializeApp({
    "credential": fbAdmin.credential.cert(serviceAccount)
});
function wakeUpDevice(registrationToken) {
    var payload = { "data": {} };
    var options = { "priority": "high" };
    return fbAdmin.messaging().sendToDevice(registrationToken, payload, options);
}
exports.wakeUpDevice = wakeUpDevice;
