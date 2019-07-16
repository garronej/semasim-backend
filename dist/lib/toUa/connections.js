"use strict";
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
const cookie = require("cookie");
const enableLogger = (socket) => socket.enableLogger({
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
function listen(server, spoofedLocalAddressAndPort) {
    if (server instanceof tls.Server) {
        server.on("secureConnection", tlsSocket => {
            const socket = new sip.Socket(tlsSocket, false, spoofedLocalAddressAndPort);
            enableLogger(socket);
            registerSocket(socket, { "platform": "android" });
        });
    }
    else {
        server.on("connection", async (webSocket, req) => {
            const socket = new sip.Socket(webSocket, false, Object.assign({}, spoofedLocalAddressAndPort, { "remoteAddress": req.socket.remoteAddress, "remotePort": req.socket.remotePort }));
            enableLogger(socket);
            const session = await sessionManager.getSessionFromHttpIncomingMessage(req);
            if (!session) {
                socket.destroy("Anonymous websocket connection");
                return;
            }
            const connectionParams = frontend_1.WebsocketConnectionParams.get(cookie.parse(req.headers.cookie));
            if (connectionParams === undefined) {
                socket.destroy("Client did not provide correct websocket connection parameters");
                return;
            }
            registerSocket(socket, {
                "platform": "web",
                session,
                connectionParams
            });
        });
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
function registerSocket(socket, o) {
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
    if (o.platform === "web") {
        const { session, connectionParams } = o;
        apiServer.startListening(socket);
        setSession(socket, session);
        sip.api.client.enableKeepAlive(socket);
        sip.api.client.enableErrorLogging(socket, sip.api.client.getDefaultErrorLogger({
            idString,
            "log": logger.log
        }));
        if (connectionParams.connectionType === "MAIN") {
            //Main connection
            if (!!getByEmail(session.shared.email) ||
                !!backendConnections.getBindedToEmail(session.shared.email)) {
                //NOTE: this request will end before notify new route so we do not risk to close the new socket.
                remoteApiCaller.notifyLoggedFromOtherTab(session.shared.email);
            }
            byEmail.set(session.shared.email, socket);
            //TODO: Send a push notification.
            backendRemoteApiCaller.collectDonglesOnLan(socket.remoteAddress, session).then(dongles => dongles.forEach(dongle => remoteApiCaller.notifyDongleOnLan(dongle, socket)));
            //TODO: Send push notification.
            dbSemasim.getUserSims(session).then(userSims => userSims
                .filter(frontend_1.types.UserSim.Shared.NotConfirmed.match)
                .forEach(userSim => remoteApiCaller.notifySimSharingRequest(userSim, session.shared.email)));
        }
        if (connectionParams.requestTurnCred) {
            (async () => {
                if (!deploy_1.deploy.isTurnEnabled()) {
                    return undefined;
                }
                const { username, credential, revoke } = await dbTurn.renewAndGetCred((() => {
                    switch (connectionParams.connectionType) {
                        case "MAIN": return session.shared.webUaInstanceId;
                        case "AUXILIARY": return connectionParams.uaInstanceId;
                    }
                })());
                socket.evtClose.attachOnce(() => revoke());
                /*
                We comment out the transport udp as it should never be
                useful as long as the gateway does not have TURN enabled.
                "turn:turn.semasim.com:19302?transport=udp",

                We comment out plain tcp as it does not work with free mobile.
                `turn:turn.${deploy.getBaseDomain()}:19302?transport=tcp`,
                */
                return {
                    "urls": [
                        `stun:turn.${deploy_1.deploy.getBaseDomain()}:19302`,
                        `turns:turn.${deploy_1.deploy.getBaseDomain()}:443?transport=tcp`
                    ],
                    username, credential,
                    "credentialType": "password"
                };
            })().then(params => remoteApiCaller.notifyIceServer(socket, params));
        }
    }
    socket.evtClose.attachOnce(() => {
        byConnectionId.delete(connectionId);
        {
            const set = byAddress.get(socket.remoteAddress);
            set.delete(socket);
            if (set.size === 0) {
                byAddress.delete(socket.remoteAddress);
            }
        }
        const boundToEmail = o.platform === "web" && o.connectionParams.connectionType === "MAIN" ?
            o.session.shared.email : undefined;
        if (boundToEmail !== undefined && byEmail.get(boundToEmail) === socket) {
            byEmail.delete(boundToEmail);
        }
        backendRemoteApiCaller.notifyRoute({
            "type": "DELETE",
            "emails": boundToEmail !== undefined ? [boundToEmail] : undefined,
            "uaAddresses": getByAddress(socket.remoteAddress).size === 0 ?
                [socket.remoteAddress] : undefined,
        });
    });
    router.handle(socket, connectionId);
    backendRemoteApiCaller.notifyRoute({
        "type": "ADD",
        "emails": o.platform === "web" ? [o.session.shared.email] : undefined,
        "uaAddresses": getByAddress(socket.remoteAddress).size === 1 ?
            [socket.remoteAddress] : undefined,
    });
}
const __session__ = "   session   ";
function setSession(socket, session) {
    socket.misc[__session__] = session;
}
/**
 * Assert socket has auth ( i.e: it's a web socket )
 * If the session have expired there is no longer the "user" field on the session
 * object.
 * TODO: Manually test if session has expired.
 * Maybe implement it with a getter in sessionManager.
 * */
function getSession(socket) {
    return socket.misc[__session__];
}
exports.getSession = getSession;
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
