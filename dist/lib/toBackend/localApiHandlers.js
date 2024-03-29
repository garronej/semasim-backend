"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlers = void 0;
const apiDeclaration = require("../../sip_api_declarations/backendToBackend");
const sip = require("ts-sip");
const uaConnections = require("../toUa/connections");
const socketSession_1 = require("../toUa/socketSession");
const gatewayConnections = require("../toGateway/connections");
const backendConnections = require("./connections");
const remoteApiCaller_1 = require("./remoteApiCaller");
const gatewayRemoteApiCaller = require("../toGateway/remoteApiCaller");
const dbSemasim = require("../dbSemasim");
const sessionManager = require("../web/sessionManager");
const uaRemoteApiCaller = require("../toUa/remoteApiCaller");
const util = require("util");
const deploy_1 = require("../../deploy");
const evt_1 = require("evt");
/*
NOTE: None of those methods are allowed to throw as
it would result in the closing of the inter instance socket.

Even if the remote end is a trusted party keep in mind
that some of the handled data are originated from
untrusted party.
those data all passed the sanity check but it
does not guaranty that the remote client is not
altered.
*/
exports.handlers = {};
{
    const methodName = apiDeclaration.forwardRequest.methodName;
    const handler = {
        "handler": async ({ route, methodName_, params_, timeout }) => {
            const socket = (() => {
                switch (route.target) {
                    case "UA":
                        return uaConnections.getByUaInstanceId(route.uaInstanceId);
                    case "GATEWAY":
                        return gatewayConnections.getBindedToImsi(route.imsi);
                }
            })();
            if (!socket) {
                return { "status": "NO ROUTE" };
            }
            try {
                const response_ = await sip.api.client.sendRequest(socket, methodName_, params_, { timeout, "sanityCheck": remoteApiCaller_1.SanityCheck_.store[methodName_] });
                return {
                    "status": "SUCCESS",
                    response_
                };
            }
            catch (error) {
                return {
                    "status": "ERROR",
                    "message": error.message
                };
            }
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.notifyRoute.methodName;
    const handler = {
        "handler": (params, backendSocket) => {
            const { type, imsis, gatewayAddresses, uaInstanceIds, uaAddresses } = params;
            switch (type) {
                case "ADD":
                    for (const imsi of imsis || []) {
                        backendConnections.bindToImsi(imsi, backendSocket);
                    }
                    for (const gatewayAddress of gatewayAddresses || []) {
                        backendConnections.bindToGatewayAddress(gatewayAddress, backendSocket);
                    }
                    for (const uaInstanceId of uaInstanceIds || []) {
                        backendConnections.bindToUaInstanceId(uaInstanceId, backendSocket);
                    }
                    for (const uaAddress of uaAddresses || []) {
                        backendConnections.bindToUaAddress(uaAddress, backendSocket);
                    }
                    break;
                case "DELETE":
                    for (const imsi of imsis || []) {
                        backendConnections.unbindFromImsi(imsi, backendSocket);
                    }
                    for (const gatewayAddress of gatewayAddresses || []) {
                        backendConnections.unbindFromGatewayAddress(gatewayAddress, backendSocket);
                    }
                    for (const uaInstanceId of uaInstanceIds || []) {
                        backendConnections.unbindFromUaInstanceId(uaInstanceId, backendSocket);
                    }
                    for (const uaAddress of uaAddresses || []) {
                        backendConnections.unbindFromUaAddress(uaAddress, backendSocket);
                    }
                    break;
            }
            return Promise.resolve(undefined);
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.qualifyContact.methodName;
    /**
     * Pending qualify request sent to an ua ( by connectionId )
     * Used to avoid sending sending a bunch of qualify
     * before the ua even had time to respond.
     *
     * Map connectionId with a promise of isQualifyAnswered
     *
     * */
    const pendingQualifyRequests = new Map();
    pendingQualifyRequests.set = function set(connectionId, promiseResult) {
        let self = this;
        promiseResult.then(() => self.delete(connectionId));
        return Map.prototype.set.call(self, connectionId, promiseResult);
    };
    const handler = {
        "handler": contact => {
            const connectionId = contact.connectionId;
            const uaSocket = uaConnections.getByConnectionId(connectionId);
            if (!uaSocket) {
                return Promise.resolve(false);
            }
            let prIsAnswered = pendingQualifyRequests.get(connectionId);
            if (prIsAnswered !== undefined) {
                return prIsAnswered;
            }
            const fromTag = `794ee9eb-${Date.now()}`;
            const callId = `138ce538-${Date.now()}`;
            const cSeqSequenceNumber = Math.floor(Math.random() * 2000);
            const imsi = contact.uaSim.imsi;
            const sipRequest = uaSocket.buildNextHopPacket(sip.parse(Buffer.from([
                `OPTIONS ${contact.uri} SIP/2.0`,
                `From: <sip:${imsi}@${deploy_1.deploy.getBaseDomain()}>;tag=${fromTag}`,
                `To: <${contact.uri}>`,
                `Call-ID: ${callId}`,
                `CSeq: ${cSeqSequenceNumber} OPTIONS`,
                "Supported: path",
                "Max-Forwards: 1",
                "User-Agent: Semasim-backend",
                "Content-Length:  0",
                "\r\n"
            ].join("\r\n"), "utf8")));
            uaSocket.write(sipRequest);
            const ctxIdAnswered = evt_1.Evt.newCtx();
            uaSocket.evtClose.attachOnce(ctxIdAnswered, () => ctxIdAnswered.done(false));
            uaSocket.evtResponse.attachOnceExtract(sipResponse => {
                try {
                    return sip.isResponse(sipRequest, sipResponse);
                }
                catch (_a) {
                    uaSocket.destroy([
                        "UA sent a SIP message that made isResponse throw:",
                        util.inspect(sipResponse, { "depth": 7 })
                    ].join(""));
                    return false;
                }
            }, ctxIdAnswered, () => ctxIdAnswered.done(true));
            prIsAnswered = ctxIdAnswered
                .waitFor(2500)
                .catch(() => {
                uaSocket.destroy("Remote didn't sent response to a qualify request");
                return false;
            });
            pendingQualifyRequests.set(connectionId, prIsAnswered);
            return prIsAnswered;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.destroyUaSocket.methodName;
    const handler = {
        "handler": ({ connectionId }) => {
            const uaSocket = uaConnections.getByConnectionId(connectionId);
            if (!!uaSocket) {
                uaSocket.destroy("backendToBackend api destroy ua socket");
            }
            return Promise.resolve(undefined);
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.collectDonglesOnLan.methodName;
    const handler = {
        "handler": ({ gatewayAddress, auth }) => {
            const tasks = [];
            for (const gatewaySocket of gatewayConnections.getByAddress(gatewayAddress)) {
                for (const imei of gatewayConnections.getImeis(gatewaySocket)) {
                    tasks[tasks.length] = gatewayRemoteApiCaller.getDongle(imei, gatewaySocket);
                }
            }
            return Promise.all(tasks)
                .then(dongles => dongles.filter((dongle) => !!dongle))
                .then(dongles => dbSemasim.filterDongleWithRegistrableSim(auth, dongles))
                .catch(() => []);
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.notifyDongleOnLanProxy.methodName;
    const handler = {
        "handler": ({ gatewayAddress, dongle }) => {
            const tasks = [];
            for (const uaSocket of uaConnections.getByAddress(gatewayAddress)) {
                if (uaSocket.protocol !== "WSS") {
                    continue;
                }
                const session = socketSession_1.getSession(uaSocket);
                if (!sessionManager.isAuthenticated(session)) {
                    continue;
                }
                tasks[tasks.length] = dbSemasim.filterDongleWithRegistrableSim(session, [dongle]).then(([dongle]) => {
                    if (!dongle) {
                        return;
                    }
                    return uaRemoteApiCaller.notifyDongleOnLan({ dongle, uaSocket });
                }).catch(() => { });
            }
            return Promise.all(tasks).then(() => undefined);
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.notifyLoggedFromOtherTabProxy;
    const handler = {
        "handler": ({ uaInstanceId }) => {
            const uaSocket = uaConnections.getByUaInstanceId(uaInstanceId);
            return (!uaSocket ?
                Promise.resolve() :
                uaRemoteApiCaller.notifyLoggedFromOtherTab({ uaSocket })).then(() => undefined);
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.unlockSimProxy.methodName;
    const handler = {
        "handler": ({ imei, pin, gatewayAddress }) => {
            const gatewaySocket = Array.from(gatewayConnections.getByAddress(gatewayAddress)).find(gatewaySocket => !!gatewayConnections.getImeis(gatewaySocket)
                .find(imei_ => imei_ === imei));
            if (!gatewaySocket) {
                return Promise.resolve(undefined);
            }
            else {
                return gatewayRemoteApiCaller.unlockSim(imei, pin, gatewaySocket);
            }
        }
    };
    exports.handlers[methodName] = handler;
}
