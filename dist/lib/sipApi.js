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
var semasim_gateway_1 = require("../semasim-gateway");
var pushSender = require("../tools/pushSender");
var sipProxy_1 = require("./sipProxy");
var _constants_1 = require("./_constants");
require("colors");
var _debug = require("debug");
var debug = _debug("_sipApi");
function startListening(gatewaySocket) {
    var _this = this;
    semasim_gateway_1.sipApiFramework.startListening(gatewaySocket).attach(function (_a) {
        var method = _a.method, params = _a.params, sendResponse = _a.sendResponse;
        return __awaiter(_this, void 0, void 0, function () {
            var response, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        debug(method + ": params: " + JSON.stringify(params, null, 2) + "...");
                        return [4 /*yield*/, handlers[method](params, gatewaySocket)];
                    case 1:
                        response = _b.sent();
                        debug("..." + method + ": response: " + JSON.stringify(response, null, 2));
                        sendResponse(response);
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _b.sent();
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
/** Record methodName => handler */
var handlers = {};
(function () {
    var methodName = semasim_gateway_1.sipApiClientBackend.claimDongle.methodName;
    handlers[methodName] = function (params, gatewaySocket) {
        return __awaiter(this, void 0, void 0, function () {
            var imei, candidateGatewaySocket, currentGatewaySocket, grant, currentResp, _a, candidateResp, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        imei = params.imei;
                        candidateGatewaySocket = gatewaySocket;
                        currentGatewaySocket = sipProxy_1.gatewaySockets.get(imei);
                        grant = function () {
                            if (candidateGatewaySocket !== currentGatewaySocket) {
                                sipProxy_1.gatewaySockets.set(imei, candidateGatewaySocket);
                            }
                            return { "isGranted": true };
                        };
                        if (!currentGatewaySocket || currentGatewaySocket === candidateGatewaySocket) {
                            return [2 /*return*/, grant()];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, semasim_gateway_1.sipApiClientGateway.isDongleConnected.makeCall(currentGatewaySocket, imei)];
                    case 2:
                        currentResp = _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _c.sent();
                        debug("Current gateway did not respond. Grant access to candidate".red);
                        return [2 /*return*/, grant()];
                    case 4:
                        if (currentResp.isConnected) {
                            debug("Attempt to claim a dongle already connected elsewhere. Deny access".red);
                            return [2 /*return*/, { "isGranted": false }];
                        }
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, semasim_gateway_1.sipApiClientGateway.isDongleConnected.makeCall(candidateGatewaySocket, imei)];
                    case 6:
                        candidateResp = _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        _b = _c.sent();
                        debug("Candidate gateway did not behave the way it was supposed. Deny access".red);
                        return [2 /*return*/, { "isGranted": false }];
                    case 8:
                        if (candidateResp.isConnected) {
                            return [2 /*return*/, grant()];
                        }
                        if (candidateResp.lastConnection.getTime() > currentResp.lastConnection.getTime()) {
                            return [2 /*return*/, grant()];
                        }
                        else {
                            debug("Dongle has been more recently connected to the current socket. Deny access".red);
                            return [2 /*return*/, { "isGranted": false }];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
})();
(function () {
    var methodName = semasim_gateway_1.sipApiClientBackend.wakeUpContact.methodName;
    handlers[methodName] = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var contact, platform, isReachable, pushToken, _a, prReached, reachableWithoutPush, prIsSendPushSuccess, reachable, _b, _c, reached, isSendPushSuccess;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        contact = params.contact;
                        platform = figureOutPushPlatform(contact.uaEndpoint.ua.pushToken);
                        if (!!platform) return [3 /*break*/, 2];
                        debug("no platform");
                        return [4 /*yield*/, qualifyContact(contact)];
                    case 1:
                        isReachable = _d.sent();
                        return [2 /*return*/, { "status": isReachable ? "REACHABLE" : "UNREACHABLE" }];
                    case 2:
                        pushToken = contact.uaEndpoint.ua.pushToken;
                        _a = platform;
                        switch (_a) {
                            case "iOS": return [3 /*break*/, 3];
                            case "android": return [3 /*break*/, 8];
                        }
                        return [3 /*break*/, 11];
                    case 3:
                        debug("platform iOS...");
                        prReached = qualifyContact(contact);
                        return [4 /*yield*/, Promise.race([
                                new Promise(function (resolve) { return setTimeout(function () { return resolve(false); }, 750); }),
                                prReached
                            ])];
                    case 4:
                        reachableWithoutPush = _d.sent();
                        if (reachableWithoutPush) {
                            debug("...reachable without push");
                            return [2 /*return*/, { "status": "REACHABLE" }];
                        }
                        prIsSendPushSuccess = sendPushNotification(pushToken);
                        return [4 /*yield*/, prReached];
                    case 5:
                        reachable = _d.sent();
                        if (!reachable) return [3 /*break*/, 6];
                        debug("...reachable with push");
                        return [2 /*return*/, { "status": "REACHABLE" }];
                    case 6:
                        debug("... push notification sent");
                        _b = {};
                        _c = "status";
                        return [4 /*yield*/, prIsSendPushSuccess];
                    case 7: return [2 /*return*/, (_b[_c] = (_d.sent()) ? "PUSH_NOTIFICATION_SENT" : "UNREACHABLE", _b)];
                    case 8: return [4 /*yield*/, qualifyContact(contact)];
                    case 9:
                        reached = _d.sent();
                        if (reached)
                            return [2 /*return*/, { "status": "REACHABLE" }];
                        return [4 /*yield*/, sendPushNotification(pushToken)];
                    case 10:
                        isSendPushSuccess = _d.sent();
                        return [2 /*return*/, { "status": isSendPushSuccess ? "PUSH_NOTIFICATION_SENT" : "UNREACHABLE" }];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
})();
(function () {
    var methodName = semasim_gateway_1.sipApiClientBackend.forceContactToReRegister.methodName;
    handlers[methodName] = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var contact, pushToken, platform, clientSocket, isPushNotificationSent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        contact = params.contact;
                        pushToken = contact.uaEndpoint.ua.pushToken;
                        platform = figureOutPushPlatform(pushToken);
                        if (platform !== "android") {
                            clientSocket = sipProxy_1.clientSockets.get(contact.connectionId);
                            if (clientSocket) {
                                clientSocket.destroy();
                            }
                        }
                        return [4 /*yield*/, sendPushNotification(pushToken)];
                    case 1:
                        isPushNotificationSent = _a.sent();
                        return [2 /*return*/, { isPushNotificationSent: isPushNotificationSent }];
                }
            });
        });
    };
})();
(function () {
    var methodName = semasim_gateway_1.sipApiClientBackend.sendPushNotification.methodName;
    handlers[methodName] = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var ua, isPushNotificationSent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ua = params.ua;
                        return [4 /*yield*/, sendPushNotification(ua.pushToken)];
                    case 1:
                        isPushNotificationSent = _a.sent();
                        return [2 /*return*/, { isPushNotificationSent: isPushNotificationSent }];
                }
            });
        });
    };
})();
/** Map connectionId => last qualify result */
var qualifyPending = new Map();
qualifyPending.set = function set(connectionId, promiseResult) {
    var self = this;
    promiseResult.then(function () { return self.delete(connectionId); });
    return Map.prototype.set.call(self, connectionId, promiseResult);
};
//TODO: May throw error!
function qualifyContact(contact, timeout) {
    var _this = this;
    if (timeout === void 0) { timeout = 2500; }
    debug("qualify contact...");
    var connectionId = contact.connectionId;
    var clientSocket = sipProxy_1.clientSockets.get(connectionId);
    if (!clientSocket) {
        debug("...No client connection qualify failed");
        return false;
    }
    var promiseResult = qualifyPending.get(connectionId);
    if (promiseResult) {
        debug("...qualify pending for this contact");
        return promiseResult;
    }
    promiseResult = (function () { return __awaiter(_this, void 0, void 0, function () {
        var fromTag, callId, cSeqSequenceNumber, imei, sipRequest, branch, sipResponse, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fromTag = "794ee9eb-" + Date.now();
                    callId = "138ce538-" + Date.now();
                    cSeqSequenceNumber = Math.floor(Math.random() * 2000);
                    imei = contact.uaEndpoint.endpoint.dongle.imei;
                    sipRequest = semasim_gateway_1.sipLibrary.parse([
                        "OPTIONS " + contact.uri + " SIP/2.0",
                        "From: <sip:" + imei + "@" + _constants_1.c.shared.domain + ">;tag=" + fromTag,
                        "To: <" + contact.uri + ">",
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
                    debug(("(backend) " + sipRequest.method + " " + imei).blue);
                    clientSocket.write(sipRequest);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Promise.race([
                            new Promise(function (_, reject) {
                                return clientSocket.evtClose.attachOnce(sipRequest, function () {
                                    return reject(new Error("Socket disconnected before receiving response to qualify"));
                                });
                            }),
                            clientSocket.evtResponse.attachOnceExtract(function (_a) {
                                var headers = _a.headers;
                                return headers.via[0].params["branch"] === branch;
                            }, timeout, function () { return clientSocket.evtClose.detach(sipRequest); })
                        ])];
                case 2:
                    sipResponse = _a.sent();
                    debug("...qualify success");
                    debug(("(client " + connectionId + "): " + sipResponse.status + " " + sipResponse.reason + " for qualify " + imei).yellow);
                    return [2 /*return*/, true];
                case 3:
                    error_2 = _a.sent();
                    debug("...qualify failed " + error_2.message);
                    if (!clientSocket.evtClose.postCount) {
                        clientSocket.destroy();
                    }
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    }); })();
    qualifyPending.set(connectionId, promiseResult);
    return promiseResult;
}
exports.qualifyContact = qualifyContact;
function figureOutPushPlatform(pushToken) {
    if (!pushToken)
        return null;
    var type = pushToken.type;
    switch (pushToken.type) {
        case "google":
        case "firebase":
            return "android";
        case "apple":
            return "iOS";
        default:
            return undefined;
    }
}
var pushPending;
(function (pushPending) {
    var map = new Map();
    function get(pushToken) {
        return map.get(pushToken.token);
    }
    pushPending.get = get;
    function set(pushToken, prIsSent) {
        var token = pushToken.token;
        switch (figureOutPushPlatform(pushToken)) {
            case "android":
                setTimeout(function () { return map.delete(token); }, 10000);
                break;
            case "iOS":
                prIsSent.then(function () { return map.delete(token); });
                break;
        }
        map.set(token, prIsSent);
    }
    pushPending.set = set;
})(pushPending || (pushPending = {}));
function sendPushNotification(pushToken) {
    var _this = this;
    var platform = figureOutPushPlatform(pushToken);
    if (!platform)
        return Promise.resolve(false);
    var prIsSent = pushPending.get(pushToken);
    if (prIsSent)
        return prIsSent;
    prIsSent = (function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, pushSender.send(platform, pushToken.token)];
                case 1:
                    _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/, true];
            }
        });
    }); })();
    pushPending.set(pushToken, prIsSent);
    return prIsSent;
}
