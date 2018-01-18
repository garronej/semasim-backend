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
exports.__esModule = true;
var api_1 = require("../../../api");
var Types = api_1.declaration.Types;
var bootbox = global["bootbox"];
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b, dongle, e_1_1, e_1, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 6, 7, 8]);
                    return [4 /*yield*/, api_1.client.getUnregisteredLanDongles()];
                case 1:
                    _a = __values.apply(void 0, [_d.sent()]), _b = _a.next();
                    _d.label = 2;
                case 2:
                    if (!!_b.done) return [3 /*break*/, 5];
                    dongle = _b.value;
                    return [4 /*yield*/, interact(dongle)];
                case 3:
                    _d.sent();
                    _d.label = 4;
                case 4:
                    _b = _a.next();
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 8];
                case 6:
                    e_1_1 = _d.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 8];
                case 7:
                    try {
                        if (_b && !_b.done && (_c = _a["return"])) _c.call(_a);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    });
}
exports.start = start;
function interact(dongle) {
    return __awaiter(this, void 0, void 0, function () {
        var shouldAdd, unlockResultValidPin, _loop_1, state_1, sure_1, friendlyName, friendlyNameSubmitted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new Promise(function (resolve) { return bootbox.dialog({
                        "title": "SIM ready to be registered",
                        "message": [
                            "Dongle IMEI: " + dongle.imei,
                            "( number printed on the 3G key )",
                            "SIM ICCID: " + dongle.sim.iccid,
                            "( number printed on the sim )<br>",
                        ].join("<br>"),
                        "buttons": {
                            "cancel": {
                                "label": "Not now",
                                "callback": function () { return resolve(false); }
                            },
                            "success": {
                                "label": "Yes, register this sim",
                                "className": "btn-success",
                                "callback": function () { return resolve(true); }
                            }
                        },
                        "closeButton": false
                    }); })];
                case 1:
                    shouldAdd = _a.sent();
                    if (!shouldAdd)
                        return [2 /*return*/, undefined];
                    if (!Types.LockedDongle.match(dongle)) return [3 /*break*/, 5];
                    unlockResultValidPin = void 0;
                    _loop_1 = function () {
                        var tryLeft, pin, shouldContinue, unlockResult;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (dongle.sim.pinState !== "SIM PIN") {
                                        bootbox.alert(dongle.sim.pinState + " require manual unlock");
                                        return [2 /*return*/, { value: undefined }];
                                    }
                                    tryLeft = dongle.sim.tryLeft;
                                    return [4 /*yield*/, new Promise(function (resolve) { return bootbox.prompt({
                                            "title": "PIN code? (" + tryLeft + " tries left)",
                                            "inputType": "number",
                                            "callback": function (result) { return resolve(result); }
                                        }); })];
                                case 1:
                                    pin = _a.sent();
                                    if (pin === null)
                                        return [2 /*return*/, { value: undefined }];
                                    if (!!pin.match(/^[0-9]{4}$/)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, new Promise(function (resolve) { return bootbox.confirm({
                                            "title": "PIN malformed!",
                                            "message": "A pin code is composed of 4 digits, e.g. 0000",
                                            callback: function (result) { return resolve(result); }
                                        }); })];
                                case 2:
                                    shouldContinue = _a.sent();
                                    if (!shouldContinue)
                                        return [2 /*return*/, { value: undefined }];
                                    return [2 /*return*/, "continue"];
                                case 3: return [4 /*yield*/, api_1.client.unlockSim(dongle.imei, pin)];
                                case 4:
                                    unlockResult = _a.sent();
                                    if (!unlockResult.wasPinValid) {
                                        dongle.sim.pinState = unlockResult.pinState;
                                        dongle.sim.tryLeft = unlockResult.tryLeft;
                                        return [2 /*return*/, "continue"];
                                    }
                                    unlockResultValidPin = unlockResult;
                                    return [2 /*return*/, "break"];
                            }
                        });
                    };
                    _a.label = 2;
                case 2:
                    if (!true) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1()];
                case 3:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    if (state_1 === "break")
                        return [3 /*break*/, 4];
                    return [3 /*break*/, 2];
                case 4:
                    if (!unlockResultValidPin.isSimRegisterable) {
                        if (unlockResultValidPin.simRegisteredBy.who === "MYSELF") {
                            bootbox.alert([
                                "Unlock success. You already have registered this SIM,",
                                " it just needed to be unlock again"
                            ].join(""));
                        }
                        else {
                            bootbox.alert([
                                "Unlock success, the SIM is currently registered ",
                                "by account: " + unlockResultValidPin.simRegisteredBy.email
                            ].join(""));
                        }
                        return [2 /*return*/, undefined];
                    }
                    dongle = unlockResultValidPin.dongle;
                    _a.label = 5;
                case 5:
                    if (!(dongle.isVoiceEnabled !== true)) return [3 /*break*/, 7];
                    sure_1 = dongle.isVoiceEnabled === false;
                    return [4 /*yield*/, new Promise(function (resolve) { return bootbox.alert([
                            "Bad luck :(",
                            "Voice is " + (sure_1 ? "" : "( maybe )") + " not enabled on the 3G Key you are using with this SIM.",
                            "As as a result you " + (sure_1 ? "will" : "may") + " not be able to place phones calls " + (sure_1 ? "(try and see for yourself)" : "") + ".",
                            "Chances are voice can be enabled on your HUAWEI dongle with dc-unlocker",
                            "Go to www.dc-unlocker.com and download dc-unlocker client (windows)",
                            "Connect your 3G key to your PC and try to get dc-unlocker to detect it",
                            "once your manage to get your dongle detected by the software go to",
                            "unlocking -> Activate Voice",
                            "They will make you pay 4€ to process...",
                            "We are currently trying to implement this ourself so you dont have to pay",
                            "for that but so far this is the only option.",
                            "",
                            "Dongle IMEI: " + dongle.imei
                        ].join("<br>"), function () { return resolve(); }); })];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [4 /*yield*/, getDefaultFriendlyName()];
                case 8:
                    friendlyName = _a.sent();
                    return [4 /*yield*/, new Promise(function (resolve) { return bootbox.prompt({
                            "title": "Friendly name for this sim?",
                            "value": friendlyName,
                            "callback": function (result) { return resolve(result); }
                        }); })];
                case 9:
                    friendlyNameSubmitted = _a.sent();
                    if (friendlyNameSubmitted) {
                        friendlyName = friendlyNameSubmitted;
                    }
                    return [4 /*yield*/, api_1.client.registerSim(dongle.sim.imsi, friendlyName)];
                case 10:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.interact = interact;
function getDefaultFriendlyName() {
    return __awaiter(this, void 0, void 0, function () {
        var build, i, usableUserSims;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    build = function (i) { return "SIM " + i; };
                    i = 1;
                    return [4 /*yield*/, api_1.client.getSims()];
                case 1:
                    usableUserSims = (_a.sent()).filter(function (userSim) { return Types.UserSim.Usable.match(userSim); });
                    while (usableUserSims.find(function (_a) {
                        var friendlyName = _a.friendlyName;
                        return friendlyName === build(i);
                    })) {
                        i++;
                    }
                    return [2 /*return*/, build(i)];
            }
        });
    });
}
