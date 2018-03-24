import * as apiDeclaration from "../../../sipApiDeclarations/semasimBackend/clientSide/gatewaySideSockets";
import { sipLibrary } from "../../../../semasim-gateway";
import * as store from "./store";
import * as c from "../../../_constants";
import * as clientSockets from "../clientSockets";

export const handlers: sipLibrary.api.Server.Handlers = {};

(() => {

    const methodName = apiDeclaration.notifyRouteFor.methodName;
    type Params = apiDeclaration.notifyRouteFor.Params;
    type Response = apiDeclaration.notifyRouteFor.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response>= {
        "handler": async ({ sims, gatewaySocketRemoteAddresses }, fromSocket)=>{

            let rejectedSims: string[]= [];

            for( let imsi of sims ){

                if( store.get({ imsi }) ){

                    rejectedSims.push(imsi);

                    continue;

                }

                store.bind({ imsi }, fromSocket);

            }

            for( let gatewaySocketRemoteAddress of gatewaySocketRemoteAddresses ){

                store.bind({ gatewaySocketRemoteAddress }, fromSocket);

            }

            return { rejectedSims };

        }
    };

    handlers[methodName]= handler;

})();

(() => {

    const methodName = apiDeclaration.notifyLostRouteFor.methodName;
    type Params = apiDeclaration.notifyLostRouteFor.Params;
    type Response = apiDeclaration.notifyLostRouteFor.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response>= {
        "handler": ({ sims, gatewaySocketRemoteAddress }, fromSocket)=>{

            for( let imsi of sims ) {
                store.unbind({ imsi }, fromSocket);
            }

            if( !!gatewaySocketRemoteAddress ){

                store.unbind({ gatewaySocketRemoteAddress }, fromSocket);

            }

            return Promise.resolve(undefined);

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.qualifyContact.methodName;
    type Params = apiDeclaration.qualifyContact.Params;
    type Response = apiDeclaration.qualifyContact.Response;

    const pending = new Map<string, Promise<boolean>>();

    pending.set = function set(connectionId, promiseResult) {

        let self: typeof pending = this;

        promiseResult.then(() => self.delete(connectionId));

        return Map.prototype.set.call(self, connectionId, promiseResult);

    }

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": contact => {

            let connectionId = contact.connectionId;

            let clientSocket = clientSockets.get(connectionId);

            if (!clientSocket) {

                return Promise.resolve(false);
            }

            let promiseResult = pending.get(connectionId);

            if (promiseResult) {

                return promiseResult;

            }

            promiseResult = (async () => {

                let fromTag = `794ee9eb-${Date.now()}`;
                let callId = `138ce538-${Date.now()}`;
                let cSeqSequenceNumber = Math.floor(Math.random() * 2000);

                let imsi = contact.uaSim.imsi;

                let sipRequestNextHop = clientSocket.buildNextHopPacket(
                    sipLibrary.parse(Buffer.from([
                        `OPTIONS ${contact.uri} SIP/2.0`,
                        `From: <sip:${imsi}@${c.shared.domain}>;tag=${fromTag}`,
                        `To: <${contact.uri}>`,
                        `Call-ID: ${callId}`,
                        `CSeq: ${cSeqSequenceNumber} OPTIONS`,
                        "Supported: path",
                        "Max-Forwards: 1",
                        "User-Agent: Semasim-backend",
                        "Content-Length:  0",
                        "\r\n"
                    ].join("\r\n"), "utf8")) as sipLibrary.Request
                );

                clientSocket.write(sipRequestNextHop);

                try {

                    await Promise.race([
                        new Promise<never>((_, reject) =>
                            clientSocket!.evtClose.attachOnce(sipRequestNextHop, () =>
                                reject(new Error("Socket disconnected before receiving response to qualify"))
                            )
                        ),
                        clientSocket.evtResponse.attachOnceExtract(
                            sipResponse => {
                                try {

                                    return sipLibrary.isResponse(sipRequestNextHop, sipResponse);

                                } catch{

                                    clientSocket!.destroy();

                                    return false;

                                }
                            },
                            2500,
                            () => clientSocket!.evtClose.detach(sipRequestNextHop)
                        )
                    ]);

                    return true;

                } catch (error) {

                    if (!clientSocket.evtClose.postCount) {
                        clientSocket.destroy();
                    }

                    return false;

                }

            })();

            pending.set(connectionId, promiseResult);

            return promiseResult;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.destroyClientSocket.methodName;
    type Params = apiDeclaration.destroyClientSocket.Params;
    type Response = apiDeclaration.destroyClientSocket.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response>= {
        "handler": contact=>{

            let clientSocket=clientSockets.get(contact.connectionId);

            if( clientSocket ){
                clientSocket.destroy();
            }

            return Promise.resolve(undefined);

        }
    };

    handlers[methodName]= handler;

})();