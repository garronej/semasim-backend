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
var admin = require("./admin");
var agi = require("./agi");
var inbound = require("./sipProxy/inbound");
var _debug = require("debug");
var debug = _debug("_main");
debug("Started !!");
//TODO: every call to dongleExtendedClient may throw error.
var scripts = {};
var phoneNumberAsteriskExtensionPattern = "_[+0-9].";
scripts[admin.callContext] = {};
scripts[admin.callContext][phoneNumberAsteriskExtensionPattern] = fromSip.call;
scripts[fromDongle.context] = {};
scripts[fromDongle.context][phoneNumberAsteriskExtensionPattern] = fromDongle.call;
agi.startServer(scripts);
var dongleClient = chan_dongle_extended_client_1.DongleExtendedClient.localhost();
dongleClient.evtNewMessage.attach(function (_a) {
    var imei = _a.imei, message = __rest(_a, ["imei"]);
    return fromDongle.sms(imei, message);
});
var dongleEvtHandlers = {
    "onActiveDongleDisconnect": function (imei) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("onDongleDisconnect", { imei: imei });
                    return [4 /*yield*/, admin.setDevicePresence(imei, "ONHOLD")];
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
                    debug("onNewActiveDongle");
                    return [4 /*yield*/, admin.setDevicePresence(imei, "NOT_INUSE")];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, initEndpoint(imei, true)];
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
                    debug("onRequestUnlockCode");
                    return [4 /*yield*/, admin.setDevicePresence(imei, "UNAVAILABLE")];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, initEndpoint(imei, true)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }
};
function initEndpoint(endpoint, isDongleConnected) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, admin.enableDevicePresenceNotification(endpoint)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, admin.addOrUpdateEndpoint(endpoint, isDongleConnected)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
(function findConnectedDongles() {
    return __awaiter(this, void 0, void 0, function () {
        var activeDongles, lockedDongles, knownDisconnectedDongles, activeDongles_1, activeDongles_1_1, imei, lockedDongles_1, lockedDongles_1_1, imei, knownDisconnectedDongles_1, knownDisconnectedDongles_1_1, imei, e_1, _a, e_2, _b, e_3, _c;
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
                    return [4 /*yield*/, admin.queryEndpoints()];
                case 3:
                    knownDisconnectedDongles = (_d.sent())
                        .map(function (_a) {
                        var endpoint = _a.endpoint;
                        return endpoint;
                    })
                        .filter(function (imei) {
                        return __spread(activeDongles, lockedDongles).indexOf(imei) < 0;
                    });
                    debug({ activeDongles: activeDongles, lockedDongles: lockedDongles, knownDisconnectedDongles: knownDisconnectedDongles });
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
                        for (knownDisconnectedDongles_1 = __values(knownDisconnectedDongles), knownDisconnectedDongles_1_1 = knownDisconnectedDongles_1.next(); !knownDisconnectedDongles_1_1.done; knownDisconnectedDongles_1_1 = knownDisconnectedDongles_1.next()) {
                            imei = knownDisconnectedDongles_1_1.value;
                            initEndpoint(imei, false);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (knownDisconnectedDongles_1_1 && !knownDisconnectedDongles_1_1.done && (_c = knownDisconnectedDongles_1.return)) _c.call(knownDisconnectedDongles_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    return [2 /*return*/];
            }
        });
    });
})();
dongleClient.evtActiveDongleDisconnect.attach(function (_a) {
    var imei = _a.imei;
    return dongleEvtHandlers.onActiveDongleDisconnect(imei);
});
dongleClient.evtNewActiveDongle.attach(function (_a) {
    var imei = _a.imei;
    return dongleEvtHandlers.onNewActiveDongle(imei);
});
dongleClient.evtRequestUnlockCode.attach(function (_a) {
    var imei = _a.imei;
    return dongleEvtHandlers.onRequestUnlockCode(imei);
});
admin.getEvtNewContact().attach(function (contact) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        //TODO Send message in stack and request pin if dongle is locked
        debug("New contact", contact);
        return [2 /*return*/];
    });
}); });
(function initVoidDialplanForMessage() {
    return __awaiter(this, void 0, void 0, function () {
        var ami, matchAllExt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ami = chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami;
                    matchAllExt = "_.";
                    return [4 /*yield*/, ami.dialplanExtensionRemove(matchAllExt, admin.messageContext)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, ami.dialplanExtensionAdd(admin.messageContext, matchAllExt, 1, "Hangup")];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
})();
admin.truncateContacts().then(function () { return inbound.start(); });
//pjsip.truncateContacts();
admin.evtMessage.attach(function (_a) {
    var contact = _a.contact, message = _a.message;
    return fromSip.message(contact, message);
});
