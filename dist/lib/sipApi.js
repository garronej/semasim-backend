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
                        return [4 /*yield*/, handlers[method](params, gatewaySocket)];
                    case 1:
                        response = _a.sent();
                        sendResponse(response);
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        debug("Unexpected error: ", error_1.message);
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
        var imei, candidateGatewaySocket, currentGatewaySocket, currentResp, candidateResp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName);
                    imei = params.imei;
                    candidateGatewaySocket = gatewaySocket;
                    currentGatewaySocket = sipProxy_1.gatewaySockets.get(imei);
                    if (!currentGatewaySocket) {
                        sipProxy_1.gatewaySockets.add(imei, candidateGatewaySocket);
                        return [2 /*return*/, { "isGranted": true }];
                    }
                    if (currentGatewaySocket === candidateGatewaySocket) {
                        return [2 /*return*/, { "isGranted": true }];
                    }
                    return [4 /*yield*/, semasim_gateway_1.sipApiClientGateway.isDongleConnected.makeCall(currentGatewaySocket, imei)];
                case 1:
                    currentResp = _a.sent();
                    if (currentResp.isConnected) {
                        debug("Attack attempt, we refuse to associate socket to this dongle");
                        return [2 /*return*/, { "isGranted": false }];
                    }
                    return [4 /*yield*/, semasim_gateway_1.sipApiClientGateway.isDongleConnected.makeCall(candidateGatewaySocket, imei)];
                case 2:
                    candidateResp = _a.sent();
                    if (candidateResp.isConnected) {
                        sipProxy_1.gatewaySockets.add(imei, candidateGatewaySocket);
                        return [2 /*return*/, { "isGranted": true }];
                    }
                    if (candidateResp.lastConnectionTimestamp > currentResp.lastConnectionTimestamp) {
                        sipProxy_1.gatewaySockets.add(imei, candidateGatewaySocket);
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
        var contactOrContactUri, contact, reached, _a, pushType, pushToken, _b, response, error_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    debug("handle " + methodName);
                    contactOrContactUri = params.contactOrContactUri;
                    if (!(typeof contactOrContactUri !== "string")) return [3 /*break*/, 2];
                    contact = contactOrContactUri;
                    return [4 /*yield*/, sipProxy_1.qualifyContact(contact)];
                case 1:
                    reached = _c.sent();
                    if (reached) {
                        debug("Directly reachable");
                        return [2 /*return*/, { "status": "REACHABLE" }];
                    }
                    _c.label = 2;
                case 2:
                    _a = semasim_gateway_1.Contact.readPushInfos(contactOrContactUri), pushType = _a.pushType, pushToken = _a.pushToken;
                    _b = pushType;
                    switch (_b) {
                        case "google": return [3 /*break*/, 3];
                        case "firebase": return [3 /*break*/, 3];
                    }
                    return [3 /*break*/, 6];
                case 3:
                    _c.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, firebaseFunctions.sendPushNotification(pushToken)];
                case 4:
                    response = _c.sent();
                    debug({ response: response });
                    return [2 /*return*/, { "status": "PUSH_NOTIFICATION_SENT" }];
                case 5:
                    error_2 = _c.sent();
                    debug("Error firebase", error_2);
                    return [2 /*return*/, { "status": "UNREACHABLE" }];
                case 6:
                    debug("Can't send push notification for this contact");
                    return [2 /*return*/, { "status": "UNREACHABLE" }];
            }
        });
    }); };
})();
