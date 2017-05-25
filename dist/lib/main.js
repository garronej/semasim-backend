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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
require("rejection-tracker").main(__dirname, "..", "..");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var fromSip = require("./fromSip");
var fromDongle = require("./fromDongle");
var pjsip = require("./pjsip");
var agi = require("./agi");
//TODO periodically check if message can be sent
console.log("Started");
agi.startServer(function (channel) { return __awaiter(_this, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log("AGI REQUEST...");
                _a = channel.request.context;
                switch (_a) {
                    case fromDongle.context: return [3 /*break*/, 1];
                    case fromSip.callContext(channel.request.callerid): return [3 /*break*/, 3];
                }
                return [3 /*break*/, 5];
            case 1: return [4 /*yield*/, fromDongle.call(channel)];
            case 2:
                _b.sent();
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, fromSip.call(channel)];
            case 4:
                _b.sent();
                return [3 /*break*/, 5];
            case 5:
                console.log("AGI Script Terminated");
                return [2 /*return*/];
        }
    });
}); });
var dongleClient = chan_dongle_extended_client_1.DongleExtendedClient.localhost();
dongleClient.evtNewMessage.attach(function (_a) {
    var imei = _a.imei, message = __rest(_a, ["imei"]);
    return fromDongle.sms(imei, message);
});
dongleClient.evtMessageStatusReport.attach(function (_a) {
    var imei = _a.imei, statusReport = __rest(_a, ["imei"]);
    return fromDongle.statusReport(imei, statusReport);
});
var dongleEvtHandlers = {
    "onDongleDisconnect": function (imei) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("onDongleDisconnect", { imei: imei });
                    return [4 /*yield*/, pjsip.setPresence(imei, "ONHOLD")];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    "onNewActiveDongle": function (imei) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("onNewActiveDongle");
                    return [4 /*yield*/, pjsip.setPresence(imei, "NOT_INUSE")];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, initEndpoint(imei)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    "onRequestUnlockCode": function (imei) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("onRequestUnlockCode");
                    return [4 /*yield*/, pjsip.setPresence(imei, "UNAVAILABLE")];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, initEndpoint(imei)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }
};
function initEndpoint(endpoint) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, agi.initPjsipSideDialplan(endpoint)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, pjsip.addOrUpdateEndpoint(endpoint)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
(function findConnectedDongles() {
    return __awaiter(this, void 0, void 0, function () {
        var activeDongles, lockedDongles, disconnectedDongles, activeDongles_1, activeDongles_1_1, imei, lockedDongles_1, lockedDongles_1_1, imei, disconnectedDongles_1, disconnectedDongles_1_1, imei, e_1, _a, e_2, _b, e_3, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, dongleClient.getActiveDongles()];
                case 1:
                    activeDongles = (_d.sent()).map(function (_a) {
                        var imei = _a.imei;
                        return imei;
                    });
                    return [4 /*yield*/, dongleClient.getLockedDongles()];
                case 2:
                    lockedDongles = (_d.sent()).map(function (_a) {
                        var imei = _a.imei;
                        return imei;
                    });
                    return [4 /*yield*/, pjsip.queryEndpoints()];
                case 3:
                    disconnectedDongles = (_d.sent()).filter(function (imei) {
                        return __spread(activeDongles, lockedDongles).indexOf(imei) < 0;
                    });
                    try {
                        for (activeDongles_1 = __values(activeDongles), activeDongles_1_1 = activeDongles_1.next(); !activeDongles_1_1.done; activeDongles_1_1 = activeDongles_1.next()) {
                            imei = activeDongles_1_1.value;
                            dongleEvtHandlers.onNewActiveDongle(imei);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (activeDongles_1_1 && !activeDongles_1_1.done && (_a = activeDongles_1.return)) _a.call(activeDongles_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    try {
                        for (lockedDongles_1 = __values(lockedDongles), lockedDongles_1_1 = lockedDongles_1.next(); !lockedDongles_1_1.done; lockedDongles_1_1 = lockedDongles_1.next()) {
                            imei = lockedDongles_1_1.value;
                            dongleEvtHandlers.onRequestUnlockCode(imei);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (lockedDongles_1_1 && !lockedDongles_1_1.done && (_b = lockedDongles_1.return)) _b.call(lockedDongles_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    try {
                        for (disconnectedDongles_1 = __values(disconnectedDongles), disconnectedDongles_1_1 = disconnectedDongles_1.next(); !disconnectedDongles_1_1.done; disconnectedDongles_1_1 = disconnectedDongles_1.next()) {
                            imei = disconnectedDongles_1_1.value;
                            initEndpoint(imei);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (disconnectedDongles_1_1 && !disconnectedDongles_1_1.done && (_c = disconnectedDongles_1.return)) _c.call(disconnectedDongles_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    console.log({ activeDongles: activeDongles, lockedDongles: lockedDongles, disconnectedDongles: disconnectedDongles });
                    return [2 /*return*/];
            }
        });
    });
})();
dongleClient.evtDongleDisconnect.attach(function (_a) {
    var imei = _a.imei;
    return dongleEvtHandlers.onDongleDisconnect(imei);
});
dongleClient.evtNewActiveDongle.attach(function (_a) {
    var imei = _a.imei;
    return dongleEvtHandlers.onNewActiveDongle(imei);
});
dongleClient.evtRequestUnlockCode.attach(function (_a) {
    var imei = _a.imei;
    return dongleEvtHandlers.onRequestUnlockCode(imei);
});
pjsip.getEvtNewContact().attach(function (_a) {
    //TODO Send initialization information.
    var endpoint = _a.endpoint, contact = _a.contact;
    console.log("New contact", { endpoint: endpoint, contact: contact });
});
pjsip.getEvtPacketSipMessage().attach(function (sipPacket) { return fromSip.message(sipPacket); });
(function test() {
    return __awaiter(this, void 0, void 0, function () {
        var res, ami, state, presence;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                case 1:
                    _a.sent();
                    ami = chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami;
                    state = "NOT_INUSE";
                    console.log({ state: state });
                    return [4 /*yield*/, ami.postAction({
                            "action": "SetVar",
                            "variable": "DEVICE_STATE(Custom:bob)",
                            "value": state
                        })];
                case 2:
                    res = _a.sent();
                    console.log(res.message);
                    return [4 /*yield*/, ami.postAction({
                            "action": "GetVar",
                            "variable": "DEVICE_STATE(Custom:bob)"
                        })];
                case 3:
                    res = _a.sent();
                    console.log({ res: res });
                    presence = "available,value subtype,value message";
                    console.log({ presence: presence });
                    return [4 /*yield*/, ami.postAction({
                            "action": "SetVar",
                            "variable": "PRESENCE_STATE(CustomPresence:bob)",
                            "value": presence
                        })];
                case 4:
                    res = _a.sent();
                    console.log(res.message);
                    return [4 /*yield*/, ami.postAction({
                            "action": "GetVar",
                            "variable": "PRESENCE_STATE(CustomPresence:bob,value)"
                        })];
                case 5:
                    res = _a.sent();
                    console.log({ res: res });
                    return [4 /*yield*/, ami.postAction({
                            "action": "GetVar",
                            "variable": "PRESENCE_STATE(CustomPresence:bob,subtype)"
                        })];
                case 6:
                    res = _a.sent();
                    console.log({ res: res });
                    return [4 /*yield*/, ami.postAction({
                            "action": "GetVar",
                            "variable": "PRESENCE_STATE(CustomPresence:bob,message)"
                        })];
                case 7:
                    res = _a.sent();
                    console.log({ res: res });
                    return [2 /*return*/];
            }
        });
    });
});
(function test2() {
    return __awaiter(this, void 0, void 0, function () {
        var res, ami;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                case 1:
                    _a.sent();
                    ami = chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami;
                    return [4 /*yield*/, ami.postAction({
                            "action": "GetVar",
                            "variable": "DEVICE_STATE(PJSIP/358880032664586)"
                        })];
                case 2:
                    res = _a.sent();
                    console.log({ res: res });
                    return [4 /*yield*/, ami.postAction({
                            "action": "GetVar",
                            "variable": "PRESENCE_STATE(PJSIP/358880032664586,value)"
                        })];
                case 3:
                    res = _a.sent();
                    console.log({ res: res });
                    return [4 /*yield*/, ami.postAction({
                            "action": "GetVar",
                            "variable": "PRESENCE_STATE(PJSIP/358880032664586,subtype)"
                        })];
                case 4:
                    res = _a.sent();
                    console.log({ res: res });
                    return [4 /*yield*/, ami.postAction({
                            "action": "GetVar",
                            "variable": "PRESENCE_STATE(PJSIP/358880032664586,message)"
                        })];
                case 5:
                    res = _a.sent();
                    console.log({ res: res });
                    return [2 /*return*/];
            }
        });
    });
});
//# sourceMappingURL=main.js.map