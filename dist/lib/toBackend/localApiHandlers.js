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
const apiDeclaration = require("../../sip_api_declarations/backendToBackend");
const sip = require("ts-sip");
const uaConnections = require("../toUa/connections");
const gatewayConnections = require("../toGateway/connections");
const backendConnections = require("./connections");
const remoteApiCaller_1 = require("./remoteApiCaller");
const gatewayRemoteApiCaller = require("../toGateway/remoteApiCaller");
const dbSemasim = require("../dbSemasim");
const uaRemoteApiCaller = require("../toUa/remoteApiCaller");
const util = require("util");
/*
NOTE: None of those methods can are allowed to throw as
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
        "handler": ({ route, methodName_, params_, timeout }) => __awaiter(this, void 0, void 0, function* () {
            const socket = (() => {
                switch (route.target) {
                    case "UA":
                        return uaConnections.getByEmail(route.email);
                    case "GATEWAY":
                        return gatewayConnections.getBindedToImsi(route.imsi);
                }
            })();
            if (!socket) {
                return { "status": "NO ROUTE" };
            }
            try {
                const response_ = yield sip.api.client.sendRequest(socket, methodName_, params_, { timeout, "sanityCheck": remoteApiCaller_1.SanityCheck_.store[methodName_] });
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
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.notifyRoute.methodName;
    const handler = {
        "handler": (params, backendSocket) => {
            const { type, imsis, gatewayAddresses, emails, uaAddresses } = params;
            switch (type) {
                case "ADD":
                    for (const imsi of imsis || []) {
                        backendConnections.bindToImsi(imsi, backendSocket);
                    }
                    for (const gatewayAddress of gatewayAddresses || []) {
                        backendConnections.bindToGatewayAddress(gatewayAddress, backendSocket);
                    }
                    for (const email of emails || []) {
                        backendConnections.bindToEmail(email, backendSocket);
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
                    for (const email of emails || []) {
                        backendConnections.unbindFromEmail(email, backendSocket);
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
                `From: <sip:${imsi}@semasim.com>;tag=${fromTag}`,
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
            prIsAnswered = Promise.race([
                uaSocket.evtClose.attachOnce(sipRequest, () => { }).then(() => false),
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
                }, 2500, () => { }).then(() => true, () => false)
            ]).then(isAnswered => {
                if (uaSocket.evtClose.postCount === 0) {
                    uaSocket.evtClose.detach(sipRequest);
                    if (!isAnswered) {
                        uaSocket.destroy("Remote did sent response to a qualify request");
                    }
                }
                return isAnswered;
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
                tasks[tasks.length] = dbSemasim.filterDongleWithRegistrableSim(uaConnections.getAuth(uaSocket), [dongle]).then(([dongle]) => {
                    if (!dongle) {
                        return;
                    }
                    return uaRemoteApiCaller.notifyDongleOnLan(dongle, uaSocket);
                }).catch(() => { });
            }
            return Promise.all(tasks).then(() => undefined);
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = apiDeclaration.notifyLoggedFromOtherTabProxy.methodName;
    const handler = {
        "handler": ({ email }) => {
            const uaSocket = uaConnections.getByEmail(email);
            if (!uaSocket) {
                return Promise.resolve(undefined);
            }
            else {
                return uaRemoteApiCaller.notifyLoggedFromOtherTab(uaSocket)
                    .then(() => undefined);
            }
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
