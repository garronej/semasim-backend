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
var semasim_gateway_1 = require("../semasim-gateway");
var firebaseFunctions = require("../tools/firebaseFunctions");
var sipProxy_1 = require("./sipProxy");
var _constants_1 = require("./_constants");
require("colors");
var _debug = require("debug");
var debug = _debug("_sipApi");
function startListening(gatewaySocket) {
    var _this = this;
    firebaseFunctions.init(_constants_1.c.serviceAccount);
    semasim_gateway_1.sipApiFramework.startListening(gatewaySocket).attach(function (_a) {
        var method = _a.method, params = _a.params, sendResponse = _a.sendResponse;
        return __awaiter(_this, void 0, void 0, function () {
            var response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        debug(method + ": params: " + JSON.stringify(params) + "...");
                        return [4 /*yield*/, handlers[method](params, gatewaySocket)];
                    case 1:
                        response = _a.sent();
                        debug("..." + method + ": response: " + JSON.stringify(response));
                        sendResponse(response);
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        debug(("Unexpected error: " + error_1.message).red);
                        gatewaySocket.destroy();
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    });
}
exports.startListening = startListening;
var handlers = {};
(function () {
    var methodName = semasim_gateway_1.sipApiClientBackend.claimDongle.methodName;
    handlers[methodName] = function (params, gatewaySocket) { return __awaiter(_this, void 0, void 0, function () {
        var imei, candidateGatewaySocket, currentGatewaySocket, currentResp, error_2, candidateResp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    imei = params.imei;
                    candidateGatewaySocket = gatewaySocket;
                    currentGatewaySocket = sipProxy_1.gatewaySockets.get(imei);
                    if (!currentGatewaySocket) {
                        sipProxy_1.gatewaySockets.set(imei, candidateGatewaySocket);
                        return [2 /*return*/, { "isGranted": true }];
                    }
                    if (currentGatewaySocket === candidateGatewaySocket) {
                        return [2 /*return*/, { "isGranted": true }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, semasim_gateway_1.sipApiClientGateway.isDongleConnected.makeCall(currentGatewaySocket, imei)];
                case 2:
                    currentResp = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    debug("Gateway did not behave the way it is supposed to".red);
                    return [2 /*return*/, { "isGranted": true }];
                case 4:
                    if (currentResp.isConnected) {
                        debug("Attack attempt, we refuse to associate socket to this dongle".red);
                        return [2 /*return*/, { "isGranted": false }];
                    }
                    return [4 /*yield*/, semasim_gateway_1.sipApiClientGateway.isDongleConnected.makeCall(candidateGatewaySocket, imei)];
                case 5:
                    candidateResp = _a.sent();
                    if (candidateResp.isConnected) {
                        sipProxy_1.gatewaySockets.set(imei, candidateGatewaySocket);
                        return [2 /*return*/, { "isGranted": true }];
                    }
                    if (candidateResp.lastConnectionTimestamp > currentResp.lastConnectionTimestamp) {
                        sipProxy_1.gatewaySockets.set(imei, candidateGatewaySocket);
                        return [2 /*return*/, { "isGranted": true }];
                    }
                    return [2 /*return*/, { "isGranted": false }];
            }
        });
    }); };
})();
(function () {
    var methodName = semasim_gateway_1.sipApiClientBackend.wakeUpUserAgent.methodName;
    handlers[methodName] = function (params, gatewaySocket) { return __awaiter(_this, void 0, void 0, function () {
        var contact, reached, isSuccess;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contact = params.contact;
                    return [4 /*yield*/, qualifyContact(contact)];
                case 1:
                    reached = _a.sent();
                    if (reached)
                        return [2 /*return*/, { "status": "REACHABLE" }];
                    return [4 /*yield*/, sendPushNotification(contact)];
                case 2:
                    isSuccess = _a.sent();
                    return [2 /*return*/, { "status": isSuccess ? "PUSH_NOTIFICATION_SENT" : "UNREACHABLE" }];
            }
        });
    }); };
})();
(function () {
    var methodName = semasim_gateway_1.sipApiClientBackend.forceReRegister.methodName;
    handlers[methodName] = function (params, gatewaySocket) { return __awaiter(_this, void 0, void 0, function () {
        var contact, isPushNotificationSent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contact = params.contact;
                    return [4 /*yield*/, sendPushNotification(contact)];
                case 1:
                    isPushNotificationSent = _a.sent();
                    return [2 /*return*/, { isPushNotificationSent: isPushNotificationSent }];
            }
        });
    }); };
})();
var qualifyPending = new Map();
qualifyPending.set = function set(connectionId, promiseResult) {
    var self = this;
    promiseResult.then(function () { return self.delete(connectionId); });
    return Map.prototype.set.call(self, connectionId, promiseResult);
};
//TODO: May throw error!
function qualifyContact(contact, timeout) {
    var _this = this;
    if (timeout === void 0) { timeout = 2000; }
    var connectionId = sipProxy_1.parseFlowToken(contact.flowToken).connectionId;
    var promiseResult = qualifyPending.get(connectionId);
    if (promiseResult)
        return promiseResult;
    promiseResult = (function () { return __awaiter(_this, void 0, void 0, function () {
        var clientSocket, fromTag, callId, cSeqSequenceNumber, sipRequest, branch, sipResponse, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    clientSocket = sipProxy_1.clientSockets.get(connectionId);
                    if (!clientSocket) {
                        debug("no client socket to qualify");
                        return [2 /*return*/, false];
                    }
                    fromTag = "794ee9eb-" + Date.now();
                    callId = "138ce538-" + Date.now();
                    cSeqSequenceNumber = Math.floor(Math.random() * 2000);
                    sipRequest = semasim_gateway_1.sipLibrary.parse([
                        "OPTIONS " + contact.ps.uri + " SIP/2.0",
                        "From: <sip:" + contact.ps.endpoint + "@" + _constants_1.c.shared.domain + ">;tag=" + fromTag,
                        "To: <" + contact.ps.uri + ">",
                        "Call-ID: " + callId,
                        "CSeq: " + cSeqSequenceNumber + " OPTIONS",
                        "Supported: path",
                        "Max-Forwards: 70",
                        "User-Agent: Semasim-backend",
                        "Content-Length:  0",
                        "\r\n"
                    ].join("\r\n"));
                    //TODO: should be set to [] already :(
                    sipRequest.headers.via = [];
                    branch = clientSocket.addViaHeader(sipRequest);
                    debug(("(backend) " + sipRequest.method + " " + contact.ps.endpoint).blue);
                    clientSocket.write(sipRequest);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, clientSocket.evtResponse.waitForExtract(function (_a) {
                            var headers = _a.headers;
                            return headers.via[0].params["branch"] === branch;
                        }, timeout)];
                case 2:
                    sipResponse = _a.sent();
                    debug(("(client " + connectionId + "): " + sipResponse.status + " " + sipResponse.reason + " for qualify " + contact.ps.endpoint).yellow);
                    return [2 /*return*/, true];
                case 3:
                    error_3 = _a.sent();
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    }); })();
    qualifyPending.set(connectionId, promiseResult);
    return promiseResult;
}
exports.qualifyContact = qualifyContact;
var pushPending = new Map();
pushPending.set = function set(key, promiseResult) {
    var self = this;
    setTimeout(function () { return self.delete(key); }, 4000);
    return Map.prototype.set.call(self, key, promiseResult);
};
function sendPushNotification(contact) {
    var _this = this;
    var key = JSON.stringify(contact.pushInfos);
    var promiseResult = pushPending.get(key);
    if (promiseResult) {
        debug("use cache");
        return promiseResult;
    }
    promiseResult = (function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, pushType, pushToken, _b, error_4;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = contact.pushInfos, pushType = _a.pushType, pushToken = _a.pushToken;
                    _b = pushType;
                    switch (_b) {
                        case "google": return [3 /*break*/, 1];
                        case "firebase": return [3 /*break*/, 1];
                    }
                    return [3 /*break*/, 4];
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firebaseFunctions.sendPushNotification(pushToken)];
                case 2:
                    _c.sent();
                    return [2 /*return*/, true];
                case 3:
                    error_4 = _c.sent();
                    debug(("Error firebase " + error_4.message).red);
                    return [2 /*return*/, false];
                case 4:
                    debug(("Can't send push notification for this contact " + contact.pretty).red);
                    return [2 /*return*/, false];
            }
        });
    }); })();
    pushPending.set(key, promiseResult);
    return promiseResult;
}
