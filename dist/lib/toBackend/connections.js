"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sip = require("ts-sip");
const localApiHandlers_1 = require("./localApiHandlers");
const logger = require("logger");
const net = require("net");
const router = require("./router");
const launch_1 = require("../launch");
const gatewayConnections = require("../toGateway/connections");
const uaConnections = require("../toUa/connections");
const remoteApiCaller = require("./remoteApiCaller");
const deploy_1 = require("../../deploy");
//NOTE: We store those in misc to avoid having to register hundreds of close listener.
const __set_of_imsi__ = " set of imsi ";
const __set_of_email__ = " set of email ";
const __set_of_gateway_address__ = " set of gateway address ";
const __set_of_ua_address__ = " set of ua address ";
function listen(server) {
    idString = `backend${launch_1.getLocalRunningInstance().daemonNumber}toBackend`;
    server.on("connection", netSocket => {
        const socket = new sip.Socket(netSocket, true);
        registerSocket(socket);
        remoteApiCaller.notifyRoute({
            "type": "ADD",
            "imsis": gatewayConnections.getImsis(),
            "gatewayAddresses": gatewayConnections.getAddresses(),
            "emails": uaConnections.getEmails(),
            "uaAddresses": uaConnections.getAddresses()
        });
    });
}
exports.listen = listen;
function connect(runningInstance, isInstanceStillRunning) {
    const socket = new sip.Socket(net.connect({
        "host": runningInstance.interfaceAddress,
        "port": runningInstance.interInstancesPort,
        "localAddress": launch_1.getLocalRunningInstance().interfaceAddress
    }), true);
    //TODO: make sure it's ok to define api listener after connect
    socket.evtConnect.attachOnce(() => registerSocket(socket));
    socket.evtClose.attachOnce(() => __awaiter(this, void 0, void 0, function* () {
        if (yield isInstanceStillRunning()) {
            connect(runningInstance, isInstanceStillRunning);
        }
    }));
}
exports.connect = connect;
let idString = "";
const apiServer = new sip.api.Server(localApiHandlers_1.handlers, sip.api.Server.getDefaultLogger({
    idString,
    "log": logger.log,
    "hideKeepAlive": true,
    "displayOnlyErrors": deploy_1.deploy.getEnv() === "DEV" ? false : true
}));
/** Assert: socket is connected */
function registerSocket(socket) {
    apiServer.startListening(socket);
    sip.api.client.enableKeepAlive(socket);
    sip.api.client.enableErrorLogging(socket, sip.api.client.getDefaultErrorLogger({
        idString,
        "log": logger.log
    }));
    socket.enableLogger({
        "socketId": idString,
        "remoteEndId": "BACKEND",
        "localEndId": `BACKEND${launch_1.getLocalRunningInstance().daemonNumber}`,
        "connection": deploy_1.deploy.getEnv() === "DEV" ? true : false,
        "error": true,
        "close": deploy_1.deploy.getEnv() === "DEV" ? true : false,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "colorizedTraffic": undefined,
        "ignoreApiTraffic": true
    }, logger.log);
    const ipEndpoint = `${socket.remoteAddress}:${socket.remotePort}`;
    byIpEndpoint.set(ipEndpoint, socket);
    socket.misc[__set_of_imsi__] = new Set();
    socket.misc[__set_of_email__] = new Set();
    socket.misc[__set_of_gateway_address__] = new Set();
    socket.misc[__set_of_ua_address__] = new Set();
    socket.evtClose.attachOnce(() => {
        for (const imsi of socket.misc[__set_of_imsi__]) {
            unbindFromImsi(imsi, socket);
        }
        for (const email of socket.misc[__set_of_email__]) {
            unbindFromEmail(email, socket);
        }
        for (const gatewayAddress of socket.misc[__set_of_gateway_address__]) {
            unbindFromGatewayAddress(gatewayAddress, socket);
        }
        for (const uaAddress of socket.misc[__set_of_ua_address__]) {
            unbindFromUaAddress(uaAddress, socket);
        }
        byIpEndpoint.delete(ipEndpoint);
    });
    router.handle(socket);
}
const byIpEndpoint = new Map();
function getByIpEndpoint(remoteAddress, remotePort) {
    return byIpEndpoint.get(`${remoteAddress}:${remotePort}`);
}
exports.getByIpEndpoint = getByIpEndpoint;
function getAll() {
    return Array.from(byIpEndpoint.values());
}
exports.getAll = getAll;
const byImsi = new Map();
function bindToImsi(imsi, socket) {
    if (byImsi.has(imsi)) {
        unbindFromImsi(imsi, byImsi.get(imsi));
    }
    byImsi.set(imsi, socket);
    socket.misc[__set_of_imsi__].add(imsi);
}
exports.bindToImsi = bindToImsi;
function unbindFromImsi(imsi, socket) {
    const set_of_imsi = socket.misc[__set_of_imsi__];
    if (!set_of_imsi.has(imsi)) {
        return;
    }
    set_of_imsi.delete(imsi);
    byImsi.delete(imsi);
}
exports.unbindFromImsi = unbindFromImsi;
function getBindedToImsi(imsi) {
    return byImsi.get(imsi);
}
exports.getBindedToImsi = getBindedToImsi;
const byEmail = new Map();
/**
 * If there is an other socket currently binded to the
 * email the previous socket is first unbind.
 * This is not an error, it happen when a user open an other tab.
 */
