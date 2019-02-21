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
const sessionManager = require("../web/sessionManager");
const tls = require("tls");
const gateway_1 = require("../../gateway");
const router = require("./router");
const backendRemoteApiCaller = require("../toBackend/remoteApiCaller");
const backendConnections = require("../toBackend/connections");
const remoteApiCaller = require("./remoteApiCaller");
const logger = require("logger");
const localApiHandlers_1 = require("./localApiHandlers");
const dbSemasim = require("../dbSemasim");
const frontend_1 = require("../../frontend");
const dbTurn = require("../dbTurn");
const deploy_1 = require("../../deploy");
function listen(server, spoofedLocalAddressAndPort) {
    if (server instanceof tls.Server) {
        server.on("secureConnection", tlsSocket => registerSocket(new sip.Socket(tlsSocket, false, spoofedLocalAddressAndPort), undefined));
    }
    else {
        server.on("connection", (webSocket, req) => __awaiter(this, void 0, void 0, function* () {
            return registerSocket(new sip.Socket(webSocket, false, Object.assign({}, spoofedLocalAddressAndPort, { "remoteAddress": req.socket.remoteAddress, "remotePort": req.socket.remotePort })), yield sessionManager.getAuth(req));
        }));
    }
}
exports.listen = listen;
const idString = "backendToUa";
const apiServer = new sip.api.Server(localApiHandlers_1.handlers, sip.api.Server.getDefaultLogger({
    idString,
    "log": logger.log,
    "hideKeepAlive": true,
    "displayOnlyErrors": deploy_1.deploy.getEnv() === "DEV" ? false : true
}));
function registerSocket(socket, auth) {
    if (socket.protocol === "WSS" && !auth) {
        socket.destroy("User is not authenticated ( no auth for this websocket)");
        return;
    }
    const connectionId = gateway_1.misc.cid.generate(socket);
    byConnectionId.set(connectionId, socket);
    {
        let set = byAddress.get(socket.remoteAddress);
        if (!set) {
            set = new Set();
            byAddress.set(socket.remoteAddress, set);
        }
        set.add(socket);
    }
    socket.enableLogger({
        "socketId": idString,
        "remoteEndId": "UA",
        "localEndId": "BACKEND",
        "connection": deploy_1.deploy.getEnv() === "DEV" ? true : false,
        "error": true,
        "close": deploy_1.deploy.getEnv() === "DEV" ? true : false,
        "incomingTraffic": deploy_1.deploy.getEnv() === "DEV" ? true : false,
        "outgoingTraffic": deploy_1.deploy.getEnv() === "DEV" ? true : false,
        "colorizedTraffic": "IN",
        "ignoreApiTraffic": true
    }, logger.log);
    if (!!auth) {
        apiServer.startListening(socket);
        setAuth(socket, auth);
        sip.api.client.enableKeepAlive(socket);
        sip.api.client.enableErrorLogging(socket, sip.api.client.getDefaultErrorLogger({
            idString,
            "log": logger.log
        }));
        if (!!getByEmail(auth.email) ||
            !!backendConnections.getBindedToEmail(auth.email)) {
            //NOTE: this request will end before notify new route so we do not risk to close the new socket.
            remoteApiCaller.notifyLoggedFromOtherTab(auth.email);
        }
        byEmail.set(auth.email, socket);
        remote_api_calls: {
            backendRemoteApiCaller.collectDonglesOnLan(socket.remoteAddress, auth).then(dongles => dongles.forEach(dongle => remoteApiCaller.notifyDongleOnLan(dongle, socket)));
            dbSemasim.getUserSims(auth).then(userSims => userSims
                .filter(frontend_1.types.UserSim.Shared.NotConfirmed.match)
                .forEach(userSim => remoteApiCaller.notifySimSharingRequest(userSim, auth.email)));
            if (deploy_1.deploy.isTurnEnabled()) {
                /*
                We comment out the transport udp as it should never be
                useful as long as the gateway does not have TURN enabled.
                "turn:turn.semasim.com:19302?transport=udp",
                */
                dbTurn.renewAndGetCred(localApiHandlers_1.getUserWebUaInstanceId(auth.user)).then(({ username, credential, revoke }) => {
                    remoteApiCaller.notifyIceServer(socket, {
                        "urls": [
                            `stun:turn.${deploy_1.deploy.getBaseDomain()}:19302`,
                            `turn:turn.${deploy_1.deploy.getBaseDomain()}:19302?transport=tcp`,
                            `turns:turn.${deploy_1.deploy.getBaseDomain()}:443?transport=tcp`
                        ],
                        username, credential,
                        "credentialType": "password"
                    });
                    socket.evtClose.attachOnce(() => revoke());
                });
            }
        }
    }
    socket.evtClose.attachOnce(() => {
        byConnectionId.delete(connectionId);
        {
            let set = byAddress.get(socket.remoteAddress);
            set.delete(socket);
            if (set.size === 0) {
                byAddress.delete(socket.remoteAddress);
            }
        }
        if (!!auth && byEmail.get(auth.email) === socket) {
            byEmail.delete(auth.email);
        }
        backendRemoteApiCaller.notifyRoute({
            "type": "DELETE",
            "emails": !!auth ? [auth.email] : undefined,
            "uaAddresses": getByAddress(socket.remoteAddress).size === 0 ?
                [socket.remoteAddress] : undefined,
        });
    });
    router.handle(socket, connectionId);
    backendRemoteApiCaller.notifyRoute({
        "type": "ADD",
        "emails": !!auth ? [auth.email] : undefined,
        "uaAddresses": getByAddress(socket.remoteAddress).size === 1 ?
            [socket.remoteAddress] : undefined,
    });
}
const __auth__ = "   auth   ";
function setAuth(socket, auth) {
    socket.misc[__auth__] = auth;
}
/** Assert socket has auth ( i.e: it's a web socket ) */
function getAuth(socket) {
    return socket.misc[__auth__];
}
exports.getAuth = getAuth;
const byConnectionId = new Map();
function getByConnectionId(connectionId) {
    return byConnectionId.get(connectionId);
}
exports.getByConnectionId = getByConnectionId;
const byEmail = new Map();
function getByEmail(email) {
    return byEmail.get(email);
}
exports.getByEmail = getByEmail;
function getEmails() {
    return Array.from(byEmail.keys());
}
exports.getEmails = getEmails;
const byAddress = new Map();
function getByAddress(uaAddress) {
    return byAddress.get(uaAddress) || new Set();
}
exports.getByAddress = getByAddress;
function getAddresses() {
    return Array.from(byAddress.keys());
}
exports.getAddresses = getAddresses;
