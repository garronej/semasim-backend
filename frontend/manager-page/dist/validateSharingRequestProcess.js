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
var api_1 = require("../../api");
var Types = api_1.declaration.Types;
var bootbox = global["bootbox"];
/** return need reedReload */
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var userSims, usableUserSims, notConfirmedUserSims, _loop_1, notConfirmedUserSims_1, notConfirmedUserSims_1_1, notConfirmedUserSim, e_1_1, e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, api_1.client.getSims()];
                case 1:
                    userSims = _b.sent();
                    usableUserSims = userSims.filter(function (userSim) { return Types.UserSim.Usable.match(userSim); });
                    notConfirmedUserSims = userSims.filter(function (userSim) { return Types.UserSim.Shared.NotConfirmed.match(userSim); });
                    _loop_1 = function (notConfirmedUserSim) {
                        var friendlyNameBase, i, confirmedUserSim;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    friendlyNameBase = notConfirmedUserSim.friendlyName;
                                    i = 0;
                                    while (usableUserSims.find(function (_a) {
                                        var friendlyName = _a.friendlyName;
                                        return friendlyName === notConfirmedUserSim.friendlyName;
                                    })) {
                                        notConfirmedUserSim.friendlyName = friendlyNameBase + " (" + i++ + ")";
                                    }
                                    return [4 /*yield*/, interact(notConfirmedUserSim)];
                                case 1:
                                    confirmedUserSim = _a.sent();
                                    if (confirmedUserSim) {
                                        usableUserSims.push(confirmedUserSim);
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 7, 8, 9]);
                    notConfirmedUserSims_1 = __values(notConfirmedUserSims), notConfirmedUserSims_1_1 = notConfirmedUserSims_1.next();
                    _b.label = 3;
                case 3:
                    if (!!notConfirmedUserSims_1_1.done) return [3 /*break*/, 6];
                    notConfirmedUserSim = notConfirmedUserSims_1_1.value;
                    return [5 /*yield**/, _loop_1(notConfirmedUserSim)];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    notConfirmedUserSims_1_1 = notConfirmedUserSims_1.next();
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 9];
                case 7:
                    e_1_1 = _b.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 9];
                case 8:
                    try {
                        if (notConfirmedUserSims_1_1 && !notConfirmedUserSims_1_1.done && (_a = notConfirmedUserSims_1["return"])) _a.call(notConfirmedUserSims_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/, usableUserSims];
            }
        });
    });
}
exports.start = start;
function interact(userSim) {
    return __awaiter(this, void 0, void 0, function () {
        var shouldProceed, friendlyNameSubmitted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new Promise(function (resolve) { return bootbox.dialog({
                        "title": userSim.ownership.ownerEmail + " would like to share a SIM with you, accept?",
                        "message": userSim.ownership.sharingRequestMessage ?
                            "\u00AB" + userSim.ownership.sharingRequestMessage.replace(/\n/g, "<br>") + "\u00BB" : "",
                        "buttons": {
                            "cancel": {
                                "label": "Refuse",
                                "callback": function () { return resolve("REFUSE"); }
                            },
                            "success": {
                                "label": "Yes, use this SIM",
                                "className": "btn-success",
                                "callback": function () { return resolve("ACCEPT"); }
                            }
                        },
                        "onEscape": function () { return resolve("LATER"); }
                    }); })];
                case 1:
                    shouldProceed = _a.sent();
                    if (shouldProceed === "LATER") {
                        return [2 /*return*/, undefined];
                    }
                    if (!(shouldProceed === "REFUSE")) return [3 /*break*/, 3];
                    return [4 /*yield*/, api_1.client.unregisterSim(userSim.sim.imsi)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, undefined];
                case 3: return [4 /*yield*/, new Promise(function (resolve) { return bootbox.prompt({
                        "title": "Friendly name for this sim?",
                        "value": userSim.friendlyName,
                        "callback": function (result) { return resolve(result); }
                    }); })];
                case 4:
                    friendlyNameSubmitted = _a.sent();
                    if (friendlyNameSubmitted) {
                        userSim.friendlyName = friendlyNameSubmitted;
                    }
                    return [4 /*yield*/, api_1.client.setSimFriendlyName(userSim.sim.imsi, userSim.friendlyName)];
                case 5:
                    _a.sent();
                    return [2 /*return*/, {
                            "sim": userSim.sim,
                            "friendlyName": userSim.friendlyName,
                            "password": "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
                            "isVoiceEnabled": userSim.isVoiceEnabled,
                            "isOnline": userSim.isOnline,
                            "ownership": {
                                "status": "SHARED CONFIRMED",
                                "ownerEmail": userSim.ownership.ownerEmail
                            }
                        }];
            }
        });
    });
}
exports.interact = interact;
