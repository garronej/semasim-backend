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
var apiOverSip = require("./sipApiFramework");
var endpointsContacts_1 = require("./endpointsContacts");
var firebase = require("./firebaseFunctions");
var outboundSipProxy_1 = require("./outboundSipProxy");
var inboundSipProxy_1 = require("./inboundSipProxy");
var inboundApi = require("./inboundSipApi");
var _debug = require("debug");
var debug = _debug("_outboundSipApi");
function startListening(deviceSocket) {
    var _this = this;
    var evt = apiOverSip.startListening(deviceSocket);
    evt.attach(function (_a) {
        var method = _a.method, payload = _a.payload, sendResponse = _a.sendResponse;
        return __awaiter(_this, void 0, void 0, function () {
            var response, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        response = {};
                        _a = method;
                        switch (_a) {
                            case claimDongle.methodName: return [3 /*break*/, 1];
                            case wakeUpUserAgent.methodName: return [3 /*break*/, 3];
                        }
                        return [3 /*break*/, 5];
                    case 1: return [4 /*yield*/, claimDongle.handle(payload, deviceSocket)];
                    case 2:
                        response = _b.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, wakeUpUserAgent.handle(payload)];
                    case 4:
                        response = _b.sent();
                        return [3 /*break*/, 5];
                    case 5:
                        sendResponse(response);
                        return [2 /*return*/];
                }
            });
        });
    });
}
exports.startListening = startListening;
var claimDongle;
(function (claimDongle) {
    claimDongle.methodName = "claimDongle";
    function handle(_a, newDeviceSocket) {
        var imei = _a.imei;
        return __awaiter(this, void 0, void 0, function () {
            var oldDeviceSocket, oldResp, newResp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        oldDeviceSocket = outboundSipProxy_1.deviceSockets.get(imei);
                        if (!oldDeviceSocket) {
                            outboundSipProxy_1.deviceSockets.add(imei, newDeviceSocket);
                            return [2 /*return*/, { "isGranted": true }];
                        }
                        if (oldDeviceSocket === newDeviceSocket) {
                            return [2 /*return*/, { "isGranted": true }];
                        }
                        return [4 /*yield*/, inboundApi.isDongleConnected.run(oldDeviceSocket, imei)];
                    case 1:
                        oldResp = _a.sent();
                        if (oldResp.isConnected) {
                            debug("Attack attempt, we refuse to associate socket to this dongle");
                            return [2 /*return*/, { "isGranted": false }];
                        }
                        return [4 /*yield*/, inboundApi.isDongleConnected.run(newDeviceSocket, imei)];
                    case 2:
                        newResp = _a.sent();
                        if (newResp.isConnected) {
                            outboundSipProxy_1.deviceSockets.add(imei, newDeviceSocket);
                            return [2 /*return*/, { "isGranted": true }];
                        }
                        if (newResp.lastConnectionTimestamp > oldResp.lastConnectionTimestamp) {
                            outboundSipProxy_1.deviceSockets.add(imei, newDeviceSocket);
                            return [2 /*return*/, { "isGranted": true }];
                        }
                        return [2 /*return*/, { "isGranted": false }];
                }
            });
        });
    }
    claimDongle.handle = handle;
    function run(imei) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, isGranted, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        payload = { imei: imei };
                        _b = (_a = apiOverSip).sendRequest;
                        return [4 /*yield*/, inboundSipProxy_1.getProxySocket()];
                    case 1: return [4 /*yield*/, _b.apply(_a, [_c.sent(), claimDongle.methodName, payload])];
                    case 2:
                        isGranted = (_c.sent()).isGranted;
                        return [2 /*return*/, isGranted];
                }
            });
        });
    }
    claimDongle.run = run;
})(claimDongle = exports.claimDongle || (exports.claimDongle = {}));
var wakeUpUserAgent;
(function (wakeUpUserAgent) {
    wakeUpUserAgent.methodName = "wakeUpUserAgent";
    function handle(_a) {
        var contactOrContactUri = _a.contactOrContactUri;
        return __awaiter(this, void 0, void 0, function () {
            var contact, reached, _a, pushType, pushToken, _b, response, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        debug("wakeUpUserAgent");
                        if (!(typeof contactOrContactUri !== "string")) return [3 /*break*/, 2];
                        contact = contactOrContactUri;
                        return [4 /*yield*/, outboundSipProxy_1.qualifyContact(contact)];
                    case 1:
                        reached = _c.sent();
                        if (reached) {
                            debug("Directly reachable");
                            return [2 /*return*/, { "status": "REACHABLE" }];
                        }
                        _c.label = 2;
                    case 2:
                        _a = endpointsContacts_1.Contact.readPushInfos(contactOrContactUri), pushType = _a.pushType, pushToken = _a.pushToken;
                        _b = pushType;
                        switch (_b) {
                            case "google": return [3 /*break*/, 3];
                            case "firebase": return [3 /*break*/, 3];
                        }
                        return [3 /*break*/, 6];
                    case 3:
                        _c.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, firebase.wakeUpDevice(pushToken)];
                    case 4:
                        response = _c.sent();
                        debug({ response: response });
                        return [2 /*return*/, { "status": "PUSH_NOTIFICATION_SENT" }];
                    case 5:
                        error_1 = _c.sent();
                        debug("Error firebase", error_1);
                        return [2 /*return*/, { "status": "UNREACHABLE" }];
                    case 6:
                        debug("Can't send push notification for this contact");
                        return [2 /*return*/, { "status": "UNREACHABLE" }];
                }
            });
        });
    }
    wakeUpUserAgent.handle = handle;
    function run(contactOrContactUri) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, status, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        debug("Run wakeUpUserAgent");
                        payload = { contactOrContactUri: contactOrContactUri };
                        _b = (_a = apiOverSip).sendRequest;
                        return [4 /*yield*/, inboundSipProxy_1.getProxySocket()];
                    case 1: return [4 /*yield*/, _b.apply(_a, [_c.sent(), wakeUpUserAgent.methodName, payload])];
                    case 2:
                        status = (_c.sent()).status;
                        debug("Status: " + status);
                        return [2 /*return*/, status];
                }
            });
        });
    }
    wakeUpUserAgent.run = run;
})(wakeUpUserAgent = exports.wakeUpUserAgent || (exports.wakeUpUserAgent = {}));
