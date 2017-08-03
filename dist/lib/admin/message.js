"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var inbound_1 = require("../sipProxy/inbound");
var _debug = require("debug");
var debug = _debug("_admin/message");
exports.evtMessage = inbound_1.evtIncomingMessage;
function sendMessage(contact, number, headers, content, contactName) {
    return new Promise(function (resolve, reject) {
        //console.log("sending message", { contact, fromUriUser, headers, content, fromName });
        debug("sendMessage", { contact: contact, number: number, headers: headers, content: content, contactName: contactName });
        var actionId = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
        var uri = contact.path.split(",")[0].match(/^<(.*)>$/)[1].replace(/;lr/, "");
        chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.messageSend("pjsip:" + contact.endpoint + "/" + uri, number, actionId).catch(function (error) { return reject(error); });
        inbound_1.evtOutgoingMessage.attachOnce(function (_a) {
            var sipRequest = _a.sipRequest;
            return sipRequest.content === actionId;
        }, function (_a) {
            var sipRequest = _a.sipRequest, evtReceived = _a.evtReceived;
            //TODO: inform that the name come from the SD card
            if (contactName)
                sipRequest.headers.from.name = "" + contactName;
            sipRequest.uri = contact.uri;
            sipRequest.headers.to = { "name": undefined, "uri": contact.uri, "params": {} };
            delete sipRequest.headers.contact;
            sipRequest.content = content;
            sipRequest.headers = __assign({}, sipRequest.headers, headers);
            evtReceived.waitFor(3000).then(function () { return resolve(true); }).catch(function () { return resolve(false); });
        });
    });
}
exports.sendMessage = sendMessage;