function bindToEmail(email, socket) {
    if (byEmail.has(email)) {
        unbindFromEmail(email, byEmail.get(email));
    }
    byEmail.set(email, socket);
    socket.misc[__set_of_email__].add(email);
}
exports.bindToEmail = bindToEmail;
/**
 * If at the time this function is called the
 * socket is no longer binded to this email
 * nothing is done, this is not an error.
 */
function unbindFromEmail(email, socket) {
    const set_of_email = socket.misc[__set_of_email__];
    if (!set_of_email.has(email)) {
        return;
    }
    set_of_email.delete(email);
    byEmail.delete(email);
}
exports.unbindFromEmail = unbindFromEmail;
function getBindedToEmail(email) {
    return byEmail.get(email);
}
exports.getBindedToEmail = getBindedToEmail;
const byUaAddress = new Map();
/*
Here we do not need to unbind first because
we can have different processes that hold
connection to the same ua ip.
Whereas for imsi or for email there may be
at most one instance that hold the connection.

We will never receive an unbind after a bind.

*/
function bindToUaAddress(uaAddress, socket) {
    let set = byUaAddress.get(uaAddress);
    if (!set) {
        set = new Set();
        byUaAddress.set(uaAddress, set);
    }
    set.add(socket);
    socket.misc[__set_of_ua_address__].add(uaAddress);
}
exports.bindToUaAddress = bindToUaAddress;
function unbindFromUaAddress(uaAddress, socket) {
    socket.misc[__set_of_ua_address__].delete(uaAddress);
    //Should not be undefined.
    const set = byUaAddress.get(uaAddress);
    set.delete(socket);
    if (set.size === 0) {
        byUaAddress.delete(uaAddress);
    }
}
exports.unbindFromUaAddress = unbindFromUaAddress;
function getBindedToUaAddress(uaAddress) {
    return byUaAddress.get(uaAddress) || new Set();
}
exports.getBindedToUaAddress = getBindedToUaAddress;
const byGatewayAddress = new Map();
/* Symmetric of ua address */
function bindToGatewayAddress(gatewayAddress, socket) {
    let set = byGatewayAddress.get(gatewayAddress);
    if (!set) {
        set = new Set();
        byGatewayAddress.set(gatewayAddress, set);
    }
    set.add(socket);
    socket.misc[__set_of_gateway_address__].add(gatewayAddress);
}
exports.bindToGatewayAddress = bindToGatewayAddress;
function unbindFromGatewayAddress(gatewayAddress, socket) {
    socket.misc[__set_of_gateway_address__].delete(gatewayAddress);
    //Should not be undefined.
    const set = byGatewayAddress.get(gatewayAddress);
    set.delete(socket);
    if (set.size === 0) {
        byGatewayAddress.delete(gatewayAddress);
    }
}
exports.unbindFromGatewayAddress = unbindFromGatewayAddress;
function getBindedToGatewayAddress(uaAddress) {
    return byGatewayAddress.get(uaAddress) || new Set();
}
exports.getBindedToGatewayAddress = getBindedToGatewayAddress;
