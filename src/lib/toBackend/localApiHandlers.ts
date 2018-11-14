
import * as apiDeclaration from "../../sip_api_declarations/backendToBackend";
import * as sip from "ts-sip";
import * as uaConnections from "../toUa/connections";
import * as gatewayConnections from "../toGateway/connections";
import * as backendConnections from "./connections";
import { SanityCheck_ } from "./remoteApiCaller";
import * as gatewayRemoteApiCaller from "../toGateway/remoteApiCaller";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as dbSemasim from "../dbSemasim";
import * as uaRemoteApiCaller from "../toUa/remoteApiCaller";
import * as util from "util";
import { deploy } from "../../deploy";

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

export const handlers: sip.api.Server.Handlers = {};

{

    const methodName = apiDeclaration.forwardRequest.methodName;
    type Params = apiDeclaration.forwardRequest.Params<any>;
    type Response = apiDeclaration.forwardRequest.Response<any>;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": async ({ route, methodName_, params_, timeout }) => {

            const socket: sip.Socket | undefined = (() => {

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

                const response_ = await sip.api.client.sendRequest<any, any>(
                    socket,
                    methodName_,
                    params_,
                    { timeout, "sanityCheck": SanityCheck_.store[methodName_] }
                );

                return {
                    "status": "SUCCESS",
                    response_
                };

            } catch (error) {

                return {
                    "status": "ERROR",
                    "message": error.message
                };

            }

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.notifyRoute.methodName;
    type Params = apiDeclaration.notifyRoute.Params;
    type Response = apiDeclaration.notifyRoute.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
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

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.qualifyContact.methodName;
    type Params = apiDeclaration.qualifyContact.Params;
    type Response = apiDeclaration.qualifyContact.Response;

    /** 
     * Pending qualify request sent to an ua ( by connectionId ) 
     * Used to avoid sending sending a bunch of qualify 
     * before the ua even had time to respond.
     * 
     * Map connectionId with a promise of isQualifyAnswered
     * 
     * */
    const pendingQualifyRequests = new Map<string, Promise<boolean>>();

    pendingQualifyRequests.set = function set(connectionId, promiseResult) {

        let self: typeof pendingQualifyRequests = this;

        promiseResult.then(() => self.delete(connectionId));

        return Map.prototype.set.call(self, connectionId, promiseResult);

    }

    const handler: sip.api.Server.Handler<Params, Response> = {
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

            const sipRequest = uaSocket.buildNextHopPacket(
                sip.parse(Buffer.from([
                    `OPTIONS ${contact.uri} SIP/2.0`,
                    `From: <sip:${imsi}@${deploy.getBaseDomain()}>;tag=${fromTag}`,
                    `To: <${contact.uri}>`,
                    `Call-ID: ${callId}`,
                    `CSeq: ${cSeqSequenceNumber} OPTIONS`,
                    "Supported: path",
                    "Max-Forwards: 1",
                    "User-Agent: Semasim-backend",
                    "Content-Length:  0",
                    "\r\n"
                ].join("\r\n"), "utf8")) as sip.Request
            );

            uaSocket.write(sipRequest);

            prIsAnswered = Promise.race([
                uaSocket.evtClose.attachOnce(sipRequest, () => { }).then(() => false),
                uaSocket.evtResponse.attachOnceExtract(
                    sipResponse => {
                        try {

                            return sip.isResponse(sipRequest, sipResponse);

                        } catch{

                            uaSocket.destroy([
                                "UA sent a SIP message that made isResponse throw:",
                                util.inspect(sipResponse, { "depth": 7 })
                            ].join(""));

                            return false;

                        }
                    },
                    2500,
                    () => { }
                ).then(() => true, () => false)
            ]).then(isAnswered => {

                if (uaSocket.evtClose.postCount === 0) {

                    uaSocket.evtClose.detach(sipRequest);

                    if (!isAnswered) {

                        uaSocket.destroy("Remote didn't sent response to a qualify request");

                    }
                }

                return isAnswered;

            });

            pendingQualifyRequests.set(connectionId, prIsAnswered);

            return prIsAnswered;

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.destroyUaSocket.methodName;
    type Params = apiDeclaration.destroyUaSocket.Params;
    type Response = apiDeclaration.destroyUaSocket.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": ({ connectionId }) => {

            const uaSocket = uaConnections.getByConnectionId(connectionId);

            if (!!uaSocket) {
                uaSocket.destroy("backendToBackend api destroy ua socket");
            }

            return Promise.resolve(undefined);

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.collectDonglesOnLan.methodName;
    type Params = apiDeclaration.collectDonglesOnLan.Params;
    type Response = apiDeclaration.collectDonglesOnLan.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": ({ gatewayAddress, auth }) => {

            const tasks: Promise<dcTypes.Dongle | undefined>[] = [];

            for (const gatewaySocket of gatewayConnections.getByAddress(gatewayAddress)) {

                for (const imei of gatewayConnections.getImeis(gatewaySocket)) {

                    tasks[tasks.length] = gatewayRemoteApiCaller.getDongle(imei, gatewaySocket);

                }

            }

            return Promise.all(tasks)
                .then(dongles => dongles.filter((dongle): dongle is dcTypes.Dongle => !!dongle))
                .then(dongles => dbSemasim.filterDongleWithRegistrableSim(auth, dongles))
                .catch(() => [])
                ;

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.notifyDongleOnLanProxy.methodName;
    type Params = apiDeclaration.notifyDongleOnLanProxy.Params;
    type Response = apiDeclaration.notifyDongleOnLanProxy.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": ({ gatewayAddress, dongle }) => {

            const tasks: Promise<void>[] = [];

            for (const uaSocket of uaConnections.getByAddress(gatewayAddress)) {

                if (uaSocket.protocol !== "WSS") {
                    continue;
                }

                tasks[tasks.length] = dbSemasim.filterDongleWithRegistrableSim(
                    uaConnections.getAuth(uaSocket),
                    [dongle]
                ).then(([dongle]) => {

                    if (!dongle) {
                        return;
                    }

                    return uaRemoteApiCaller.notifyDongleOnLan(
                        dongle, uaSocket
                    );

                }).catch(() => { });

            }

            return Promise.all(tasks).then(() => undefined);

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.notifyLoggedFromOtherTabProxy.methodName;
    type Params = apiDeclaration.notifyLoggedFromOtherTabProxy.Params;
    type Response = apiDeclaration.notifyLoggedFromOtherTabProxy.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": ({ email }) => {

            const uaSocket = uaConnections.getByEmail(email);

            if (!uaSocket) {
                return Promise.resolve(undefined);
            } else {
                return uaRemoteApiCaller.notifyLoggedFromOtherTab(uaSocket)
                    .then(() => undefined);
            }

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.unlockSimProxy.methodName;
    type Params = apiDeclaration.unlockSimProxy.Params;
    type Response = apiDeclaration.unlockSimProxy.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": ({ imei, pin, gatewayAddress }) => {

            const gatewaySocket = Array.from(
                gatewayConnections.getByAddress(gatewayAddress)
            ).find( gatewaySocket => 
                !!gatewayConnections.getImeis(gatewaySocket)
                    .find(imei_ => imei_ === imei)
            );

            if( !gatewaySocket ){

                return Promise.resolve(undefined);

            }else{

                return gatewayRemoteApiCaller.unlockSim(
                    imei, pin,
                    gatewaySocket
                );

            }

        }
    };

    handlers[methodName] = handler;

}
