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
Object.defineProperty(exports, "__esModule", { value: true });
var semasim_gateway_1 = require("../semasim-gateway");
var sipProxy = require("./sipProxy");
var pushSender = require("../tools/pushSender");
var _constants_1 = require("./_constants");
var sipApiGateway = require("./sipApiGatewayClientImplementation");
var _debug = require("debug");
var debug = _debug("_utils");
function createSelfMaintainedSocketMap() {
    var map = new Map();
    map.set = function (key, socket) {
        if (map.has(key)) {
            map.get(key).evtClose.detach(map);
        }
        socket.evtClose.attachOnce(map, function () { return Map.prototype.delete.call(map, key); });
        return Map.prototype.set.call(map, key, socket);
    };
    map.delete = function (key) {
        if (map.has(key)) {
            map.get(key).evtClose.detach(map);
        }
        return Map.prototype.delete.call(map, key);
    };
    return map;
}
exports.createSelfMaintainedSocketMap = createSelfMaintainedSocketMap;
var simPassword;
(function (simPassword) {
    function store(gwSocket, imsi, password) {
        if (!gwSocket.misc["passwordByImsi"]) {
            gwSocket.misc["passwordByImsi"] = {};
        }
        gwSocket.misc["passwordByImsi"][imsi] = password;
    }
    simPassword.store = store;
    function read(gwSocket, imsi) {
        var passwordByImsi = gwSocket.misc["passwordByImsi"];
        if (!passwordByImsi) {
            return undefined;
        }
        return passwordByImsi[imsi];
    }
    simPassword.read = read;
})(simPassword = exports.simPassword || (exports.simPassword = {}));
function qualifyContact(contact, timeout) {
    var _this = this;
    if (timeout === void 0) { timeout = 2500; }
    debug("qualify contact...");
    var connectionId = contact.connectionId;
    var clientSocket = sipProxy.clientSockets.get(connectionId);
    if (!clientSocket) {
        debug("...No client connection qualify failed");
        return false;
    }
    var promiseResult = qualifyContact.pending.get(connectionId);
    if (promiseResult) {
        debug("...qualify pending for this contact");
        return promiseResult;
    }
    promiseResult = (function () { return __awaiter(_this, void 0, void 0, function () {
        var fromTag, callId, cSeqSequenceNumber, imsi, sipRequest, branch, sipResponse, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fromTag = "794ee9eb-" + Date.now();
                    callId = "138ce538-" + Date.now();
                    cSeqSequenceNumber = Math.floor(Math.random() * 2000);
                    imsi = contact.uaSim.imsi;
                    sipRequest = semasim_gateway_1.sipLibrary.parse([
                        "OPTIONS " + contact.uri + " SIP/2.0",
                        "From: <sip:" + imsi + "@" + _constants_1.c.shared.domain + ">;tag=" + fromTag,
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
                    debug(("(backend) " + sipRequest.method + " " + imsi).blue);
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
                                try {
                                    return headers.via[0].params["branch"] === branch;
                                }
                                catch (_b) {
                                    clientSocket.destroy();
                                    return false;
                                }
                            }, timeout, function () { return clientSocket.evtClose.detach(sipRequest); })
                        ])];
                case 2:
                    sipResponse = _a.sent();
                    debug("...qualify success");
                    debug(("(client " + connectionId + "): " + sipResponse.status + " " + sipResponse.reason + " for qualify " + imsi).yellow);
                    return [2 /*return*/, true];
                case 3:
                    error_1 = _a.sent();
                    debug("...qualify failed " + error_1.message);
                    if (!clientSocket.evtClose.postCount) {
                        clientSocket.destroy();
                    }
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    }); })();
    qualifyContact.pending.set(connectionId, promiseResult);
    return promiseResult;
}
exports.qualifyContact = qualifyContact;
(function (qualifyContact) {
    qualifyContact.pending = new Map();
    qualifyContact.pending.set = function set(connectionId, promiseResult) {
        var self = this;
        promiseResult.then(function () { return self.delete(connectionId); });
        return Map.prototype.set.call(self, connectionId, promiseResult);
    };
})(qualifyContact = exports.qualifyContact || (exports.qualifyContact = {}));
//TODO: implement reload config!!!!
function sendPushNotification(ua, reloadConfig) {
    var _this = this;
    if (reloadConfig === void 0) { reloadConfig = undefined; }
    if (!sendPushNotification.isInitialized) {
        pushSender.initialize(_constants_1.c.pushNotificationCredentials);
        sendPushNotification.isInitialized = true;
    }
    var prIsSent = sendPushNotification.pending.get(ua);
    if (prIsSent)
        return prIsSent;
    prIsSent = (function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, pushSender.send(ua.platform, ua.pushToken)];
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
    sendPushNotification.pending.set(ua, prIsSent);
    return prIsSent;
}
exports.sendPushNotification = sendPushNotification;
(function (sendPushNotification) {
    sendPushNotification.isInitialized = false;
    var pending;
    (function (pending) {
        /** UaId => prIsSent */
        var map = new Map();
        function get(ua) {
            return map.get(semasim_gateway_1.Contact.UaSim.Ua.id(ua));
        }
        pending.get = get;
        function set(ua, prIsSent) {
            var uaId = semasim_gateway_1.Contact.UaSim.Ua.id(ua);
            switch (ua.platform) {
                case "iOS":
                    setTimeout(function () { return map.delete(uaId); }, 10000);
                    break;
                case "android":
                    prIsSent.then(function () { return map.delete(uaId); });
                    break;
            }
            map.set(uaId, prIsSent);
        }
        pending.set = set;
    })(pending = sendPushNotification.pending || (sendPushNotification.pending = {}));
    function toUas(uas, reloadConfig) {
        if (reloadConfig === void 0) { reloadConfig = undefined; }
        return __awaiter(this, void 0, void 0, function () {
            var task, uas_1, uas_1_1, ua, e_1, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        task = [];
                        try {
                            for (uas_1 = __values(uas), uas_1_1 = uas_1.next(); !uas_1_1.done; uas_1_1 = uas_1.next()) {
                                ua = uas_1_1.value;
                                task[task.length] = sendPushNotification(ua, reloadConfig);
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (uas_1_1 && !uas_1_1.done && (_a = uas_1.return)) _a.call(uas_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        return [4 /*yield*/, task];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    sendPushNotification.toUas = toUas;
})(sendPushNotification = exports.sendPushNotification || (exports.sendPushNotification = {}));
function getDonglesConnectedFrom(remoteAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var gatewaySockets, tasks, map, _loop_1, gatewaySockets_1, gatewaySockets_1_1, gatewaySocket, e_2, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, sipProxy.gatewaySockets.getConnectedFrom(remoteAddress)];
                case 1:
                    gatewaySockets = _b.sent();
                    tasks = [];
                    map = new Map();
                    _loop_1 = function (gatewaySocket) {
                        tasks[tasks.length] = (function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b, dongle, e_3_1, e_3, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _d.trys.push([0, 5, 6, 7]);
                                        return [4 /*yield*/, sipApiGateway.getDongles(gatewaySocket)];
                                    case 1:
                                        _a = __values.apply(void 0, [_d.sent()]), _b = _a.next();
                                        _d.label = 2;
                                    case 2:
                                        if (!!_b.done) return [3 /*break*/, 4];
                                        dongle = _b.value;
                                        map.set(dongle, gatewaySocket);
                                        _d.label = 3;
                                    case 3:
                                        _b = _a.next();
                                        return [3 /*break*/, 2];
                                    case 4: return [3 /*break*/, 7];
                                    case 5:
                                        e_3_1 = _d.sent();
                                        e_3 = { error: e_3_1 };
                                        return [3 /*break*/, 7];
                                    case 6:
                                        try {
                                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                        }
                                        finally { if (e_3) throw e_3.error; }
                                        return [7 /*endfinally*/];
                                    case 7: return [2 /*return*/];
                                }
                            });
                        }); })();
                    };
                    try {
                        for (gatewaySockets_1 = __values(gatewaySockets), gatewaySockets_1_1 = gatewaySockets_1.next(); !gatewaySockets_1_1.done; gatewaySockets_1_1 = gatewaySockets_1.next()) {
                            gatewaySocket = gatewaySockets_1_1.value;
                            _loop_1(gatewaySocket);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (gatewaySockets_1_1 && !gatewaySockets_1_1.done && (_a = gatewaySockets_1.return)) _a.call(gatewaySockets_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    return [4 /*yield*/, Promise.all(tasks)];
                case 2:
                    _b.sent();
                    return [2 /*return*/, map];
            }
        });
    });
}
exports.getDonglesConnectedFrom = getDonglesConnectedFrom;
