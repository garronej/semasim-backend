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
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var pjsip = require("../../pjsip");
function sms(sipPacket) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var text, number, imei, outgoingMessageId, info_message, imsi, isSent, headers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("...SMS!");
                    text = sipPacket.body;
                    number = sipPacket.to;
                    imei = sipPacket.from_endpoint;
                    console.log("SMS: ", { number: number, imei: imei, text: text });
                    outgoingMessageId = NaN;
                    info_message = "";
                    imsi = "";
                    return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b, dongle, e_1_1, error_1, e_1, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _d.trys.push([0, 5, 6, 7]);
                                        return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().getActiveDongles()];
                                    case 1:
                                        _a = __values.apply(void 0, [_d.sent()]), _b = _a.next();
                                        _d.label = 2;
                                    case 2:
                                        if (!!_b.done) return [3 /*break*/, 4];
                                        dongle = _b.value;
                                        if (dongle.imei !== imei)
                                            return [3 /*break*/, 3];
                                        imsi = dongle.imsi;
                                        return [3 /*break*/, 4];
                                    case 3:
                                        _b = _a.next();
                                        return [3 /*break*/, 2];
                                    case 4: return [3 /*break*/, 7];
                                    case 5:
                                        e_1_1 = _d.sent();
                                        e_1 = { error: e_1_1 };
                                        return [3 /*break*/, 7];
                                    case 6:
                                        try {
                                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                        }
                                        finally { if (e_1) throw e_1.error; }
                                        return [7 /*endfinally*/];
                                    case 7:
                                        if (!imsi) {
                                            //Should not be allowed by client, cf presence state
                                            info_message = "MESSAGE NOT SEND, DONGLE NOT ACTIVE";
                                            return [2 /*return*/, undefined];
                                        }
                                        _d.label = 8;
                                    case 8:
                                        _d.trys.push([8, 10, , 11]);
                                        return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().sendMessage(imei, number, text || " ")];
                                    case 9:
                                        outgoingMessageId = _d.sent();
                                        return [3 /*break*/, 11];
                                    case 10:
                                        error_1 = _d.sent();
                                        info_message = "MESSAGE NOT SEND, INTERNAL ERROR, " + error_1.message;
                                        return [2 /*return*/, false];
                                    case 11:
                                        if (isNaN(outgoingMessageId)) {
                                            info_message = "MESSAGE NOT SEND, DONGLE ERROR";
                                            return [2 /*return*/, false];
                                        }
                                        info_message = "";
                                        return [2 /*return*/, true];
                                }
                            });
                        }); })()];
                case 1:
                    isSent = _a.sent();
                    headers = {
                        "outgoing_message_id": "" + outgoingMessageId,
                        "imsi": imsi,
                        "is_sent": "" + isSent,
                        "date": (new Date()).toISOString(),
                        "info_message": info_message
                    };
                    pjsip.sendMessage(sipPacket.from_endpoint, number, headers, text, "sms_send_status", sipPacket.headers.call_id, info_message);
                    return [2 /*return*/];
            }
        });
    });
}
exports.sms = sms;
//# sourceMappingURL=sms.js.map