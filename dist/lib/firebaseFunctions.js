"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fbAdmin = require("firebase-admin");
var c = require("./constants");
fbAdmin.initializeApp({
    "credential": fbAdmin.credential.cert(c.serviceAccount)
});
function wakeUpDevice(registrationToken) {
    var payload = { "data": {} };
    var options = { "priority": "high" };
    return fbAdmin.messaging().sendToDevice(registrationToken, payload, options);
}
exports.wakeUpDevice = wakeUpDevice;
