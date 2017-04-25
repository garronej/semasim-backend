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
//import { Base64 } from "js-base64";
var fromSip_1 = require("./fromSip");
var fromDongle;
(function (fromDongle) {
    function sms(imei, message) {
        return __awaiter(this, void 0, void 0, function () {
            var to, contacts, _i, contacts_1, contact;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("FROM DONGLE MESSAGE");
                        console.log({ imei: imei, message: message });
                        to = "alice";
                        return [4 /*yield*/, fromSip_1.getEndpointsContacts()];
                    case 1:
                        contacts = (_a.sent())[to] || [];
                        console.log("Forwarding message to " + contacts.length + " endpoints...");
                        _i = 0, contacts_1 = contacts;
                        _a.label = 2;
                    case 2:
                        if (!(_i < contacts_1.length)) return [3 /*break*/, 5];
                        contact = contacts_1[_i];
                        return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.messageSend("pjsip:" + contact, "" + message.number, message.text, {
                                "True-Content-Type": "text/plain;charset=UTF-8",
                                "Semasim-Event": "SMS"
                            })];
                    case 3:
                        _a.sent();
                        console.log("...forwarded to contact " + contact);
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    fromDongle.sms = sms;
    function statusReport(imei, statusReport) {
        return __awaiter(this, void 0, void 0, function () {
            var to, contacts, _i, contacts_2, contact;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("FROM DONGLE STATUS REPORT!");
                        console.log({ imei: imei, statusReport: statusReport });
                        to = "alice";
                        return [4 /*yield*/, fromSip_1.getEndpointsContacts()];
                    case 1:
                        contacts = (_a.sent())[to] || [];
                        console.log("Forwarding status report to " + contacts.length + " endpoints...");
                        _i = 0, contacts_2 = contacts;
                        _a.label = 2;
                    case 2:
                        if (!(_i < contacts_2.length)) return [3 /*break*/, 5];
                        contact = contacts_2[_i];
                        return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.messageSend("pjsip:" + contact, "semasim", JSON.stringify(statusReport), {
                                "True-Content-Type": "application/json;charset=UTF-8",
                                "Semasim-Event": "Status-Report"
                            })];
                    case 3:
                        _a.sent();
                        console.log("...forwarded to contact " + contact);
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    fromDongle.statusReport = statusReport;
    function call(channel) {
        return __awaiter(this, void 0, void 0, function () {
            var _, dongle, _a, _b, _c, _d, _e, _f, to, contactsToDial;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        console.log("... FROM DONGLE CALL!");
                        _ = channel.relax;
                        _a = {};
                        _b = "name";
                        return [4 /*yield*/, _.getVariable("DONGLENAME")];
                    case 1:
                        _a[_b] = _g.sent();
                        _c = "provider";
                        return [4 /*yield*/, _.getVariable("DONGLEPROVIDER")];
                    case 2:
                        _a[_c] = _g.sent();
                        _d = "imei";
                        return [4 /*yield*/, _.getVariable("DONGLEIMEI")];
                    case 3:
                        _a[_d] = _g.sent();
                        _e = "imsi";
                        return [4 /*yield*/, _.getVariable("DONGLEIMSI")];
                    case 4:
                        _a[_e] = _g.sent();
                        _f = "number";
                        return [4 /*yield*/, _.getVariable("DONGLENUMBER")];
                    case 5:
                        dongle = (_a[_f] = _g.sent(),
                            _a);
                        console.log({ dongle: dongle });
                        to = "alice";
                        return [4 /*yield*/, _.getVariable("PJSIP_DIAL_CONTACTS(" + to + ")")];
                    case 6:
                        contactsToDial = _g.sent();
                        if (!contactsToDial) {
                            console.log("No contact to dial!");
                            return [2 /*return*/];
                        }
                        console.log({ contactsToDial: contactsToDial });
                        //await _.setVariable("JITTERBUFFER(fixed)","default");
                        //JITTERBUFFER(fixed)=default
                        return [4 /*yield*/, _.exec("Dial", [contactsToDial, "10"])];
                    case 7:
                        //await _.setVariable("JITTERBUFFER(fixed)","default");
                        //JITTERBUFFER(fixed)=default
                        _g.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    fromDongle.call = call;
})(fromDongle = exports.fromDongle || (exports.fromDongle = {}));
//# sourceMappingURL=fromDongle.js.map