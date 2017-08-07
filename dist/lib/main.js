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
debug("Started !");
//TODO: every call to dongleExtendedClient may throw error.
var scripts = {};
var phoneNumberAsteriskExtensionPattern = "_[+0-9].";
scripts[admin.callContext] = {};
scripts[admin.callContext][phoneNumberAsteriskExtensionPattern] = fromSip.call;
scripts[fromDongle.context] = {};
scripts[fromDongle.context][phoneNumberAsteriskExtensionPattern] = fromDongle.call;
agi.startServer(scripts);
var dongleClient = chan_dongle_extended_client_1.DongleExtendedClient.localhost();
function onNewActiveDongle(dongle) {
    return __awaiter(this, void 0, void 0, function () {
        var password;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("onNewActiveDongle", dongle);
                    return [4 /*yield*/, admin.setDevicePresence(dongle.imei, "NOT_INUSE")];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, admin.enableDevicePresenceNotification(dongle.imei)];
                case 2:
                    _a.sent();
                    password = dongle.iccid.substring(dongle.iccid.length - 4);
                    return [4 /*yield*/, admin.dbAsterisk.addOrUpdateEndpoint(dongle.imei, password)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
(function findActiveDongle() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b, activeDongle, e_1_1, e_1, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 5, 6, 7]);
                    return [4 /*yield*/, dongleClient.getActiveDongles()];
                case 1:
                    _a = __values.apply(void 0, [_d.sent()]), _b = _a.next();
                    _d.label = 2;
                case 2:
                    if (!!_b.done) return [3 /*break*/, 4];
                    activeDongle = _b.value;
                    onNewActiveDongle(activeDongle);
                    _d.label = 3;
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
                case 7: return [2 /*return*/];
            }
        });
    });
})();
dongleClient.evtNewActiveDongle.attach(onNewActiveDongle);
dongleClient.evtActiveDongleDisconnect.attach(function (dongle) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                debug("onDongleDisconnect", dongle);
                return [4 /*yield*/, admin.setDevicePresence(dongle.imei, "ONHOLD")];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
admin.getEvtNewContact().attach(function (contact) {
    debug("New contact", admin.Contact.pretty(contact));
});
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
inbound.start();
admin.evtMessage.attach(function (_a) {
    var contact = _a.contact, message = _a.message;
    return fromSip.message(contact, message);
});
dongleClient.evtNewMessage.attach(function (_a) {
    var imei = _a.imei, message = __rest(_a, ["imei"]);
    return fromDongle.sms(imei, message);
});
