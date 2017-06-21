import * as net from "net";
import * as sip from "./sip";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import { DongleExtendedClient, Ami } from "chan-dongle-extended-client";
import * as shared from "./shared";
import * as os from "os";
import * as pjsip from "../pjsip";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy/inbound");

const localIp= os.networkInterfaces()["eth0"].filter( ({family})=> family === "IPv4" )[0]["address"];

export const evtIncomingMessage = new SyncEvent<{
    message: sip.Request;
    fromContact: string;
}>();

const evtOutgoingMessage = new SyncEvent<{ 
    sipRequest: sip.Request;
    evtReceived: VoidSyncEvent;
}>();

export function sendMessage(
    pjsipContactUri: string,
    fromUriUser: string,
    headers: Record<string, string>,
    content: string,
    fromName?: string
): Promise<boolean> {

    return new Promise<boolean>(resolve => {

        //console.log("sending message", { contact, fromUriUser, headers, content, fromName });

        let actionId = Ami.generateUniqueActionId();

        DongleExtendedClient.localhost().ami.messageSend(
            `pjsip:${pjsipContactUri}`, fromUriUser, actionId
        ).catch( error=> {

            debug("message send failed", error.message);            

        });

        evtOutgoingMessage.attachOnce(
            ({ sipRequest }) => sipRequest.content === actionId,
            ({ sipRequest, evtReceived }) => {

                if (fromName) sipRequest.headers.from.name = fromName;

                sipRequest.headers.to.params["messagetype"]="SMS";

                delete sipRequest.headers.contact;

                sipRequest.content = content;

                sipRequest.headers = {
                    ...sipRequest.headers,
                    ...headers
                };

                evtReceived.waitFor(3000).then(()=> resolve(true)).catch(()=> resolve(false));

            }
        );
        

    });


}

function matchTextMessage(sipRequest: sip.Request): boolean {

    return (
        sipRequest.method === "MESSAGE" &&
        sipRequest.headers["content-type"].match(/^text\/plain/)
    );

}

export async function start() {

    debug("(re)Staring !");

    let asteriskSockets = new sip.Store();

    let proxySocket = new sip.Socket(
        net.createConnection(shared.relayPort, await shared.getOutboundProxyPublicIp())
    );

    proxySocket.setKeepAlive(true);

    /*
    proxySocket.evtData.attach( chunk=> 
        console.log("From proxy:\n", chunk.yellow, "\n\n")
    );


    proxySocket.evtPacket.attach(sipPacket =>
        console.log("From proxy:\n", sip.stringify(sipPacket).yellow, "\n\n")
    );
    */

    proxySocket.evtRequest.attach(async sipRequest => {

        let flowToken = sipRequest.headers.via[0].params[shared.flowTokenKey]!;

        let asteriskSocket = asteriskSockets.get(flowToken);

        if (!asteriskSocket)
            asteriskSocket = createAsteriskSocket(flowToken);


        if( !asteriskSocket.evtConnect.postCount )
            await asteriskSocket.evtConnect.waitFor();


        let branch= asteriskSocket.addViaHeader(sipRequest);

        sip.updateContactHeader(sipRequest, "127.0.0.1", asteriskSocket.localPort, "TCP", (()=>{

            let extraParams: Record<string, string>= {};

            extraParams[shared.flowTokenKey]= flowToken;

            return extraParams;

        })());

        //TODO make sure the message is accepted instead of authorization
        if (matchTextMessage(sipRequest) && "authorization" in sipRequest.headers) 
            pjsip.getContactOfFlow(flowToken)
                .then(contact =>
                    evtIncomingMessage.post(
                        { "message": sipRequest, "fromContact": contact! }
                    )
                );

        asteriskSocket.write(sipRequest);

        asteriskSocket.evtResponse.attachOnce(
            ({ headers }) => headers.via[0].params["branch"] === branch,
            sipResponse => {

                sipResponse.headers.via.shift();

                proxySocket.write(sipResponse);

            }
        );

    });


    proxySocket.evtRequest.attachExtract(
        sipRequest => shared.Message.matchSipRequest(sipRequest),
        sipRequest => {

            let message = shared.Message.parseSipRequest(sipRequest);

            if (shared.Message.NotifyBrokenFlow.match(message)) {

                debug(`${message.flowToken} Outbound notify flow ended, destroying asterisk socket`);

                let asteriskSocket = asteriskSockets.get(message.flowToken);

                if (!asteriskSocket){

                    debug(`${message.flowToken} asterisk socket was close already`);

                    return;

                };

                asteriskSocket.destroy();

            }


        }
    );

    proxySocket.evtClose.attachOnce(() => {

        //TODO see what is the state of contacts

        debug("proxy socket closed, destroying all asterisk socket, waiting and restarting");

        asteriskSockets.destroyAll();

        setTimeout(() => start(), 10000);

    });


    proxySocket.evtConnect.attachOnce(async () => {

        debug("connection established with proxy");

        for (let { endpoint, lastUpdated } of await pjsip.queryEndpoints())
            notifyHandledDongle(endpoint, lastUpdated);

    });

    DongleExtendedClient.localhost().evtDongleConnect.attach(imei => notifyHandledDongle(imei, Date.now()));

    async function notifyHandledDongle(imei: string, lastConnection: number) {

        if (!proxySocket.evtConnect.postCount)
            await proxySocket.evtConnect.waitFor();

        proxySocket.write(
            shared.Message.NotifyKnownDongle.buildSipRequest(
                imei, lastConnection
            )
        );

    }

    function createAsteriskSocket(flowToken: string): sip.Socket {

        debug(`${flowToken} Creating asterisk socket`);

        let asteriskSocket = new sip.Socket(net.createConnection(5060, "127.0.0.1"));

        asteriskSockets.add(flowToken, asteriskSocket);

        /*
        asteriskSocket.evtPacket.attach(sipPacket =>
            console.log("From Asterisk:\n", sip.stringify(sipPacket).grey, "\n\n")
        );

        asteriskSocket.evtData.attach( chunk =>
            console.log("From Asterisk:\n", chunk.grey, "\n\n")
        );
        */

        asteriskSocket.evtRequest.attach(sipRequest => {

            let branch = proxySocket.addViaHeader(sipRequest, (() => {

                let extraParams: Record<string, string> = {};

                extraParams[shared.flowTokenKey] = flowToken;

                return extraParams;

            })());

            sip.updateUri(sipRequest.headers.to, { "host": "semasim.com" });
            sip.updateUri(sipRequest.headers.from, { "host": "semasim.com" });

            //TODO: handle message sending internally as no auth required
            let evtReceived: VoidSyncEvent | undefined = undefined;

            if (matchTextMessage(sipRequest)) {
                evtReceived = new VoidSyncEvent();
                evtOutgoingMessage.post({ sipRequest, evtReceived });
            }

            proxySocket.write(sipRequest);

            proxySocket.evtResponse.attachOnce(
                ({ headers }) => headers.via[0].params["branch"] === branch,
                sipResponse => {

                    if (evtReceived) evtReceived.post();

                    sip.shiftViaHeader(sipResponse);

                    asteriskSocket.write(sipResponse);

                }
            );

        });

        asteriskSocket.evtClose.attachOnce(async ()=> {

            debug(`${flowToken} asteriskSocket closed, removing contact`);

            //TODO: what if contact not yet registered?

            let isDeleted= await pjsip.deleteContactOfFlow(flowToken);

            debug(`${flowToken} is contact deleted from db: ${isDeleted}`);


        });


        return asteriskSocket;
    }

}