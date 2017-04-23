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
function fromDongle(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var _, dongle, _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    console.log("...FROM DONGLE...");
                    _ = channel.relax;
                    _a = {};
                    _b = "name";
                    return [4 /*yield*/, _.getVariable("DONGLENAME")];
                case 1:
                    _a[_b] = _h.sent();
                    _c = "provider";
                    return [4 /*yield*/, _.getVariable("DONGLEPROVIDER")];
                case 2:
                    _a[_c] = _h.sent();
                    _d = "imei";
                    return [4 /*yield*/, _.getVariable("DONGLEIMEI")];
                case 3:
                    _a[_d] = _h.sent();
                    _e = "imsi";
                    return [4 /*yield*/, _.getVariable("DONGLEIMSI")];
                case 4:
                    _a[_e] = _h.sent();
                    _f = "number";
                    return [4 /*yield*/, _.getVariable("DONGLENUMBER")];
                case 5:
                    dongle = (_a[_f] = _h.sent(),
                        _a);
                    console.log({ dongle: dongle });
                    _g = channel.request.extension;
                    switch (_g) {
                        case "reassembled-sms": return [3 /*break*/, 6];
                        case "sms-status-report": return [3 /*break*/, 8];
                    }
                    return [3 /*break*/, 10];
                case 6: return [4 /*yield*/, fromDongle.message(dongle, channel)];
                case 7:
                    _h.sent();
                    return [3 /*break*/, 12];
                case 8: return [4 /*yield*/, fromDongle.statusReport(dongle, channel)];
                case 9:
                    _h.sent();
                    return [3 /*break*/, 12];
                case 10: return [4 /*yield*/, fromDongle.call(dongle, channel)];
                case 11:
                    _h.sent();
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
exports.fromDongle = fromDongle;
(function (fromDongle) {
    function message(dongle, channel) {
        return __awaiter(this, void 0, void 0, function () {
            var _, message, _a, _b, _c, _d, _e, _f, to, _g, _h, _j;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        console.log("...MESSAGE !");
                        _ = channel.relax;
                        _a = {};
                        _b = "date";
                        _c = Date.bind;
                        return [4 /*yield*/, _.getVariable("SMS_DATE")];
                    case 1:
                        _a[_b] = new (_c.apply(Date, [void 0, (_k.sent())]))();
                        _e = "number";
                        return [4 /*yield*/, _.getVariable("SMS_NUMBER")];
                    case 2:
                        _a[_e] = (_k.sent());
                        _f = "text";
                        return [4 /*yield*/, (function () {
                                return __awaiter(this, void 0, void 0, function () {
                                    var textSplitCount, _a, _b, reassembledSms, i, _c;
                                    return __generator(this, function (_d) {
                                        switch (_d.label) {
                                            case 0:
                                                _a = parseInt;
                                                return [4 /*yield*/, _.getVariable("SMS_TEXT_SPLIT_COUNT")];
                                            case 1:
                                                textSplitCount = _a.apply(void 0, [(_d.sent())]);
                                                reassembledSms = "";
                                                i = 0;
                                                _d.label = 2;
                                            case 2:
                                                if (!(i < textSplitCount)) return [3 /*break*/, 5];
                                                _c = reassembledSms;
                                                return [4 /*yield*/, _.getVariable("SMS_TEXT_P" + i)];
                                            case 3:
                                                reassembledSms = _c + _d.sent();
                                                _d.label = 4;
                                            case 4:
                                                i++;
                                                return [3 /*break*/, 2];
                                            case 5: return [2 /*return*/, decodeURI(reassembledSms)];
                                        }
                                    });
                                });
                            })()];
                    case 3:
                        message = (_a[_f] = _k.sent(),
                            _a);
                        console.log({ message: message });
                        to = "alice";
                        return [4 /*yield*/, _.setVariable("MESSAGE(body)", "\"" + message.text.replace(/"/g, "''") + "\"")];
                    case 4:
                        _k.sent();
                        return [4 /*yield*/, _.exec("MessageSend", ["SIP:alice", "\"contact_name\" <" + message.number + ">"])];
                    case 5:
                        _k.sent();
                        _h = (_g = console).log;
                        _j = ["MESSAGE_SEND_STATUS"];
                        return [4 /*yield*/, _.getVariable("MESSAGE_SEND_STATUS")];
                    case 6:
                        _h.apply(_g, _j.concat([_k.sent()]));
                        return [2 /*return*/];
                }
            });
        });
    }
    fromDongle.message = message;
    function statusReport(dongle, channel) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log("...STATUS REPORT!");
                return [2 /*return*/];
            });
        });
    }
    fromDongle.statusReport = statusReport;
    function call(dongle, channel) {
        return __awaiter(this, void 0, void 0, function () {
            var _;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("...CALL!");
                        _ = channel.relax;
                        return [4 /*yield*/, _.answer()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, _.streamFile("hello-world")];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    fromDongle.call = call;
})(fromDongle = exports.fromDongle || (exports.fromDongle = {}));
//# sourceMappingURL=fromDongle.js.map