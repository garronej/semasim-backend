"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sip = require("ts-sip");
const sessionManager = require("../web/sessionManager");
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
const noThrow_1 = require("../../tools/noThrow");
//import { debug } from "util";
const getUserSims = noThrow_1.buildNoThrowProxyFunction(dbSemasim.getUserSims, dbSemasim);
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
    server.on("connection", async (webSocket, req) => {
        const socket = new sip.Socket(webSocket, false, Object.assign(Object.assign({}, spoofedLocalAddressAndPort), { "remoteAddress": req.socket.remoteAddress, "remotePort": req.socket.remotePort }));
        enableLogger(socket);
        const connectionParams = (() => {
            let out;
            try {
                out = frontend_1.urlGetParameters.parseUrl(req.url);
            }
            catch (_a) {
                return undefined;
            }
            if (!((out.requestTurnCred === "DO NOT REQUEST TURN CRED" ||
                out.requestTurnCred === "REQUEST TURN CRED") &&
                typeof out.connect_sid === "string")) {
                return undefined;
            }
            return out;
        })();
        if (connectionParams === undefined) {
            socket.destroy("Client did not provide correct websocket connection parameters");
            return;
        }
        let session;
        try {
            session = await sessionManager.getReadonlyAuthenticatedSession(connectionParams.connect_sid);
        }
        catch (error) {
            socket.destroy(error.message);
            return;
        }
        registerSocket(socket, session, connectionParams);
    });
}
exports.listen = listen;
const idString = "backendToUa";
const apiServer = new sip.api.Server(localApiHandlers_1.handlers, sip.api.Server.getDefaultLogger({
    idString,
    "log": logger.log,
    "hideKeepAlive": true,
    "displayOnlyErrors": deploy_1.deploy.getEnv() === "DEV" ? false : true
}));
function registerSocket(socket, session, connectionParams) {
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
    apiServer.startListening(socket);
    setSession(socket, session);
    sip.api.client.enableKeepAlive(socket);
    //sip.api.client.enableKeepAlive(socket, 5000);
    sip.api.client.enableErrorLogging(socket, sip.api.client.getDefaultErrorLogger({
        idString,
        "log": logger.log
    }));
    if (!!getByUaInstanceId(session.shared.uaInstanceId) ||
        !!backendConnections.getBoundToUaInstanceId(session.shared.uaInstanceId)) {
        //NOTE: this request will end before notify new route so we do not risk to close the new socket.
        remoteApiCaller.notifyLoggedFromOtherTab(session.shared.uaInstanceId);
    }
    byUaInstanceId.set(session.shared.uaInstanceId, socket);
    backendRemoteApiCaller.collectDonglesOnLan(socket.remoteAddress, session).then(dongles => dongles.forEach(dongle => remoteApiCaller.notifyDongleOnLan(dongle, socket)));
    getUserSims(session).then(userSims => userSims
        .filter(frontend_1.types.UserSim.Shared.NotConfirmed.match)
        .forEach(userSim => remoteApiCaller.notifySimSharingRequest(userSim, socket)));
    if (connectionParams.requestTurnCred === "REQUEST TURN CRED") {
        (async () => {
            if (!deploy_1.deploy.isTurnEnabled()) {
                return undefined;
            }
            const { username, credential, revoke } = await dbTurn.renewAndGetCred(session.shared.uaInstanceId);
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
    socket.evtClose.attachOnce(() => {
        byConnectionId.delete(connectionId);
        {
            const set = byAddress.get(socket.remoteAddress);
            set.delete(socket);
            if (set.size === 0) {
                byAddress.delete(socket.remoteAddress);
            }
        }
        let uaInstanceId = session.shared.uaInstanceId;
        if (byUaInstanceId.get(session.shared.uaInstanceId) === socket) {
            byUaInstanceId.delete(session.shared.uaInstanceId);
        }
        else {
            uaInstanceId = undefined;
        }
        backendRemoteApiCaller.notifyRoute({
            "type": "DELETE",
            "uaInstanceIds": uaInstanceId !== undefined ? [uaInstanceId] : undefined,
            "uaAddresses": getByAddress(socket.remoteAddress).size === 0 ?
                [socket.remoteAddress] : undefined,
        });
    });
    router.handle(socket, connectionId);
    backendRemoteApiCaller.notifyRoute({
        "type": "ADD",
        "uaInstanceIds": [session.shared.uaInstanceId],
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
const byUaInstanceId = new Map();
function getByUaInstanceId(uaInstanceId) {
    return byUaInstanceId.get(uaInstanceId);
}
exports.getByUaInstanceId = getByUaInstanceId;
function getUaInstanceIds() {
    return Array.from(byUaInstanceId.keys());
}
exports.getUaInstanceIds = getUaInstanceIds;
const byAddress = new Map();
function getByAddress(uaAddress) {
    return byAddress.get(uaAddress) || new Set();
}
exports.getByAddress = getByAddress;
function getAddresses() {
    return Array.from(byAddress.keys());
}
exports.getAddresses = getAddresses;
