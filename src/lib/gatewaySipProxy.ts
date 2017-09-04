import * as tls from "tls";
import * as net from "net";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import * as sipLibrary from "../tools/sipLibrary";
import * as os from "os";
import * as backendSipApi from "./backendSipApi";
import { extraParamFlowToken } from "./backendSipProxy";
import { startListening as apiStartListening } from "./gatewaySipApi";
import { Contact, getContactFromAstSocketSrcPort } from "./sipContacts";
import * as db from "./dbInterface";

import { c } from "./_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_gatewaySipProxy");

//TODO change that otherwise only work on raspberry pi
const localIp = os.networkInterfaces()["eth0"].filter(({ family }) => family === "IPv4")[0]["address"];

export const evtIncomingMessage = new SyncEvent<{
    fromContact: Contact;
    sipRequest: sipLibrary.Request;
}>();

export const evtOutgoingMessage = new SyncEvent<{
    sipRequest: sipLibrary.Request;
    evtReceived: VoidSyncEvent;
}>();


let backendSocket: sipLibrary.Socket;
let asteriskSockets: sipLibrary.Store;

const evtNewBackendSocketConnect = new VoidSyncEvent();

export async function getBackendSocket(): Promise<sipLibrary.Socket> {

    if (
        !backendSocket ||
        backendSocket.evtClose.postCount ||
        !backendSocket.evtConnect.postCount
    ) await evtNewBackendSocketConnect.waitFor();

    return backendSocket;

}

export async function getAsteriskSockets(): Promise<sipLibrary.Store> {

    await getBackendSocket();

    return asteriskSockets;

}


export async function start() {

    debug("(re)Staring !");

    asteriskSockets = new sipLibrary.Store();

    backendSocket = new sipLibrary.Socket(
        tls.connect({
            "host": c.backendHostname,
            "port": c.backendSipProxyListeningPortForGateways
        }) as any
    );

    backendSocket.setKeepAlive(true);

    apiStartListening(backendSocket);

    /*
    backendSocket.evtPacket.attach(sipPacket =>
        console.log("From backend:\n", sip.stringify(sipPacket).yellow, "\n\n")
    );
    backendSocket.evtData.attach(chunk =>
        console.log("From backend:\n", chunk.yellow, "\n\n")
    );
    */

    backendSocket.evtConnect.attachOnce(async () => {

        debug("connection established with backend");

        evtNewBackendSocketConnect.post();

        let set= new Set<string>();

        for( let imei of await db.asterisk.queryEndpoints())
            set.add(imei);

        for( let imei of await DongleExtendedClient.localhost().getConnectedDongles() )
            set.add(imei);

        for (let imei of set )
            backendSipApi.claimDongle.run(imei);

    });

    backendSocket.evtRequest.attach(async sipRequest => {

        let flowToken = sipRequest.headers.via[0].params[c.flowTokenKey]!;

        let asteriskSocket = asteriskSockets.get(flowToken);

        if (!asteriskSocket)
            asteriskSocket = createAsteriskSocket(flowToken, backendSocket);

        if (!asteriskSocket.evtConnect.postCount)
            await asteriskSocket.evtConnect.waitFor();


        if (sipRequest.method === "REGISTER") {

            sipRequest.headers["user-agent"] = Contact.buildValueOfUserAgentField(
                sipLibrary.parseUri(sipRequest.headers.from.uri).user!,
                sipRequest.headers.contact![0].params["+sip.instance"]!,
                sipRequest.headers["user-agent"]!
            );

            asteriskSocket.addPathHeader(sipRequest);

        } else
            asteriskSocket.shiftRouteAndAddRecordRoute(sipRequest);


        let branch = asteriskSocket.addViaHeader(sipRequest);

        //TODO match with authentication
        if (sipLibrary.isPlainMessageRequest(sipRequest)) {

            asteriskSocket.evtResponse.attachOncePrepend(
                ({ headers }) => headers.via[0].params["branch"] === branch,
                async sipResponse => {

                    if (sipResponse.status !== 202) return;

                    let fromContact = await getContactFromAstSocketSrcPort(asteriskSocket!.localPort);

                    if (!fromContact) {

                        //TODO? Change result code, is it possible ?
                        debug(`Contact not found for incoming message!!!`);

                        return;

                    }

                    evtIncomingMessage.post({ fromContact, sipRequest });

                }
            );

        }

        asteriskSocket.write(sipRequest);

    });


    backendSocket.evtResponse.attach(sipResponse => {

        let flowToken: string;

        try {

            flowToken = sipResponse.headers.via[0].params[c.flowTokenKey]!;

        } catch (error) {

            console.log(error.message);

            console.log(JSON.stringify(sipResponse, null, 2));

            return;

        }

        let asteriskSocket = asteriskSockets.get(flowToken);

        if (!asteriskSocket) return;

        asteriskSocket.rewriteRecordRoute(sipResponse);

        sipResponse.headers.via.shift();

        asteriskSocket.write(sipResponse);

    });


    backendSocket.evtClose.attachOnce(async () => {

        debug("Backend socket closed, waiting and restarting");

        await asteriskSockets.destroyAll();

        await new Promise<void>(resolve => setTimeout(resolve, 3000));

        start();

    });

}


function createAsteriskSocket(
    flowToken: string, 
    backendSocket: sipLibrary.Socket
): sipLibrary.Socket {

    debug(`${flowToken} Creating asterisk socket`);

    //let asteriskSocket = new sip.Socket(net.createConnection(5060, "127.0.0.1"));
    let asteriskSocket = new sipLibrary.Socket(net.createConnection(5060, localIp));

    asteriskSocket.disablePong = true;

    asteriskSocket.evtPing.attach(() => console.log("Asterisk ping!"));

    asteriskSockets.add(flowToken, asteriskSocket);

    /*
    asteriskSocket.evtPacket.attach(sipPacket =>
        console.log("From Asterisk:\n", sip.stringify(sipPacket).grey, "\n\n")
    );
    asteriskSocket.evtData.attach(chunk =>
        console.log("From Asterisk:\n", chunk.grey, "\n\n")
    );
    */

    asteriskSocket.evtPacket.attachPrepend(
        ({ headers }) => headers["content-type"] === "application/sdp",
        sipPacket => {

            let sdp = sipLibrary.parseSdp(sipPacket.content);

            sipLibrary.overwriteGlobalAndAudioAddrInSdpCandidates(sdp);

            sipPacket.content = sipLibrary.stringifySdp(sdp);

        }
    );


    asteriskSocket.evtRequest.attach(sipRequest => {

        if (backendSocket.evtClose.postCount) return;

        let branch = backendSocket.addViaHeader(sipRequest, extraParamFlowToken(flowToken));

        backendSocket.shiftRouteAndAddRecordRoute(sipRequest, "semasim-gateway.invalid");

        if (sipLibrary.isPlainMessageRequest(sipRequest)) {
            let evtReceived = new VoidSyncEvent();
            evtOutgoingMessage.post({ sipRequest, evtReceived });
            backendSocket.evtResponse.attachOncePrepend(
                ({ headers }) => headers.via[0].params["branch"] === branch,
                () => evtReceived.post()
            )
        }

        backendSocket.write(sipRequest);

    });

    asteriskSocket.evtResponse.attach(sipResponse => {

        if (backendSocket.evtClose.postCount) return;

        backendSocket.rewriteRecordRoute(sipResponse, "semasim-gateway.invalid");

        sipResponse.headers.via.shift();

        backendSocket.write(sipResponse);

    });

    return asteriskSocket;
}
