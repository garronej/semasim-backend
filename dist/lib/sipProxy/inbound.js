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
var net = require("net");
var sip = require("./sip");
var ts_events_extended_1 = require("ts-events-extended");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var os = require("os");
var outbound = require("./outbound");
var outboundApi = require("./outbound.api");
var inbound_api_1 = require("./inbound.api");
var admin = require("../admin");
var admin_1 = require("../admin");
var tls = require("tls");
require("colors");
var _debug = require("debug");
var debug = _debug("_sipProxy/inbound");
//TODO change that otherwise only work on raspberry pi
var localIp = os.networkInterfaces()["eth0"].filter(function (_a) {
    var family = _a.family;
    return family === "IPv4";
})[0]["address"];
exports.evtIncomingMessage = new ts_events_extended_1.SyncEvent();
exports.evtOutgoingMessage = new ts_events_extended_1.SyncEvent();
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        function notifyHandledDongle(imei) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!!exports.proxySocket.evtConnect.postCount) return [3 /*break*/, 2];
                            return [4 /*yield*/, exports.proxySocket.evtConnect.waitFor()];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [4 /*yield*/, outboundApi.claimDongle.run(imei)];
                        case 3:
                            _a.sent();
                            debug("Dongle Successfully claimed");
                            return [2 /*return*/];
                    }
                });
            });
        }
        function createAsteriskSocket(flowToken, proxySocket) {
            debug(flowToken + " Creating asterisk socket");
            //let asteriskSocket = new sip.Socket(net.createConnection(5060, "127.0.0.1"));
            var asteriskSocket = new sip.Socket(net.createConnection(5060, localIp));
            asteriskSocket.disablePong = true;
            asteriskSocket.evtPing.attach(function () { return console.log("Asterisk ping!"); });
            exports.asteriskSockets.add(flowToken, asteriskSocket);
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
                var sdp = sip.parseSdp(sipPacket.content);
                sip.overwriteGlobalAndAudioAddrInSdpCandidates(sdp);
                sipPacket.content = sip.stringifySdp(sdp);
            });
            asteriskSocket.evtRequest.attach(function (sipRequest) {
                var branch = proxySocket.addViaHeader(sipRequest, outbound.extraParamFlowToken(flowToken));
                proxySocket.shiftRouteAndAddRecordRoute(sipRequest, "semasim-inbound-proxy.invalid");
                if (sip.isPlainMessageRequest(sipRequest)) {
                    var evtReceived_1 = new ts_events_extended_1.VoidSyncEvent();
                    exports.evtOutgoingMessage.post({ sipRequest: sipRequest, evtReceived: evtReceived_1 });
                    proxySocket.evtResponse.attachOncePrepend(function (_a) {
                        var headers = _a.headers;
                        return headers.via[0].params["branch"] === branch;
                    }, function () { return evtReceived_1.post(); });
                }
                proxySocket.write(sipRequest);
            });
            asteriskSocket.evtResponse.attach(function (sipResponse) {
                if (proxySocket.evtClose.postCount)
                    return;
                proxySocket.rewriteRecordRoute(sipResponse, "semasim-inbound-proxy.invalid");
                sipResponse.headers.via.shift();
                proxySocket.write(sipResponse);
            });
            return asteriskSocket;
        }
        return __generator(this, function (_a) {
            debug("(re)Staring !");
            exports.asteriskSockets = new sip.Store();
            exports.proxySocket = new sip.Socket(tls.connect({
                "host": outbound.hostname,
                "port": outbound.listeningPortForDevices
            }));
            exports.proxySocket.setKeepAlive(true);
            /*
            proxySocket.evtPacket.attach(sipPacket =>
                console.log("From proxy:\n", sip.stringify(sipPacket).yellow, "\n\n")
            );
            proxySocket.evtData.attach(chunk =>
                console.log("From proxy:\n", chunk.yellow, "\n\n")
            );
            */
            exports.proxySocket.evtRequest.attach(function (sipRequest) { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                var flowToken, asteriskSocket, branch;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            flowToken = sipRequest.headers.via[0].params[outbound.flowTokenKey];
                            asteriskSocket = exports.asteriskSockets.get(flowToken);
                            if (!asteriskSocket)
                                asteriskSocket = createAsteriskSocket(flowToken, exports.proxySocket);
                            if (!!asteriskSocket.evtConnect.postCount) return [3 /*break*/, 2];
                            return [4 /*yield*/, asteriskSocket.evtConnect.waitFor()];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            if (sipRequest.method === "REGISTER") {
                                sipRequest.headers["user-agent"] = admin_1.Contact.buildValueOfUserAgentField(sip.parseUri(sipRequest.headers.from.uri).user, sipRequest.headers.contact[0].params["+sip.instance"], sipRequest.headers["user-agent"]);
                                asteriskSocket.addPathHeader(sipRequest);
                            }
                            else
                                asteriskSocket.shiftRouteAndAddRecordRoute(sipRequest);
                            branch = asteriskSocket.addViaHeader(sipRequest);
                            //TODO match with authentication
                            if (sip.isPlainMessageRequest(sipRequest)) {
                                asteriskSocket.evtResponse.attachOncePrepend(function (_a) {
                                    var headers = _a.headers;
                                    return headers.via[0].params["branch"] === branch;
                                }, function (sipResponse) { return __awaiter(_this, void 0, void 0, function () {
                                    var contact;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (sipResponse.status !== 202)
                                                    return [2 /*return*/];
                                                return [4 /*yield*/, admin.getContactFromAstSocketSrcPort(asteriskSocket.localPort)];
                                            case 1:
                                                contact = _a.sent();
                                                if (!contact) {
                                                    //TODO? Change result code, is it possible ?
                                                    debug("Contact not found for incoming message!!!");
                                                    return [2 /*return*/];
                                                }
                                                exports.evtIncomingMessage.post({ contact: contact, "message": sipRequest });
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
            exports.proxySocket.evtResponse.attach(function (sipResponse) {
                var flowToken = sipResponse.headers.via[0].params[outbound.flowTokenKey];
                var asteriskSocket = exports.asteriskSockets.get(flowToken);
                if (!asteriskSocket)
                    return;
                asteriskSocket.rewriteRecordRoute(sipResponse);
                sipResponse.headers.via.shift();
                asteriskSocket.write(sipResponse);
            });
            exports.proxySocket.evtClose.attachOnce(function () {
                //TODO see what is the state of contacts
                debug("proxy socket closed, destroying all asterisk socket, waiting and restarting");
                exports.asteriskSockets.destroyAll();
                setTimeout(function () { return start(); }, 3000);
            });
            exports.proxySocket.evtConnect.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
                var _a, _b, imei, e_1_1, e_1, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            debug("connection established with proxy");
                            inbound_api_1.startListening();
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 6, 7, 8]);
                            return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().getActiveDongles()];
                        case 2:
                            _a = __values.apply(void 0, [_d.sent()]), _b = _a.next();
                            _d.label = 3;
                        case 3:
                            if (!!_b.done) return [3 /*break*/, 5];
                            imei = _b.value.imei;
                            notifyHandledDongle(imei);
                            _d.label = 4;
                        case 4:
                            _b = _a.next();
                            return [3 /*break*/, 3];
                        case 5: return [3 /*break*/, 8];
                        case 6:
                            e_1_1 = _d.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 8];
                        case 7:
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_1) throw e_1.error; }
                            return [7 /*endfinally*/];
                        case 8: return [2 /*return*/];
                    }
                });
            }); });
            chan_dongle_extended_client_1.DongleExtendedClient.localhost().evtNewActiveDongle.attach(function (_a) {
                var imei = _a.imei;
                return notifyHandledDongle(imei);
            });
            return [2 /*return*/];
        });
    });
}
exports.start = start;
