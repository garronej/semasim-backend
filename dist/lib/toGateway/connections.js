"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImeis = exports.deleteImei = exports.addImei = exports.getAddresses = exports.getByAddress = exports.getImsis = exports.getBindedToImsi = exports.unbindFromImsi = exports.bindToImsi = exports.listen = void 0;
const sip = require("ts-sip");
const localApiHandlers_1 = require("./localApiHandlers");
const dbSemasim = require("../dbSemasim");
const logger_1 = require("../../tools/logger");
const router = require("./router");
const uaRemoteApiCaller = require("../toUa/remoteApiCaller");
const deploy_1 = require("../../deploy");
const backendRemoteApiCaller = require("../toBackend/remoteApiCaller");
const __set_of_imsi__ = " set of imsi ";
function listen(server, spoofedLocalAddressAndPort) {
    const idString = "backendToGateway";
    const apiServer = new sip.api.Server(localApiHandlers_1.handlers, sip.api.Server.getDefaultLogger({
        idString,
        "log": logger_1.logger.log,
        "hideKeepAlive": true,
        "displayOnlyErrors": deploy_1.deploy.getEnv() === "DEV" ? false : true
    }));
    server.on("secureConnection", tlsSocket => {
        const socket = new sip.Socket(tlsSocket, false, spoofedLocalAddressAndPort);
        apiServer.startListening(socket);
        sip.api.client.enableKeepAlive(socket);
        sip.api.client.enableErrorLogging(socket, sip.api.client.getDefaultErrorLogger({
            idString,
            "log": logger_1.logger.log
        }));
        socket.enableLogger({
            "socketId": idString,
            "remoteEndId": "GATEWAY",
            "localEndId": "BACKEND",
            "connection": deploy_1.deploy.getEnv() === "DEV" ? true : false,
            "error": true,
            "close": deploy_1.deploy.getEnv() === "DEV" ? true : false,
            "incomingTraffic": false,
            "outgoingTraffic": false,
            "colorizedTraffic": "OUT",
            "ignoreApiTraffic": true
        }, logger_1.logger.log);
        dbSemasim.addGatewayLocation(socket.remoteAddress);
        {
            let set = byAddress.get(socket.remoteAddress);
            if (!set) {
                set = new Set();
                byAddress.set(socket.remoteAddress, set);
            }
            set.add(socket);
        }
        socket.misc[__set_of_imsi__] = new Set();
        socket.evtClose.attachOnce(() => {
            {
                let set = byAddress.get(socket.remoteAddress);
                set.delete(socket);
                if (set.size === 0) {
                    byAddress.delete(socket.remoteAddress);
                }
            }
            const imsis = Array.from(socket.misc[__set_of_imsi__]);
            imsis.forEach(imsi => unbindFromImsi(imsi, socket));
            dbSemasim.setSimsOffline(imsis)
                .then(uasByImsi => Object.keys(uasByImsi)
                .forEach(imsi => uaRemoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "IS NOW UNREACHABLE",
                    imsi
                },
                "uas": uasByImsi[imsi]
            })));
            backendRemoteApiCaller.notifyRoute({
                "type": "DELETE",
                imsis,
                "gatewayAddresses": getByAddress(socket.remoteAddress).size === 0 ?
                    [socket.remoteAddress] : undefined,
            });
        });
        router.handle(socket);
        backendRemoteApiCaller.notifyRoute({
            "type": "ADD",
            "gatewayAddresses": getByAddress(socket.remoteAddress).size === 1 ?
                [socket.remoteAddress] : undefined,
        });
    });
}
exports.listen = listen;
const byImsi = new Map();
/** Will notify route */
function bindToImsi(imsi, socket) {
    byImsi.set(imsi, socket);
    socket.misc[__set_of_imsi__].add(imsi);
    backendRemoteApiCaller.notifyRoute({
        "type": "ADD",
        "imsis": [imsi]
    });
}
exports.bindToImsi = bindToImsi;
/** Will notify route and set sim as offline in db */
function unbindFromImsi(imsi, socket) {
    /*
    NOTE: If the socket has closed we notify all route lost and
    set sims offline in db all at once
    */
    if (socket.evtClose.postCount === 0) {
        dbSemasim.setSimsOffline([imsi])
            .then(({ [imsi]: uas }) => uaRemoteApiCaller.notifyUserSimChange({
            "params": {
                "type": "IS NOW UNREACHABLE",
                imsi
            },
            uas
        }));
        backendRemoteApiCaller.notifyRoute({
            "type": "DELETE",
            "imsis": [imsi]
        });
    }
    socket.misc[__set_of_imsi__].delete(imsi);
    byImsi.delete(imsi);
}
exports.unbindFromImsi = unbindFromImsi;
function getBindedToImsi(imsi) {
    return byImsi.get(imsi);
}
exports.getBindedToImsi = getBindedToImsi;
function getImsis() {
    return Array.from(byImsi.keys());
}
exports.getImsis = getImsis;
const byAddress = new Map();
function getByAddress(gatewayAddress) {
    return byAddress.get(gatewayAddress) || new Set();
}
exports.getByAddress = getByAddress;
function getAddresses() {
    return Array.from(byAddress.keys());
}
exports.getAddresses = getAddresses;
const __set_of_imei__ = " set of imei ";
function addImei(socket, imei) {
    let set = socket.misc[__set_of_imei__];
    if (!set) {
        set = new Set();
        socket.misc[__set_of_imei__] = set;
    }
    set.add(imei);
}
exports.addImei = addImei;
function deleteImei(socket, imei) {
    socket.misc[__set_of_imei__].delete(imei);
}
exports.deleteImei = deleteImei;
function getImeis(socket) {
    return Array.from(socket.misc[__set_of_imei__] || []);
}
exports.getImeis = getImeis;
