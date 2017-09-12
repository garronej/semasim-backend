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
var md5 = require("md5");
var dns = require("dns");
var tls = require("tls");
var network = require("network");
var sipApi_1 = require("./sipApi");
var semasim_gateway_1 = require("../semasim-gateway");
var _constants_1 = require("./_constants");
require("colors");
var _debug = require("debug");
var debug = _debug("_sipProxy");
var informativeHostname = "semasim-backend.invalid";
function qualifyContact(contact, timeout) {
    return __awaiter(this, void 0, void 0, function () {
        var flowToken, clientSocket, fromTag, callId, cSeqSequenceNumber, sipRequest, branch, sipResponse, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    flowToken = semasim_gateway_1.Contact.readFlowToken(contact);
                    clientSocket = clientSockets.get(flowToken);
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
var publicIp = "";
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, interfacePublicIp, interfaceLocalIp, options, servers, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, retrieveIpAddressesOfService()];
                case 1:
                    _a = _f.sent(), interfacePublicIp = _a.interfacePublicIp, interfaceLocalIp = _a.interfaceLocalIp;
                    publicIp = interfacePublicIp;
                    exports.gatewaySockets = new semasim_gateway_1.sipLibrary.Store();
                    clientSockets = new semasim_gateway_1.sipLibrary.Store();
                    options = _constants_1.c.tlsOptions;
                    servers = [];
                    //TODO: get 5061 from DNS
                    _b = servers;
                    _c = servers.length;
                    _e = (_d = tls.createServer(options)
                        .on("error", function (error) { throw error; })).listen;
                    return [4 /*yield*/, _constants_1.c.shared.dnsSrv_sips_tcp];
                case 2:
                    //TODO: get 5061 from DNS
                    _b[_c] = _e.apply(_d, [(_f.sent()).port, interfaceLocalIp])
                        .on("secureConnection", onClientConnection);
                    servers[servers.length] = tls.createServer(options)
                        .on("error", function (error) { throw error; })
                        .listen(_constants_1.c.shared.backendSipProxyListeningPortForGateways, interfaceLocalIp)
                        .on("secureConnection", onGatewayConnection);
                    return [4 /*yield*/, Promise.all(servers.map(function (server) { return new Promise(function (resolve) { return server.on("listening", function () { return resolve(); }); }); }))];
                case 3:
                    _f.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.startServer = startServer;
function onClientConnection(clientSocketRaw) {
    var clientSocket = new semasim_gateway_1.sipLibrary.Socket(clientSocketRaw);
    var flowToken = md5(clientSocket.remoteAddress + ":" + clientSocket.remotePort);
    debug((flowToken + " New client socket, " + clientSocket.remoteAddress + ":" + clientSocket.remotePort + "\n\n").yellow);
    clientSockets.add(flowToken, clientSocket);
    var boundGatewaySocket = null;
    var imei = "";
    /*
    clientSocket.evtPacket.attach(sipPacket =>
        debug("From Client Parsed:\n", sip.stringify(sipPacket).red, "\n\n")
    );
    */
    clientSocket.evtData.attach(function (chunk) {
        return debug("From Client:\n", chunk.yellow, "\n\n");
    });
    clientSocket.evtRequest.attachOnce(function (firstRequest) {
        try {
            var parsedFromUri = semasim_gateway_1.sipLibrary.parseUri(firstRequest.headers.from.uri);
            if (!parsedFromUri.user)
                throw new Error("no imei");
            imei = parsedFromUri.user;
            debug((flowToken + " Client socket, target dongle imei: " + imei).yellow);
            if (!exports.gatewaySockets.get(imei))
                throw new Error("Gateway socket not found");
            boundGatewaySocket = exports.gatewaySockets.get(imei);
            debug((flowToken + " Found path to Gateway ip: " + boundGatewaySocket.remoteAddress).yellow);
        }
        catch (error) {
            debug("Can't route to any gateway: ".red, error.message);
            //Should send 480 temporary unavailable
            clientSocket.destroy();
            return;
        }
        boundGatewaySocket.evtClose.attachOnce(clientSocket, function () {
            debug((flowToken + " Gateway Socket bound closed, destroying client socket").yellow);
            boundGatewaySocket = null;
            clientSocket.destroy();
        });
    });
    clientSocket.evtRequest.attach(function (sipRequest) {
        if (boundGatewaySocket !== exports.gatewaySockets.get(imei)) {
            clientSocket.destroy();
            return;
        }
        try {
            boundGatewaySocket.addViaHeader(sipRequest, extraParamFlowToken(flowToken));
            if (sipRequest.method === "REGISTER") {
                semasim_gateway_1.sipLibrary.addOptionTag(sipRequest.headers, "supported", "path");
                //TODO: See if it fail
                sipRequest.headers.route = undefined;
                boundGatewaySocket.addPathHeader(sipRequest, informativeHostname, extraParamFlowToken(flowToken));
            }
            else
                boundGatewaySocket.shiftRouteAndAddRecordRoute(sipRequest, informativeHostname);
            boundGatewaySocket.write(sipRequest);
        }
        catch (error) {
            handleError("clientSocket.evtRequest", clientSocket, sipRequest, error);
        }
    });
    clientSocket.evtResponse.attach(function (sipResponse) {
        if (boundGatewaySocket !== exports.gatewaySockets.get(imei)) {
            clientSocket.destroy();
            return;
        }
        try {
            boundGatewaySocket.rewriteRecordRoute(sipResponse, informativeHostname);
            sipResponse.headers.via.shift();
            boundGatewaySocket.write(sipResponse);
        }
        catch (error) {
            handleError("clientSocket.evtResponse", clientSocket, sipResponse, error);
        }
    });
    clientSocket.evtClose.attachOnce(function () {
        if (!boundGatewaySocket)
            return;
        boundGatewaySocket.evtClose.detach({ "boundTo": clientSocket });
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
            var clientSocket = clientSockets.get(flowToken);
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
            var clientSocket = clientSockets.get(flowToken);
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
function handleError(where, fromGatewaySocket, sipPacket, error) {
    debug("Unexpected error in: " + where);
    debug(JSON.stringify(sipPacket, null, 2));
    debug(error.stack);
    fromGatewaySocket.destroy();
}
function retrieveIpAddressesOfService() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var name, interfacePublicIp, interfaceLocalIp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, _constants_1.c.shared.dnsSrv_sips_tcp];
                case 1:
                    name = (_a.sent()).name;
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            return dns.resolve4(name, function (error, addresses) {
                                if (error) {
                                    reject(error);
                                    return;
                                }
                                resolve(addresses[0]);
                            });
                        })];
                case 2:
                    interfacePublicIp = _a.sent();
                    return [4 /*yield*/, new Promise(function (resolve, reject) { return network.get_interfaces_list(function (error, interfaces) { return __awaiter(_this, void 0, void 0, function () {
                            var _loop_1, interfaces_1, interfaces_1_1, currentInterface, state_1, e_1_1, e_1, _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (error) {
                                            reject(error);
                                            return [2 /*return*/];
                                        }
                                        _loop_1 = function (currentInterface) {
                                            var currentInterfaceLocalIp, currentInterfacePublicIp;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        currentInterfaceLocalIp = currentInterface.ip_address;
                                                        return [4 /*yield*/, new Promise(function (resolve) { return network.get_public_ip({ "localAddress": currentInterfaceLocalIp }, function (error, res) { return resolve(error ? undefined : res); }); })];
                                                    case 1:
                                                        currentInterfacePublicIp = _a.sent();
                                                        if (currentInterfacePublicIp === interfacePublicIp) {
                                                            resolve(currentInterfaceLocalIp);
                                                            return [2 /*return*/, { value: void 0 }];
                                                        }
                                                        return [2 /*return*/];
                                                }
                                            });
                                        };
                                        _b.label = 1;
                                    case 1:
                                        _b.trys.push([1, 6, 7, 8]);
                                        interfaces_1 = __values(interfaces), interfaces_1_1 = interfaces_1.next();
                                        _b.label = 2;
                                    case 2:
                                        if (!!interfaces_1_1.done) return [3 /*break*/, 5];
                                        currentInterface = interfaces_1_1.value;
                                        return [5 /*yield**/, _loop_1(currentInterface)];
                                    case 3:
                                        state_1 = _b.sent();
                                        if (typeof state_1 === "object")
                                            return [2 /*return*/, state_1.value];
                                        _b.label = 4;
                                    case 4:
                                        interfaces_1_1 = interfaces_1.next();
                                        return [3 /*break*/, 2];
                                    case 5: return [3 /*break*/, 8];
                                    case 6:
                                        e_1_1 = _b.sent();
                                        e_1 = { error: e_1_1 };
                                        return [3 /*break*/, 8];
                                    case 7:
                                        try {
                                            if (interfaces_1_1 && !interfaces_1_1.done && (_a = interfaces_1.return)) _a.call(interfaces_1);
                                        }
                                        finally { if (e_1) throw e_1.error; }
                                        return [7 /*endfinally*/];
                                    case 8:
                                        reject(new Error(name + "(" + interfacePublicIp + ") does not point on any local interface"));
                                        return [2 /*return*/];
                                }
                            });
                        }); }); })];
                case 3:
                    interfaceLocalIp = _a.sent();
                    return [2 /*return*/, {
                            interfaceLocalIp: interfaceLocalIp,
                            interfacePublicIp: interfacePublicIp
                        }];
            }
        });
    });
}
function extraParamFlowToken(flowToken) {
    var extraParams = {};
    extraParams[_constants_1.c.shared.flowTokenKey] = flowToken;
    return extraParams;
}
