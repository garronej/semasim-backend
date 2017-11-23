"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fbAdmin = require("firebase-admin");
var hasInit = false;
function init(pathToFirebaseAdminAccount) {
    if (hasInit)
        return;
    var serviceAccount = require(pathToFirebaseAdminAccount);
    fbAdmin.initializeApp({
        "credential": fbAdmin.credential.cert(serviceAccount)
    });
    hasInit = true;
}
exports.init = init;
function sendPushNotification(registrationToken) {
    var payload = { "data": {} };
    var options = { "priority": "high" };
    return fbAdmin.messaging().sendToDevice(registrationToken, payload, options);
}
exports.sendPushNotification = sendPushNotification;
