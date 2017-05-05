"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var js_base64_1 = require("js-base64");
var pjsip_1 = require("./pjsip");
var fromDongle_1 = require("./fromDongle");
exports.callContext = "from-sip-call";
exports.messageContext = "from-sip-message";
;
var fromSip;
(function (fromSip) {
    function call(channel) {
        return __awaiter(this, void 0, void 0, function () {
            var _, imei;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _ = channel.relax;
                        console.log("FROM SIP CALL!");
                        imei = channel.request.callerid;
                        return [4 /*yield*/, _.setVariable("JITTERBUFFER(fixed)", "2500,10000")];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, _.setVariable("AGC(rx)", fromDongle_1.gain)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, _.exec("Dial", ["Dongle/i:" + imei + "/" + channel.request.extension, "60"])];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    fromSip.call = call;
    function outOfCallMessage(sipPacket) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log(" FROM SIP DATA...");
                        console.log({ sipPacket: sipPacket });
                        _a = sipPacket['MESSAGE']['to'].match(/^(?:pj)?sip:([^@]+)/)[1];
                        switch (_a) {
                            case "semasim": return [3 /*break*/, 1];
                        }
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, outOfCallMessage.applicationData(sipPacket)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, outOfCallMessage.sms(sipPacket)];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    fromSip.outOfCallMessage = outOfCallMessage;
    (function (outOfCallMessage) {
        function sms(sipPacket) {
            return __awaiter(this, void 0, void 0, function () {
                var body, number, text, imei, outgoingMessageId, error_1, sendDate, contacts, _i, contacts_1, contact;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            console.log("...MESSAGE");
                            body = js_base64_1.Base64.decode(sipPacket['MESSAGE']['base-64-encoded-body']);
                            number = sipPacket.MESSAGE.to.match(/^(?:pj)?sip:(\+?[0-9]+)/)[1];
                            text = body;
                            imei = sipPacket.MESSAGE.from.match(/^<sip:([^@]+)/)[1];
                            console.log({ number: number, imei: imei, text: text });
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().sendMessage(imei, number, text)];
                        case 2:
                            outgoingMessageId = _a.sent();
                            //TODO respond with message id.
                            console.log({ outgoingMessageId: outgoingMessageId });
                            return [3 /*break*/, 4];
                        case 3:
                            error_1 = _a.sent();
                            console.log("ERROR: Send message via dongle failed, retry later", error_1);
                            outgoingMessageId = NaN;
                            return [3 /*break*/, 4];
                        case 4:
                            sendDate = new Date();
                            return [4 /*yield*/, pjsip_1.pjsip.getEndpointContacts(imei)];
                        case 5:
                            contacts = _a.sent();
                            //TODO: send as well content of the message and date for other contacts
                            console.log("Forwarding Message send confirmation to " + contacts.length + " endpoints...");
                            _i = 0, contacts_1 = contacts;
                            _a.label = 6;
                        case 6:
                            if (!(_i < contacts_1.length)) return [3 /*break*/, 9];
                            contact = contacts_1[_i];
                            return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.messageSend("pjsip:" + contact, number, "\"" + text + "\" " + (isNaN(outgoingMessageId) ? "SEND ERROR" : "SENT\nOUTGOING MESSAGE ID: " + outgoingMessageId), {
                                    "True-Content-Type": "text/plain;charset=UTF-8",
                                    "Semasim-Message-Type": "Send-Status",
                                    "Send-Status_Is-Send": "" + !isNaN(outgoingMessageId),
                                    "Send-Status_Send-Date": sendDate.toISOString(),
                                    "Send-Status_Outgoing-Message-ID": "" + outgoingMessageId,
                                    "Send-Status_Request-Call-ID": sipPacket.MESSAGE_DATA["Call-ID"],
                                })];
                        case 7:
                            _a.sent();
                            console.log("...forwarded to contact " + contact);
                            _a.label = 8;
                        case 8:
                            _i++;
                            return [3 /*break*/, 6];
                        case 9: return [2 /*return*/];
                    }
                });
            });
        }
        outOfCallMessage.sms = sms;
        function applicationData(sipPacket) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    console.log("...APPLICATION DATA!");
                    return [2 /*return*/];
                });
            });
        }
        outOfCallMessage.applicationData = applicationData;
    })(outOfCallMessage = fromSip.outOfCallMessage || (fromSip.outOfCallMessage = {}));
})(fromSip = exports.fromSip || (exports.fromSip = {}));
//# sourceMappingURL=fromSip.js.map