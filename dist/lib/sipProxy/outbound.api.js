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
var apiOverSip = require("./apiOverSip");
var sip = require("./sip");
var firebase = require("../admin/firebase");
var outbound_1 = require("./outbound");
var inbound_1 = require("./inbound");
var _debug = require("debug");
var debug = _debug("_sipProxy/outbound.api");
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
                            case wakeUpUserAgent.methodName: return [3 /*break*/, 2];
                        }
                        return [3 /*break*/, 4];
                    case 1:
                        claimDongle.handle(payload, deviceSocket);
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, wakeUpUserAgent.handle(payload)];
                    case 3:
                        response = _b.sent();
                        return [3 /*break*/, 4];
                    case 4:
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
    function handle(_a, deviceSocket) {
        var imei = _a.imei;
        debug("Device ip: " + deviceSocket.remoteAddress + " claimed dongle " + imei);
        outbound_1.deviceSockets.add(imei, deviceSocket);
    }
    claimDongle.handle = handle;
    function run(imei) {
        return __awaiter(this, void 0, void 0, function () {
            var payload;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        payload = { imei: imei };
                        return [4 /*yield*/, apiOverSip.sendRequest(inbound_1.proxySocket, claimDongle.methodName, payload)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
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
        var contact = _a.contact;
        return __awaiter(this, void 0, void 0, function () {
            var reached, params, response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("wakeUpUserAgent");
                        return [4 /*yield*/, outbound_1.qualifyContact(contact)];
                    case 1:
                        reached = _a.sent();
                        if (reached) {
                            debug("Directly reachable");
                            return [2 /*return*/, { "status": "REACHABLE" }];
                        }
                        params = sip.parseUri(contact.uri).params;
                        if (params["pn-type"] !== "firebase") {
                            debug("Only firebase supported");
                            return [2 /*return*/, { "status": "FAIL" }];
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, firebase.wakeUpDevice(params["pn-tok"])];
                    case 3:
                        response = _a.sent();
                        debug({ response: response });
                        return [2 /*return*/, { "status": "PUSH_NOTIFICATION_SENT" }];
                    case 4:
                        error_1 = _a.sent();
                        debug("Error firebase", error_1);
                        return [2 /*return*/, { "status": "FAIL" }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    wakeUpUserAgent.handle = handle;
    function run(contact) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, status;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("Run wakeUpUserAgent");
                        payload = { contact: contact };
                        return [4 /*yield*/, apiOverSip.sendRequest(inbound_1.proxySocket, wakeUpUserAgent.methodName, payload)];
                    case 1:
                        status = (_a.sent()).status;
                        debug("Status: " + status);
                        return [2 /*return*/, status];
                }
            });
        });
    }
    wakeUpUserAgent.run = run;
})(wakeUpUserAgent = exports.wakeUpUserAgent || (exports.wakeUpUserAgent = {}));
