"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
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
var shared = require("./shared");
var os = require("os");
var pjsip = require("../pjsip");
var tls = require("tls");
require("colors");
var _debug = require("debug");
var debug = _debug("_sipProxy/inbound");
var localIp = os.networkInterfaces()["eth0"].filter(function (_a) {
    var family = _a.family;
    return family === "IPv4";
})[0]["address"];
console.log({ localIp: localIp });
exports.evtIncomingMessage = new ts_events_extended_1.SyncEvent();
var evtOutgoingMessage = new ts_events_extended_1.SyncEvent();
function sendMessage(pjsipContactUri, fromUriUser, headers, content, fromName) {
    return new Promise(function (resolve) {
        //console.log("sending message", { contact, fromUriUser, headers, content, fromName });
        debug("sendMessage", { pjsipContactUri: pjsipContactUri, fromUriUser: fromUriUser, headers: headers, content: content, fromName: fromName });
        var actionId = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
        chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.messageSend("pjsip:" + pjsipContactUri, fromUriUser, actionId).catch(function (error) {
            debug("message send failed", error.message);
            resolve(false);
        });
        evtOutgoingMessage.attachOnce(function (_a) {
            var sipRequest = _a.sipRequest;
            return sipRequest.content === actionId;
        }, function (_a) {
            var sipRequest = _a.sipRequest, evtReceived = _a.evtReceived;
            debug("outgoingMessageCaught");
            if (fromName)
                sipRequest.headers.from.name = fromName;
            sipRequest.headers.to.params["messagetype"] = "SMS";
            delete sipRequest.headers.contact;
            sipRequest.content = content;
            sipRequest.headers = __assign({}, sipRequest.headers, headers);
            evtReceived.waitFor(3000).then(function () { return resolve(true); }).catch(function () { return resolve(false); });
        });
    });
}
exports.sendMessage = sendMessage;
function matchTextMessage(sipRequest) {
    return (sipRequest.method === "MESSAGE" &&
        sipRequest.headers["content-type"].match(/^text\/plain/));
}
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        function notifyHandledDongle(imei, lastConnection) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!!proxySocket.evtConnect.postCount) return [3 /*break*/, 2];
                            return [4 /*yield*/, proxySocket.evtConnect.waitFor()];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            proxySocket.write(shared.Message.NotifyKnownDongle.buildSipRequest(imei, lastConnection));
                            return [2 /*return*/];
                    }
                });
            });
        }
        function createAsteriskSocket(flowToken, boundProxySocket) {
            var _this = this;
            debug(flowToken + " Creating asterisk socket");
            //let asteriskSocket = new sip.Socket(net.createConnection(5060, "127.0.0.1"));
            var asteriskSocket = new sip.Socket(net.createConnection(5060, localIp));
            asteriskSockets.add(flowToken, asteriskSocket);
            asteriskSocket.evtPacket.attach(function (sipPacket) {
                return console.log("From Asterisk:\n", sip.stringify(sipPacket).grey, "\n\n");
            });
            /*
            asteriskSocket.evtData.attach(chunk =>
                console.log("From Asterisk:\n", chunk.grey, "\n\n")
            );
            */
            asteriskSocket.evtPacket.attachPrepend(function (_a) {
                var headers = _a.headers;
                return headers["content-type"] === "application/sdp";
            }, function (sipPacket) {
                var sdp = sip.parseSdp(sipPacket.content);
                sip.purgeCandidates(sdp, { "host": false, "srflx": false, "relay": false });
                sipPacket.content = sip.stringifySdp(sdp);
            });
            asteriskSocket.evtRequest.attach(function (sipRequest) {
                var branch = proxySocket.addViaHeader(sipRequest, (function () {
                    var extraParams = {};
                    extraParams[shared.flowTokenKey] = flowToken;
                    return extraParams;
                })());
                proxySocket.shiftRouteAndAddRecordRoute(sipRequest, "semasim-inbound-proxy.invalid");
                /*
                if (matchTextMessage(sipRequest)) {
                    let evtReceived = new VoidSyncEvent();
                    evtOutgoingMessage.post({ sipRequest, evtReceived });
                    proxySocket.evtResponse.attachOnce(
                        ({ headers }) => headers.via[0].params["branch"] === branch,
                        () => evtReceived.post()
                    )
                }
                */
                proxySocket.write(sipRequest);
            });
            asteriskSocket.evtResponse.attach(function (sipResponse) {
                if (boundProxySocket.evtClose.postCount)
                    return;
                boundProxySocket.rewriteRecordRoute(sipResponse, "semasim-inbound-proxy.invalid");
                sipResponse.headers.via.shift();
                boundProxySocket.write(sipResponse);
            });
            asteriskSocket.evtClose.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
                var isDeleted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            debug(flowToken + " asteriskSocket closed, removing contact");
                            return [4 /*yield*/, pjsip.deleteContactOfFlow(flowToken)];
                        case 1:
                            isDeleted = _a.sent();
                            debug(flowToken + " is contact deleted from db: " + isDeleted);
                            return [2 /*return*/];
                    }
                });
            }); });
            return asteriskSocket;
        }
        var asteriskSockets, proxySocket;
        return __generator(this, function (_a) {
            debug("(re)Staring !");
            asteriskSockets = new sip.Store();
            proxySocket = new sip.Socket(tls.connect({ "host": "ns.semasim.com", "port": shared.relayPort }));
            proxySocket.setKeepAlive(true);
            /*
            proxySocket.evtPacket.attach(sipPacket =>
                console.log("From proxy:\n", sip.stringify(sipPacket).yellow, "\n\n")
            );
            */
            proxySocket.evtData.attach(function (chunk) {
                return console.log("From proxy:\n", chunk.yellow, "\n\n");
            });
            proxySocket.evtRequest.attach(function (sipRequest) { return __awaiter(_this, void 0, void 0, function () {
                var sipRequestDump, flowToken, asteriskSocket, branch;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            sipRequestDump = sip.copyMessage(sipRequest, true);
                            flowToken = sipRequest.headers.via[0].params[shared.flowTokenKey];
                            asteriskSocket = asteriskSockets.get(flowToken);
                            if (!asteriskSocket)
                                asteriskSocket = createAsteriskSocket(flowToken, proxySocket);
                            if (!!asteriskSocket.evtConnect.postCount) return [3 /*break*/, 2];
                            return [4 /*yield*/, asteriskSocket.evtConnect.waitFor()];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            branch = asteriskSocket.addViaHeader(sipRequest);
                            if (sipRequest.method === "REGISTER") {
                                sipRequest.headers["user-agent"] += sipRequest.headers.contact[0].params["+sip.instance"];
                                asteriskSocket.addPathHeader(sipRequest);
                            }
                            else {
                                asteriskSocket.shiftRouteAndAddRecordRoute(sipRequest);
                            }
                            /*
                            if (matchTextMessage(sipRequestDump)) {
                    
                                asteriskSocket.evtResponse.attachOnce(
                                    ({ headers }) => headers.via[0].params["branch"] === branch,
                                    async sipResponse => {
                                        //restoreContacts(sipResponse);
                    
                                        if (sipResponse.status !== 202) return;
                    
                                        let fromContact: string | undefined = undefined;
                    
                                        while (true) {
                    
                                            fromContact = await pjsip.getContactOfFlow(flowToken);
                    
                                            if (fromContact) break;
                    
                                            debug("contact not yet registered");
                    
                                            await new Promise<void>(resolve => setTimeout(resolve, 1000));
                    
                                        }
                    
                                        debug({ fromContact });
                    
                                        evtIncomingMessage.post({ fromContact, "message": sipRequestDump });
                    
                                    }
                                );
                    
                            }
                            */
                            asteriskSocket.write(sipRequest);
                            return [2 /*return*/];
                    }
                });
            }); });
            proxySocket.evtResponse.attach(function (sipResponse) {
                var flowToken = sipResponse.headers.via[0].params[shared.flowTokenKey];
                var asteriskSocket = asteriskSockets.get(flowToken);
                if (!asteriskSocket)
                    return;
                asteriskSocket.rewriteRecordRoute(sipResponse);
                sipResponse.headers.via.shift();
                asteriskSocket.write(sipResponse);
            });
            proxySocket.evtRequest.attachExtract(function (sipRequest) { return shared.Message.matchSipRequest(sipRequest); }, function (sipRequest) {
                var message = shared.Message.parseSipRequest(sipRequest);
                if (shared.Message.NotifyBrokenFlow.match(message)) {
                    debug(message.flowToken + " Outbound notify flow ended, destroying asterisk socket");
                    var asteriskSocket = asteriskSockets.get(message.flowToken);
                    if (!asteriskSocket) {
                        debug(message.flowToken + " asterisk socket was close already");
                        return;
                    }
                    ;
                    asteriskSocket.destroy();
                }
            });
            proxySocket.evtClose.attachOnce(function () {
                //TODO see what is the state of contacts
                debug("proxy socket closed, destroying all asterisk socket, waiting and restarting");
                asteriskSockets.destroyAll();
                setTimeout(function () { return start(); }, 10000);
            });
            proxySocket.evtConnect.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
                var _a, _b, _c, endpoint, lastUpdated, e_1_1, e_1, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            debug("connection established with proxy");
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 6, 7, 8]);
                            return [4 /*yield*/, pjsip.queryEndpoints()];
                        case 2:
                            _a = __values.apply(void 0, [_e.sent()]), _b = _a.next();
                            _e.label = 3;
                        case 3:
                            if (!!_b.done) return [3 /*break*/, 5];
                            _c = _b.value, endpoint = _c.endpoint, lastUpdated = _c.lastUpdated;
                            notifyHandledDongle(endpoint, lastUpdated);
                            _e.label = 4;
                        case 4:
                            _b = _a.next();
                            return [3 /*break*/, 3];
                        case 5: return [3 /*break*/, 8];
                        case 6:
                            e_1_1 = _e.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 8];
                        case 7:
                            try {
                                if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                            }
                            finally { if (e_1) throw e_1.error; }
                            return [7 /*endfinally*/];
                        case 8: return [2 /*return*/];
                    }
                });
            }); });
            chan_dongle_extended_client_1.DongleExtendedClient.localhost().evtDongleConnect.attach(function (imei) { return notifyHandledDongle(imei, Date.now()); });
            return [2 /*return*/];
        });
    });
}
exports.start = start;
