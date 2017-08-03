"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sip = require("./sip");
var Message;
(function (Message) {
    var method = "INTERNAL";
    var message = sip.parse([
        method + " _ SIP/2.0",
        "\r\n"
    ].join("\r\n"));
    function buildSipRequest(data) {
        var newMessage = sip.copyMessage(message);
        newMessage.content = JSON.stringify(data);
        return newMessage;
    }
    Message.buildSipRequest = buildSipRequest;
    function matchSipRequest(sipRequest) {
        return sipRequest.method === method;
    }
    Message.matchSipRequest = matchSipRequest;
    function parseSipRequest(sipRequest) {
        return JSON.parse(sipRequest.content);
    }
    Message.parseSipRequest = parseSipRequest;
    var NotifyKnownDongle;
    (function (NotifyKnownDongle) {
        NotifyKnownDongle.messageId = "NotifyKnownDongle";
        function buildSipRequest(imei, lastConnection) {
            var notifyKnownDongle = { messageId: NotifyKnownDongle.messageId, imei: imei, lastConnection: lastConnection };
            return Message.buildSipRequest(notifyKnownDongle);
        }
        NotifyKnownDongle.buildSipRequest = buildSipRequest;
        function match(message) {
            return message.messageId === NotifyKnownDongle.messageId;
        }
        NotifyKnownDongle.match = match;
    })(NotifyKnownDongle = Message.NotifyKnownDongle || (Message.NotifyKnownDongle = {}));
})(Message = exports.Message || (exports.Message = {}));
