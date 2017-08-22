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
var tls = require("tls");
var net = require("net");
var ts_events_extended_1 = require("ts-events-extended");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var sipLibrary = require("./tools/sipLibrary");
var os = require("os");
var backendSipApi = require("./backendSipApi");
var backendSipProxy_1 = require("./backendSipProxy");
var gatewaySipApi_1 = require("./gatewaySipApi");
var sipContacts_1 = require("./sipContacts");
var db = require("./dbInterface");
var c = require("./_constants");
require("colors");
var _debug = require("debug");
var debug = _debug("_gatewaySipProxy");
//TODO change that otherwise only work on raspberry pi
var localIp = os.networkInterfaces()["eth0"].filter(function (_a) {
    var family = _a.family;
    return family === "IPv4";
})[0]["address"];
exports.evtIncomingMessage = new ts_events_extended_1.SyncEvent();
exports.evtOutgoingMessage = new ts_events_extended_1.SyncEvent();
var backendSocket;
var asteriskSockets;
var evtNewBackendSocketConnect = new ts_events_extended_1.VoidSyncEvent();
function getBackendSocket() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(!backendSocket ||
                        backendSocket.evtClose.postCount ||
                        !backendSocket.evtConnect.postCount)) return [3 /*break*/, 2];
                    return [4 /*yield*/, evtNewBackendSocketConnect.waitFor()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, backendSocket];
            }
        });
    });
}
exports.getBackendSocket = getBackendSocket;
function getAsteriskSockets() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getBackendSocket()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, asteriskSockets];
            }
        });
    });
}
exports.getAsteriskSockets = getAsteriskSockets;
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            debug("(re)Staring !");
            asteriskSockets = new sipLibrary.Store();
            backendSocket = new sipLibrary.Socket(tls.connect({
                "host": c.backendHostname,
                "port": c.backendSipProxyListeningPortForGateways
            }));
            backendSocket.setKeepAlive(true);
            gatewaySipApi_1.startListening(backendSocket);
            /*
            backendSocket.evtPacket.attach(sipPacket =>
                console.log("From backend:\n", sip.stringify(sipPacket).yellow, "\n\n")
            );
            backendSocket.evtData.attach(chunk =>
                console.log("From backend:\n", chunk.yellow, "\n\n")
            );
            */
            backendSocket.evtConnect.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
                var set, _a, _b, imei, e_1_1, _c, _d, imei, e_2_1, set_1, set_1_1, imei, e_1, _e, e_2, _f, e_3, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            debug("connection established with backend");
                            evtNewBackendSocketConnect.post();
                            set = new Set();
                            _h.label = 1;
                        case 1:
                            _h.trys.push([1, 6, 7, 8]);
                            return [4 /*yield*/, db.asterisk.queryEndpoints()];
                        case 2:
                            _a = __values.apply(void 0, [_h.sent()]), _b = _a.next();
                            _h.label = 3;
                        case 3:
                            if (!!_b.done) return [3 /*break*/, 5];
                            imei = _b.value;
                            set.add(imei);
                            _h.label = 4;
                        case 4:
                            _b = _a.next();
                            return [3 /*break*/, 3];
                        case 5: return [3 /*break*/, 8];
                        case 6:
                            e_1_1 = _h.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 8];
                        case 7:
                            try {
                                if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                            }
                            finally { if (e_1) throw e_1.error; }
                            return [7 /*endfinally*/];
                        case 8:
                            _h.trys.push([8, 13, 14, 15]);
                            return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().getConnectedDongles()];
                        case 9:
                            _c = __values.apply(void 0, [_h.sent()]), _d = _c.next();
                            _h.label = 10;
                        case 10:
                            if (!!_d.done) return [3 /*break*/, 12];
                            imei = _d.value;
                            set.add(imei);
                            _h.label = 11;
                        case 11:
                            _d = _c.next();
                            return [3 /*break*/, 10];
                        case 12: return [3 /*break*/, 15];
                        case 13:
                            e_2_1 = _h.sent();
                            e_2 = { error: e_2_1 };
                            return [3 /*break*/, 15];
                        case 14:
                            try {
                                if (_d && !_d.done && (_f = _c.return)) _f.call(_c);
                            }
                            finally { if (e_2) throw e_2.error; }
                            return [7 /*endfinally*/];
                        case 15:
                            try {
                                for (set_1 = __values(set), set_1_1 = set_1.next(); !set_1_1.done; set_1_1 = set_1.next()) {
                                    imei = set_1_1.value;
                                    backendSipApi.claimDongle.run(imei);
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (set_1_1 && !set_1_1.done && (_g = set_1.return)) _g.call(set_1);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                            return [2 /*return*/];
                    }
                });
            }); });
            backendSocket.evtRequest.attach(function (sipRequest) { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                var flowToken, asteriskSocket, branch;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            flowToken = sipRequest.headers.via[0].params[c.flowTokenKey];
                            asteriskSocket = asteriskSockets.get(flowToken);
                            if (!asteriskSocket)
                                asteriskSocket = createAsteriskSocket(flowToken, backendSocket);
                            if (!!asteriskSocket.evtConnect.postCount) return [3 /*break*/, 2];
                            return [4 /*yield*/, asteriskSocket.evtConnect.waitFor()];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            if (sipRequest.method === "REGISTER") {
                                sipRequest.headers["user-agent"] = sipContacts_1.Contact.buildValueOfUserAgentField(sipLibrary.parseUri(sipRequest.headers.from.uri).user, sipRequest.headers.contact[0].params["+sip.instance"], sipRequest.headers["user-agent"]);
                                asteriskSocket.addPathHeader(sipRequest);
                            }
                            else
                                asteriskSocket.shiftRouteAndAddRecordRoute(sipRequest);
                            branch = asteriskSocket.addViaHeader(sipRequest);
                            //TODO match with authentication
                            if (sipLibrary.isPlainMessageRequest(sipRequest)) {
                                asteriskSocket.evtResponse.attachOncePrepend(function (_a) {
                                    var headers = _a.headers;
                                    return headers.via[0].params["branch"] === branch;
                                }, function (sipResponse) { return __awaiter(_this, void 0, void 0, function () {
                                    var text, toNumber, fromContact;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (sipResponse.status !== 202)
                                                    return [2 /*return*/];
                                                text = sipRequest.content;
                                                toNumber = sipLibrary.parseUri(sipRequest.headers.to.uri).user;
                                                return [4 /*yield*/, sipContacts_1.getContactFromAstSocketSrcPort(asteriskSocket.localPort)];
                                            case 1:
                                                fromContact = _a.sent();
                                                if (!fromContact) {
                                                    //TODO? Change result code, is it possible ?
                                                    debug("Contact not found for incoming message!!!");
                                                    return [2 /*return*/];
                                                }
                                                exports.evtIncomingMessage.post({ fromContact: fromContact, toNumber: toNumber, text: text });
                                                return [2 /*return*/];
                                        }
                                    });
                                }); });
                            }
                            asteriskSocket.write(sipRequest);
                            return [2 /*return*/];
                    }
                });
            }); });
            backendSocket.evtResponse.attach(function (sipResponse) {
                var flowToken;
                try {
                    flowToken = sipResponse.headers.via[0].params[c.flowTokenKey];
                }
                catch (error) {
                    console.log(error.message);
                    console.log(JSON.stringify(sipResponse, null, 2));
                    return;
                }
                var asteriskSocket = asteriskSockets.get(flowToken);
                if (!asteriskSocket)
                    return;
                asteriskSocket.rewriteRecordRoute(sipResponse);
                sipResponse.headers.via.shift();
                asteriskSocket.write(sipResponse);
            });
            backendSocket.evtClose.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            debug("Backend socket closed, waiting and restarting");
                            return [4 /*yield*/, asteriskSockets.destroyAll()];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                        case 2:
                            _a.sent();
                            start();
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
exports.start = start;
function createAsteriskSocket(flowToken, backendSocket) {
    debug(flowToken + " Creating asterisk socket");
    //let asteriskSocket = new sip.Socket(net.createConnection(5060, "127.0.0.1"));
    var asteriskSocket = new sipLibrary.Socket(net.createConnection(5060, localIp));
    asteriskSocket.disablePong = true;
    asteriskSocket.evtPing.attach(function () { return console.log("Asterisk ping!"); });
    asteriskSockets.add(flowToken, asteriskSocket);
    /*
    asteriskSocket.evtPacket.attach(sipPacket =>
        console.log("From Asterisk:\n", sip.stringify(sipPacket).grey, "\n\n")
    );
    asteriskSocket.evtData.attach(chunk =>
        console.log("From Asterisk:\n", chunk.grey, "\n\n")
    );
    */
    asteriskSocket.evtPacket.attachPrepend(function (_a) {
        var headers = _a.headers;
        return headers["content-type"] === "application/sdp";
    }, function (sipPacket) {
        var sdp = sipLibrary.parseSdp(sipPacket.content);
        sipLibrary.overwriteGlobalAndAudioAddrInSdpCandidates(sdp);
        sipPacket.content = sipLibrary.stringifySdp(sdp);
    });
    asteriskSocket.evtRequest.attach(function (sipRequest) {
        if (backendSocket.evtClose.postCount)
            return;
        var branch = backendSocket.addViaHeader(sipRequest, backendSipProxy_1.extraParamFlowToken(flowToken));
        backendSocket.shiftRouteAndAddRecordRoute(sipRequest, "semasim-gateway.invalid");
        if (sipLibrary.isPlainMessageRequest(sipRequest)) {
            var evtReceived_1 = new ts_events_extended_1.VoidSyncEvent();
            exports.evtOutgoingMessage.post({ sipRequest: sipRequest, evtReceived: evtReceived_1 });
            backendSocket.evtResponse.attachOncePrepend(function (_a) {
                var headers = _a.headers;
                return headers.via[0].params["branch"] === branch;
            }, function () { return evtReceived_1.post(); });
        }
        backendSocket.write(sipRequest);
    });
    asteriskSocket.evtResponse.attach(function (sipResponse) {
        if (backendSocket.evtClose.postCount)
            return;
        backendSocket.rewriteRecordRoute(sipResponse, "semasim-gateway.invalid");
        sipResponse.headers.via.shift();
        backendSocket.write(sipResponse);
    });
    return asteriskSocket;
}
