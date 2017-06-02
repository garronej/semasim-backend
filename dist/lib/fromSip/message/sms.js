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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
var pjsip = require("../../pjsip");
var fromDongle = require("../../fromDongle");
var _debug = require("debug");
var debug = _debug("_fromSip/sms");
function sms(sipPacket) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var text, number, imei, outgoingMessageId, info_message, imsi, isSent, headers, name, _a, _b, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    debug("...SMS!");
                    text = sipPacket.body;
                    number = sipPacket.to;
                    imei = sipPacket.from_endpoint;
                    outgoingMessageId = NaN;
                    info_message = "";
                    imsi = "";
                    return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                            var dongle, error_2;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().getActiveDongle(imei)];
                                    case 1:
                                        dongle = _a.sent();
                                        if (!dongle) {
                                            //TODO: Should not be allowed by client, cf presence state
                                            info_message = "MESSAGE NOT SEND, DONGLE NOT ACTIVE";
                                            return [2 /*return*/, undefined];
                                        }
                                        imsi = dongle.imsi;
                                        _a.label = 2;
                                    case 2:
                                        _a.trys.push([2, 4, , 5]);
                                        return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient
                                                .localhost()
                                                .sendMessage(imei, number, text)];
                                    case 3:
                                        outgoingMessageId = _a.sent();
                                        return [3 /*break*/, 5];
                                    case 4:
                                        error_2 = _a.sent();
                                        info_message = "MESSAGE NOT SEND, INTERNAL ERROR, " + error_2.message;
                                        return [2 /*return*/, false];
                                    case 5:
                                        if (isNaN(outgoingMessageId)) {
                                            info_message = "MESSAGE NOT SEND, DONGLE ERROR";
                                            return [2 /*return*/, false];
                                        }
                                        info_message = "MESSAGE SUCCESSFULLY SENT";
                                        return [2 /*return*/, true];
                                }
                            });
                        }); })()];
                case 1:
                    isSent = _c.sent();
                    headers = {
                        "outgoing_message_id": "" + outgoingMessageId,
                        "imsi": imsi,
                        "is_sent": "" + isSent,
                        "info_message": info_message
                    };
                    debug("SMS: ", { number: number, imei: imei, text: text, headers: headers });
                    return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().getContactName(imei, number)];
                case 2:
                    name = _c.sent();
                    _b = (_a = pjsip).sendHiddenMessage;
                    return [4 /*yield*/, pjsip.getAvailableContactsOfEndpoint(sipPacket.from_endpoint)];
                case 3:
                    _b.apply(_a, [_c.sent(),
                        number,
                        headers,
                        text,
                        isSent ? "✓" : info_message,
                        "sms_send_status",
                        sipPacket.headers.call_id]);
                    if (!isSent)
                        return [2 /*return*/];
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 6, , 8]);
                    return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient
                            .localhost()
                            .evtMessageStatusReport
                            .waitFor(function (_a) {
                            var messageId = _a.messageId;
                            return messageId === outgoingMessageId;
                        }, 15000)];
                case 5:
                    _c.sent();
                    return [3 /*break*/, 8];
                case 6:
                    error_1 = _c.sent();
                    debug("no status report received");
                    return [4 /*yield*/, fromDongle.statusReport(imei, {
                            "messageId": outgoingMessageId,
                            "dischargeTime": new Date(NaN),
                            "isDelivered": false,
                            "recipient": number,
                            "status": ""
                        })];
                case 7:
                    _c.sent();
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
exports.sms = sms;
//# sourceMappingURL=sms.js.map