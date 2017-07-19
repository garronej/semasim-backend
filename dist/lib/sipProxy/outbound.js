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
require("rejection-tracker").main(__dirname, "..", "..", "..");
var net = require("net");
var shared = require("./shared");
var md5 = require("md5");
var sip = require("./sip");
var path = require("path");
var fs = require("fs");
var tls = require("tls");
require("colors");
//TODO device is not trustable.
//TODO: decrement max forward
console.log("Outbound sipProxy started!");
var publicIp;
var deviceSockets;
var clientSockets;
(function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var options;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, shared.getOutboundProxyPublicIp()];
                case 1:
                    publicIp = _a.sent();
                    deviceSockets = new sip.Store();
                    clientSockets = new sip.Store();
                    options = (function () {
                        var pathToCerts = path.join("/", "home", "admin", "ns.semasim.com");
                        var key = fs.readFileSync(path.join(pathToCerts, "privkey2.pem"), "utf8");
                        var cert = fs.readFileSync(path.join(pathToCerts, "fullchain2.pem"), "utf8");
                        var ca = fs.readFileSync(path.join(pathToCerts, "chain2.pem"), "utf8");
                        return { key: key, cert: cert, ca: ca };
                    })();
                    net.createServer()
                        .on("error", function (error) { throw error; })
                        .listen(5060, "0.0.0.0")
                        .on("connection", onClientConnection);
                    tls.createServer(options)
                        .on("error", function (error) { throw error; })
                        .listen(5061, "0.0.0.0")
                        .on("secureConnection", onClientConnection);
                    tls.createServer(options)
                        .on("error", function (error) { throw error; })
                        .listen(shared.relayPort, "0.0.0.0")
                        .on("secureConnection", onDeviceConnection);
                    return [2 /*return*/];
            }
        });
    });
})();
function onClientConnection(clientSocketRaw) {
    //let clientSocket = new sip.Socket(clientSocketRaw, 31000);
    var clientSocket = new sip.Socket(clientSocketRaw);
    clientSocket.disablePong = true;
    clientSocket.evtPing.attach(function () { return console.log("Client ping!"); });
    clientSocket.evtTimeout.attachOnce(function () {
        console.log("Client timeout!");
        clientSocket.destroy();
    });
    var flowToken = md5(clientSocket.remoteAddress + ":" + clientSocket.remotePort);
    console.log((flowToken + " New client socket, " + clientSocket.remoteAddress + ":" + clientSocket.remotePort + "\n\n").yellow);
    clientSockets.add(flowToken, clientSocket);
    var boundDeviceSocket = undefined;
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
            var imei = parsedFromUri.user;
            if (!imei)
                throw new Error("no imei");
            console.log((flowToken + " Client socket, target dongle imei: " + imei).yellow);
            boundDeviceSocket = deviceSockets.get(imei);
            if (!boundDeviceSocket)
                throw new Error("device socket not found");
        }
        catch (error) {
            console.log("Can't route to proxy: ".yellow, error.message);
            //Should send 480 temporary unavailable
            clientSocket.destroy();
            return;
        }
        boundDeviceSocket.evtClose.attachOnce(clientSocket, function () {
            console.log((flowToken + " Device Socket bound closed, destroying client socket").yellow);
            boundDeviceSocket = undefined;
            clientSocket.destroy();
        });
    });
    clientSocket.evtRequest.attach(function (sipRequest) {
        if (!boundDeviceSocket)
            return;
        if (sipRequest.method === "REGISTER") {
            console.log("new register on flow token: " + flowToken);
        }
        boundDeviceSocket.addViaHeader(sipRequest, (function () {
            var extraParams = {};
            extraParams[shared.flowTokenKey] = flowToken;
            return extraParams;
        })());
        var displayedAddr = "semasim-outbound-proxy.invalid";
        if (sipRequest.method === "REGISTER") {
            sip.addOptionTag(sipRequest.headers, "supported", "path");
            boundDeviceSocket.addPathHeader(sipRequest, displayedAddr);
        }
        else {
            boundDeviceSocket.shiftRouteAndAddRecordRoute(sipRequest, displayedAddr);
        }
        boundDeviceSocket.write(sipRequest);
    });
    clientSocket.evtResponse.attach(function (sipResponse) {
        if (!boundDeviceSocket)
            return;
        boundDeviceSocket.rewriteRecordRoute(sipResponse, "semasim-outbound-proxy.invalid");
        sipResponse.headers.via.shift();
        boundDeviceSocket.write(sipResponse);
    });
    clientSocket.evtClose.attachOnce(function () {
        if (!boundDeviceSocket)
            return;
        console.log((flowToken + " Client socket closed AND boundDeviceSocket is not, notify device").yellow);
        boundDeviceSocket.write(shared.Message.NotifyBrokenFlow.buildSipRequest(flowToken));
        boundDeviceSocket.evtClose.detach({ "boundTo": clientSocket });
    });
}
function onDeviceConnection(deviceSocketRaw) {
    console.log("New device socket !\n\n".grey);
    var deviceSocket = new sip.Socket(deviceSocketRaw);
    deviceSocket.setKeepAlive(true);
    deviceSocket.evtPacket.attach(function (sipPacket) {
        return console.log("From device:\n", sip.stringify(sipPacket).grey, "\n\n");
    });
    /*
    deviceSocket.evtData.attach(chunk =>
        console.log("From device:\n", chunk.grey, "\n\n")
    );
    */
    deviceSocket.evtRequest.attachExtract(function (sipRequest) { return shared.Message.matchSipRequest(sipRequest); }, function (sipRequest) {
        var message = shared.Message.parseSipRequest(sipRequest);
        if (shared.Message.NotifyKnownDongle.match(message)) {
            //TODO: this can be hacked
            if (deviceSockets.getTimestamp(message.imei) < message.lastConnection) {
                console.log(("Device socket handle dongle imei: " + message.imei).grey);
                deviceSockets.add(message.imei, deviceSocket, message.lastConnection);
            }
        }
        else if (shared.Message.NotifyBrokenFlow.match(message)) {
            console.log(message.flowToken + " Device notify connection closed, destroying client socket");
            var clientSocket = clientSockets.get(message.flowToken);
            if (!clientSocket) {
                console.log(message.flowToken + " Client connection was closed already");
                return;
            }
            ;
            clientSocket.destroy();
        }
    });
    deviceSocket.evtRequest.attach(function (sipRequest) {
        var flowToken = sipRequest.headers.via[0].params[shared.flowTokenKey];
        var clientSocket = clientSockets.get(flowToken);
        if (!clientSocket)
            return;
        clientSocket.addViaHeader(sipRequest);
        clientSocket.shiftRouteAndAddRecordRoute(sipRequest, publicIp);
        clientSocket.write(sipRequest);
    });
    deviceSocket.evtResponse.attach(function (sipResponse) {
        var flowToken = sipResponse.headers.via[0].params[shared.flowTokenKey];
        var clientSocket = clientSockets.get(flowToken);
        if (!clientSocket)
            return;
        clientSocket.rewriteRecordRoute(sipResponse, publicIp);
        sipResponse.headers.via.shift();
        clientSocket.write(sipResponse);
    });
}
