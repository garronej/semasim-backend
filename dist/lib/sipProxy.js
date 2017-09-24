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
var tls = require("tls");
var networkTools = require("../tools/networkTools");
var sipApi_1 = require("./sipApi");
var semasim_gateway_1 = require("../semasim-gateway");
var _constants_1 = require("./_constants");
require("colors");
var _debug = require("debug");
var debug = _debug("_sipProxy");
var informativeHostname = "semasim-backend.invalid";
//TODO: May throw error!
function qualifyContact(contact, timeout) {
    return __awaiter(this, void 0, void 0, function () {
        var flowToken, clientSocket, fromTag, callId, cSeqSequenceNumber, sipRequest, branch, sipResponse, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    flowToken = semasim_gateway_1.Contact.readFlowToken(contact);
                    clientSocket = clientSockets.get(parseFlowToken(flowToken).connectionId);
                    if (!clientSocket)
                        return [2 /*return*/, false];
                    fromTag = "794ee9eb-" + Date.now();
                    callId = "138ce538-" + Date.now();
                    cSeqSequenceNumber = Math.floor(Math.random() * 2000);
                    sipRequest = semasim_gateway_1.sipLibrary.parse([
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
                    branch = clientSocket.addViaHeader(sipRequest);
                    debug("Sending qualify: \n", semasim_gateway_1.sipLibrary.stringify(sipRequest));
                    clientSocket.write(sipRequest);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, clientSocket.evtResponse.waitForExtract(function (_a) {
                            var headers = _a.headers;
                            return headers.via[0].params["branch"] === branch;
                        }, timeout || 1000)];
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
var publicIp = "";
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, interfacePublicIp, interfaceLocalIp, _b, _c, options, servers, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _c = (_b = networkTools).retrieveIpFromHostname;
                    return [4 /*yield*/, _constants_1.c.shared.dnsSrv_sips_tcp];
                case 1: return [4 /*yield*/, _c.apply(_b, [(_h.sent()).name])];
                case 2:
                    _a = _h.sent(), interfacePublicIp = _a.interfacePublicIp, interfaceLocalIp = _a.interfaceLocalIp;
                    publicIp = interfacePublicIp;
                    exports.gatewaySockets = new semasim_gateway_1.sipLibrary.Store();
                    clientSockets = new semasim_gateway_1.sipLibrary.Store();
                    options = _constants_1.c.tlsOptions;
                    servers = [];
                    _d = servers;
                    _e = servers.length;
                    _g = (_f = tls.createServer(options)
                        .on("error", function (error) { throw error; })).listen;
                    return [4 /*yield*/, _constants_1.c.shared.dnsSrv_sips_tcp];
                case 3:
                    _d[_e] = _g.apply(_f, [(_h.sent()).port, interfaceLocalIp])
                        .on("secureConnection", onClientConnection);
                    servers[servers.length] = tls.createServer(options)
                        .on("error", function (error) { throw error; })
                        .listen(_constants_1.c.shared.gatewayPort, interfaceLocalIp)
                        .on("secureConnection", onGatewayConnection);
                    return [4 /*yield*/, Promise.all(servers.map(function (server) { return new Promise(function (resolve) { return server.on("listening", function () { return resolve(); }); }); }))];
                case 4:
                    _h.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.startServer = startServer;
function buildFlowToken(connectionId, imei) {
    return connectionId + "-" + imei;
}
function parseFlowToken(flowToken) {
    var split = flowToken.split("-");
    return {
        "connectionId": split[0],
        "imei": split[1]
    };
}
function handleError(where, socket, sipPacket, error) {
    debug(("Error in: " + where).red);
    debug(error.message);
    socket.destroy();
}
function onClientConnection(clientSocketRaw) {
    var clientSocket = new semasim_gateway_1.sipLibrary.Socket(clientSocketRaw);
    var connectionId = md5(clientSocket.remoteAddress + ":" + clientSocket.remotePort);
    debug((connectionId + " New client socket, " + clientSocket.remoteAddress + ":" + clientSocket.remotePort + "\n\n").yellow);
    clientSockets.add(connectionId, clientSocket);
    /*
    clientSocket.evtPacket.attach(sipPacket =>
        debug("From Client Parsed:\n", sip.stringify(sipPacket).red, "\n\n")
    );
    */
    clientSocket.evtData.attach(function (chunk) {
        return debug("From Client:\n", chunk.yellow, "\n\n");
    });
    clientSocket.evtRequest.attach(function (sipRequest) {
        try {
            var parsedFromUri = semasim_gateway_1.sipLibrary.parseUri(sipRequest.headers.from.uri);
            if (!parsedFromUri.user)
                throw new Error("Request malformed, no IMEI in from header");
            var imei = parsedFromUri.user;
            var gatewaySocket = exports.gatewaySockets.get(imei);
            if (!gatewaySocket)
                throw new Error("Target Gateway not found");
            gatewaySocket.evtClose.detach({ "boundTo": clientSocket });
            gatewaySocket.evtClose.attachOnce(clientSocket, function () {
                debug("Gateway socket closed, closing client socket " + clientSocket.remoteAddress + ":" + clientSocket.remotePort);
                clientSocket.destroy();
            });
            var extraParamFlowToken = {};
            extraParamFlowToken[_constants_1.c.shared.flowTokenKey] = buildFlowToken(connectionId, imei);
            gatewaySocket.addViaHeader(sipRequest, extraParamFlowToken);
            if (sipRequest.method === "REGISTER") {
                semasim_gateway_1.sipLibrary.addOptionTag(sipRequest.headers, "supported", "path");
                //TODO: See if it fail
                sipRequest.headers.route = undefined;
                gatewaySocket.addPathHeader(sipRequest, informativeHostname, extraParamFlowToken);
            }
            else {
                gatewaySocket.shiftRouteAndAddRecordRoute(sipRequest, informativeHostname);
            }
            gatewaySocket.write(sipRequest);
        }
        catch (error) {
            handleError("clientSocket.evtRequest", clientSocket, sipRequest, error);
        }
    });
    clientSocket.evtResponse.attach(function (sipResponse) {
        try {
            var parsedToUri = semasim_gateway_1.sipLibrary.parseUri(sipResponse.headers.to.uri);
            if (!parsedToUri.user)
                throw new Error("Response malformed, no IMEI in to header");
            var imei = parsedToUri.user;
            var gatewaySocket = exports.gatewaySockets.get(imei);
            if (!gatewaySocket)
                throw new Error("Target Gateway not found");
            gatewaySocket.rewriteRecordRoute(sipResponse, informativeHostname);
            sipResponse.headers.via.shift();
            gatewaySocket.write(sipResponse);
        }
        catch (error) {
            handleError("clientSocket.evtResponse", clientSocket, sipResponse, error);
        }
    });
}
function onGatewayConnection(gatewaySocketRaw) {
    debug("New Gateway socket !\n\n".grey);
    var gatewaySocket = new semasim_gateway_1.sipLibrary.Socket(gatewaySocketRaw);
    gatewaySocket.setKeepAlive(true);
    /*
    gatewaySocket.evtPacket.attach(sipPacket =>
        debug("From gateway:\n", sip.stringify(sipPacket).grey, "\n\n")
    );
    */
    gatewaySocket.evtData.attach(function (chunk) {
        return debug("From gateway:\n", chunk.grey, "\n\n");
    });
    sipApi_1.startListening(gatewaySocket);
    gatewaySocket.evtRequest.attach(function (sipRequest) {
        try {
            var flowToken = sipRequest.headers.via[0].params[_constants_1.c.shared.flowTokenKey];
            if (!flowToken)
                throw new Error("No flow token in topmost via header");
            var clientSocket = clientSockets.get(parseFlowToken(flowToken).connectionId);
            if (!clientSocket)
                return;
            clientSocket.addViaHeader(sipRequest);
            clientSocket.shiftRouteAndAddRecordRoute(sipRequest, publicIp);
            clientSocket.write(sipRequest);
        }
        catch (error) {
            handleError("gatewaySocket.evtRequest", gatewaySocket, sipRequest, error);
        }
    });
    gatewaySocket.evtResponse.attach(function (sipResponse) {
        try {
            var flowToken = sipResponse.headers.via[0].params[_constants_1.c.shared.flowTokenKey];
            if (!flowToken)
                throw new Error("No flow token in topmost via header");
            var clientSocket = clientSockets.get(parseFlowToken(flowToken).connectionId);
            if (!clientSocket)
                return;
            clientSocket.rewriteRecordRoute(sipResponse, publicIp);
            sipResponse.headers.via.shift();
            clientSocket.write(sipResponse);
        }
        catch (error) {
            handleError("gatewaySocket.evtResponse", gatewaySocket, sipResponse, error);
        }
    });
}
