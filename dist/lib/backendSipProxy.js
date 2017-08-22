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
var md5 = require("md5");
var dns = require("dns");
var tls = require("tls");
var net = require("net");
var sip = require("./tools/sipLibrary");
var backendSipApi_1 = require("./backendSipApi");
var sipContacts_1 = require("./sipContacts");
var c = require("./_constants");
require("colors");
var _debug = require("debug");
var debug = _debug("_backendSipProxy");
var informativeHostname = "semasim-backend.invalid";
var publicIp = "";
function getPublicIp() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (publicIp)
                        return [2 /*return*/, publicIp];
                    return [4 /*yield*/, new Promise(function (resolve) {
                            return dns.resolve4(c.backendHostname, function (error, addresses) {
                                if (error)
                                    throw error;
                                resolve(addresses[0]);
                            });
                        })];
                case 1:
                    publicIp = _a.sent();
                    return [2 /*return*/, publicIp];
            }
        });
    });
}
exports.getPublicIp = getPublicIp;
function extraParamFlowToken(flowToken) {
    var extraParams = {};
    extraParams[c.flowTokenKey] = flowToken;
    return extraParams;
}
exports.extraParamFlowToken = extraParamFlowToken;
function qualifyContact(contact, timeout) {
    return __awaiter(this, void 0, void 0, function () {
        var fromTag, callId, cSeqSequenceNumber, flowToken, sipRequest, clientSocket, branch, sipResponse, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fromTag = "794ee9eb-" + Date.now();
                    callId = "138ce538-" + Date.now();
                    cSeqSequenceNumber = Math.floor(Math.random() * 2000);
                    flowToken = sipContacts_1.Contact.readFlowToken(contact);
                    sipRequest = sip.parse([
                        "OPTIONS " + contact.uri + " SIP/2.0",
                        "From: <sip:" + contact.endpoint + "@semasim.com>;tag=" + fromTag,
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
                    clientSocket = clientSockets.get(flowToken);
                    if (!clientSocket)
                        return [2 /*return*/, false];
                    branch = clientSocket.addViaHeader(sipRequest);
                    console.log("Sending qualify: \n", sip.stringify(sipRequest));
                    clientSocket.write(sipRequest);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, clientSocket.evtResponse.waitForExtract(function (_a) {
                            var headers = _a.headers;
                            return headers.via[0].params["branch"] === branch;
                        }, timeout || 5000)];
                case 2:
                    sipResponse = _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    error_1 = _a.sent();
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.qualifyContact = qualifyContact;
var clientSockets;
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var options, s1, s2, s3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getPublicIp()];
                case 1:
                    _a.sent();
                    exports.gatewaySockets = new sip.Store();
                    clientSockets = new sip.Store();
                    options = c.getTlsOptions();
                    s1 = net.createServer()
                        .on("error", function (error) { throw error; })
                        .listen(5060, "0.0.0.0")
                        .on("connection", onClientConnection);
                    s2 = tls.createServer(options)
                        .on("error", function (error) { throw error; })
                        .listen(5061, "0.0.0.0")
                        .on("secureConnection", onClientConnection);
                    s3 = tls.createServer(options)
                        .on("error", function (error) { throw error; })
                        .listen(c.backendSipProxyListeningPortForGateways, "0.0.0.0")
                        .on("secureConnection", onGatewayConnection);
                    return [4 /*yield*/, Promise.all([s1, s2, s3].map(function (s) { return new Promise(function (resolve) { return s1.on("listening", function () { return resolve(); }); }); }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.startServer = startServer;
function onClientConnection(clientSocketRaw) {
    var clientSocket = new sip.Socket(clientSocketRaw);
    clientSocket.disablePong = true;
    clientSocket.evtPing.attach(function () { return console.log("Client ping!"); });
    var flowToken = md5(clientSocket.remoteAddress + ":" + clientSocket.remotePort);
    console.log((flowToken + " New client socket, " + clientSocket.remoteAddress + ":" + clientSocket.remotePort + "\n\n").yellow);
    clientSockets.add(flowToken, clientSocket);
    var boundGatewaySocket = null;
    var imei = "";
    /*
    clientSocket.evtPacket.attach(sipPacket =>
        console.log("From Client:\n", sip.stringify(sipPacket).yellow, "\n\n")
    );
    */
    clientSocket.evtData.attach(function (chunk) {
        return console.log("From Client:\n", chunk.yellow, "\n\n");
    });
    clientSocket.evtRequest.attachOnce(function (firstRequest) {
        try {
            var parsedFromUri = sip.parseUri(firstRequest.headers.from.uri);
            if (!parsedFromUri.user)
                throw new Error("no imei");
            imei = parsedFromUri.user;
            console.log((flowToken + " Client socket, target dongle imei: " + imei).yellow);
            if (!exports.gatewaySockets.get(imei))
                throw new Error("Gateway socket not found");
            boundGatewaySocket = exports.gatewaySockets.get(imei);
            console.log((flowToken + " Found path to Gateway ip: " + boundGatewaySocket.remoteAddress).yellow);
        }
        catch (error) {
            console.log("Can't route to any gateway: ".red, error.message);
            //Should send 480 temporary unavailable
            clientSocket.destroy();
            return;
        }
        boundGatewaySocket.evtClose.attachOnce(clientSocket, function () {
            console.log((flowToken + " Gateway Socket bound closed, destroying client socket").yellow);
            boundGatewaySocket = null;
            clientSocket.destroy();
        });
    });
    clientSocket.evtRequest.attach(function (sipRequest) {
        if (boundGatewaySocket !== exports.gatewaySockets.get(imei)) {
            clientSocket.destroy();
            return;
        }
        boundGatewaySocket.addViaHeader(sipRequest, extraParamFlowToken(flowToken));
        if (sipRequest.method === "REGISTER") {
            sip.addOptionTag(sipRequest.headers, "supported", "path");
            //TODO: shift route
            boundGatewaySocket.addPathHeader(sipRequest, informativeHostname, extraParamFlowToken(flowToken));
        }
        else
            boundGatewaySocket.shiftRouteAndAddRecordRoute(sipRequest, informativeHostname);
        boundGatewaySocket.write(sipRequest);
    });
    clientSocket.evtResponse.attach(function (sipResponse) {
        if (boundGatewaySocket !== exports.gatewaySockets.get(imei)) {
            clientSocket.destroy();
            return;
        }
        boundGatewaySocket.rewriteRecordRoute(sipResponse, informativeHostname);
        sipResponse.headers.via.shift();
        boundGatewaySocket.write(sipResponse);
    });
    clientSocket.evtClose.attachOnce(function () {
        if (!boundGatewaySocket)
            return;
        boundGatewaySocket.evtClose.detach({ "boundTo": clientSocket });
    });
}
function onGatewayConnection(gatewaySocketRaw) {
    console.log("New Gateway socket !\n\n".grey);
    var gatewaySocket = new sip.Socket(gatewaySocketRaw);
    gatewaySocket.setKeepAlive(true);
    gatewaySocket.evtPacket.attach(function (sipPacket) {
        return console.log("From gateway:\n", sip.stringify(sipPacket).grey, "\n\n");
    });
    /*
    gatewaySocket.evtData.attach(chunk =>
        console.log("From gateway:\n", chunk.grey, "\n\n")
    );
    */
    backendSipApi_1.startListening(gatewaySocket);
    gatewaySocket.evtRequest.attach(function (sipRequest) {
        var flowToken = sipRequest.headers.via[0].params[c.flowTokenKey];
        var clientSocket = clientSockets.get(flowToken);
        if (!clientSocket)
            return;
        clientSocket.addViaHeader(sipRequest);
        clientSocket.shiftRouteAndAddRecordRoute(sipRequest, publicIp);
        clientSocket.write(sipRequest);
    });
    gatewaySocket.evtResponse.attach(function (sipResponse) {
        var flowToken = sipResponse.headers.via[0].params[c.flowTokenKey];
        var clientSocket = clientSockets.get(flowToken);
        if (!clientSocket)
            return;
        clientSocket.rewriteRecordRoute(sipResponse, publicIp);
        sipResponse.headers.via.shift();
        clientSocket.write(sipResponse);
    });
}
