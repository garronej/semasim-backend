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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var semasim_gateway_1 = require("../semasim-gateway");
var apiDeclaration = semasim_gateway_1.sipApi.backendDeclaration;
var protocol = semasim_gateway_1.sipApi.protocol;
var sipProxy = require("./sipProxy");
var db = require("./db");
var utils = require("./utils");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var sipApiGateway = require("./sipApiGatewayClientImplementation");
var _debug = require("debug");
var debug = _debug("_sipApiBackendServerImplementation");
var handlers = {};
var sanityChecks = {};
var server = new protocol.Server(handlers, sanityChecks);
function startListening(gatewaySocket) {
    gatewaySocket.misc["evtNewActiveDongle"] = new ts_events_extended_1.SyncEvent();
    server.startListening(gatewaySocket);
}
exports.startListening = startListening;
function getEvtNewActiveDongle(gatewaySocket) {
    return gatewaySocket.misc["evtNewActiveDongle"];
}
exports.getEvtNewActiveDongle = getEvtNewActiveDongle;
(function () {
    var methodName = apiDeclaration.notifySimOnline.methodName;
    sanityChecks[methodName] = function (params) { return (params instanceof Object &&
        chan_dongle_extended_client_1.DongleController.isImsiWellFormed(params.imsi) && (params.isVoiceEnabled === undefined ||
        typeof params.isVoiceEnabled === "boolean") &&
        typeof params.storageDigest === "string" &&
        typeof params.password === "string"); };
    handlers[methodName] = function (params, fromSocket) { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        var imsi, isVoiceEnabled, storageDigest, password, currentSocket, setOnlineFeedback, evtNewActiveDongle, isStorageUpToDate;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    imsi = params.imsi, isVoiceEnabled = params.isVoiceEnabled, storageDigest = params.storageDigest, password = params.password;
                    currentSocket = sipProxy.gatewaySockets.getSimRoute(imsi);
                    if (currentSocket) {
                        if (currentSocket !== fromSocket) {
                            throw new Error("Hacked gateway");
                        }
                    }
                    else {
                        sipProxy.gatewaySockets.setSimRoute(fromSocket, imsi);
                    }
                    return [4 /*yield*/, db.setSimOnline(imsi, password, isVoiceEnabled)];
                case 1:
                    setOnlineFeedback = _a.sent();
                    evtNewActiveDongle = getEvtNewActiveDongle(fromSocket);
                    if (evtNewActiveDongle.getHandlers.length) {
                        (function () { return __awaiter(_this, void 0, void 0, function () {
                            var dongle, _a, _b, _c, _d, _e;
                            return __generator(this, function (_f) {
                                switch (_f.label) {
                                    case 0: return [4 /*yield*/, sipApiGateway.getDongles(fromSocket)];
                                    case 1:
                                        dongle = (_f.sent())
                                            .find(function (dongle) { return (chan_dongle_extended_client_1.DongleController.ActiveDongle.match(dongle) &&
                                            dongle.sim.imsi === imsi); });
                                        if (!dongle) return [3 /*break*/, 5];
                                        _b = (_a = evtNewActiveDongle).post;
                                        _c = {
                                            dongle: dongle
                                        };
                                        _d = "simOwner";
                                        if (!setOnlineFeedback.isSimRegistered) return [3 /*break*/, 3];
                                        return [4 /*yield*/, db.getSimOwner(imsi)];
                                    case 2:
                                        _e = (_f.sent());
                                        return [3 /*break*/, 4];
                                    case 3:
                                        _e = undefined;
                                        _f.label = 4;
                                    case 4:
                                        _b.apply(_a, [(_c[_d] = _e,
                                                _c)]);
                                        _f.label = 5;
                                    case 5: return [2 /*return*/];
                                }
                            });
                        }); })();
                    }
                    if (!setOnlineFeedback.isSimRegistered) {
                        utils.simPassword.store(fromSocket, imsi, password);
                        return [2 /*return*/, { "status": "NOT REGISTERED" }];
                    }
                    if (setOnlineFeedback.passwordStatus === "NEED RENEWAL") {
                        return [2 /*return*/, {
                                "status": "NEED PASSWORD RENEWAL",
                                "allowedUas": setOnlineFeedback.uasRegisteredToSim
                            }];
                    }
                    if (setOnlineFeedback.storageDigest === storageDigest) {
                        isStorageUpToDate = true;
                    }
                    else {
                        isStorageUpToDate = false;
                        //TODO: sync SIM storage
                    }
                    return [4 /*yield*/, utils.sendPushNotification.toUas(setOnlineFeedback.uasRegisteredToSim, (!isStorageUpToDate ||
                            setOnlineFeedback.passwordStatus === "RENEWED") ? "RELOAD CONFIG" : undefined)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { "status": "OK" }];
            }
        });
    }); };
})();
(function () {
    var methodName = apiDeclaration.notifySimOffline.methodName;
    sanityChecks[methodName] = function (params) { return (params instanceof Object &&
        chan_dongle_extended_client_1.DongleController.isImsiWellFormed(params.imsi)); };
    handlers[methodName] = function (params, fromSocket) { return __awaiter(_this, void 0, void 0, function () {
        var imsi, currentSocket;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    imsi = params.imsi;
                    currentSocket = sipProxy.gatewaySockets.getSimRoute(imsi);
                    if (!currentSocket || currentSocket !== fromSocket) {
                        throw new Error("Hacked Client");
                    }
                    sipProxy.gatewaySockets.removeSimRoute(imsi);
                    return [4 /*yield*/, db.setSimOffline(imsi)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
})();
//TODO: this should be handled on client connection
(function () {
    var methodName = apiDeclaration.notifyNewOrUpdatedUa.methodName;
    sanityChecks[methodName] = function (params) {
        return semasim_gateway_1.Contact.UaSim.Ua.sanityCheck(params);
    };
    handlers[methodName] = function (params, fromSocket) { return __awaiter(_this, void 0, void 0, function () {
        var ua;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ua = params;
                    return [4 /*yield*/, db.addOrUpdateUa(ua)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    var methodName = apiDeclaration.wakeUpContact.methodName;
    sanityChecks[methodName] = function (params) { return (params instanceof Object &&
        semasim_gateway_1.Contact.sanityCheck(params.contact)); };
    handlers[methodName] = function (params, fromSocket) { return __awaiter(_this, void 0, void 0, function () {
        var contact, _a, prReached, reachableWithoutPush, prIsSendPushSuccess;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    contact = params.contact;
                    _a = contact.uaSim.ua.platform;
                    switch (_a) {
                        case "iOS": return [3 /*break*/, 1];
                        case "android": return [3 /*break*/, 6];
                        case "other": return [3 /*break*/, 10];
                    }
                    return [3 /*break*/, 12];
                case 1:
                    prReached = utils.qualifyContact(contact);
                    return [4 /*yield*/, Promise.race([
                            new Promise(function (resolve) { return setTimeout(function () { return resolve(false); }, 750); }),
                            prReached
                        ])];
                case 2:
                    reachableWithoutPush = _b.sent();
                    if (reachableWithoutPush) {
                        return [2 /*return*/, "REACHABLE"];
                    }
                    prIsSendPushSuccess = utils.sendPushNotification(contact.uaSim.ua);
                    return [4 /*yield*/, prReached];
                case 3:
                    if (!_b.sent()) return [3 /*break*/, 4];
                    return [2 /*return*/, "REACHABLE"];
                case 4: return [4 /*yield*/, prIsSendPushSuccess];
                case 5: return [2 /*return*/, (_b.sent()) ?
                        "PUSH_NOTIFICATION_SENT" : "UNREACHABLE"];
                case 6: return [4 /*yield*/, utils.qualifyContact(contact)];
                case 7:
                    if (!_b.sent()) return [3 /*break*/, 8];
                    return [2 /*return*/, "REACHABLE"];
                case 8: return [4 /*yield*/, utils.sendPushNotification(contact.uaSim.ua)];
                case 9: return [2 /*return*/, (_b.sent()) ?
                        "PUSH_NOTIFICATION_SENT" : "UNREACHABLE"];
                case 10: return [4 /*yield*/, utils.qualifyContact(contact)];
                case 11: return [2 /*return*/, (_b.sent()) ?
                        "REACHABLE" : "UNREACHABLE"];
                case 12: return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    var methodName = apiDeclaration.forceContactToReRegister.methodName;
    sanityChecks[methodName] = function (params) { return (params instanceof Object &&
        semasim_gateway_1.Contact.sanityCheck(params.contact)); };
    handlers[methodName] = function (params, fromSocket) { return __awaiter(_this, void 0, void 0, function () {
        var contact, clientSocket;
        return __generator(this, function (_a) {
            contact = params.contact;
            if (contact.uaSim.ua.platform !== "android") {
                clientSocket = sipProxy.clientSockets.get(contact.connectionId);
                if (clientSocket) {
                    clientSocket.destroy();
                }
            }
            return [2 /*return*/, utils.sendPushNotification(contact.uaSim.ua)];
        });
    }); };
})();
