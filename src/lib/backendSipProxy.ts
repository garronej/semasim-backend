import * as md5 from "md5";
import * as dns from "dns";
import * as tls from "tls";
import * as net from "net";
import { SyncEvent } from "ts-events-extended";
import * as sip from "../tools/sipLibrary";
import { startListening as apiStartListening } from "./backendSipApi";
import { Contact } from "./sipContacts";
import { c } from "./_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_backendSipProxy");

const informativeHostname= "semasim-backend.invalid";

let publicIp= "";

export async function getPublicIp(): Promise<string> {

    if (publicIp) return publicIp;

    publicIp= await new Promise<string>(resolve => 
        dns.resolve4(c.backendHostname, (error, addresses) => {

            if (error) throw error;

            resolve(addresses[0]);

        })
    );

    return publicIp;

}

export function extraParamFlowToken(flowToken: string): Record<string, string> {
    let extraParams: Record<string,string>={};
    extraParams[c.flowTokenKey]= flowToken;
    return extraParams;
}

export async function qualifyContact(
    contact: Contact,
    timeout?: number
): Promise<boolean> {

    let flowToken= Contact.readFlowToken(contact);

    let clientSocket= clientSockets.get(flowToken);

    if( !clientSocket ) return false;

    let fromTag = `794ee9eb-${Date.now()}`;
    let callId = `138ce538-${Date.now()}`;
    let cSeqSequenceNumber = Math.floor(Math.random() * 2000);

    let sipRequest = sip.parse([
        `OPTIONS ${contact.uri} SIP/2.0`,
        `From: <sip:${contact.endpoint}@semasim.com>;tag=${fromTag}`,
        `To: <${contact.uri}>`,
        `Call-ID: ${callId}`,
        `CSeq: ${cSeqSequenceNumber} OPTIONS`,
        "Supported: path",
        "Max-Forwards: 70",
        "User-Agent: Semasim-backend",
        "Content-Length:  0",
        "\r\n"
    ].join("\r\n")) as sip.Request;

    //TODO: should be set to [] already :(
    sipRequest.headers.via= [];

    let branch= clientSocket.addViaHeader(sipRequest)

    debug("Sending qualify: \n", sip.stringify(sipRequest) );

    clientSocket.write(sipRequest);

    try {

        let sipResponse = await clientSocket.evtResponse.waitForExtract(
            ({ headers }) => headers.via[0].params["branch"] === branch,
            timeout || 5000
        );

        return true;

    } catch (error) {

        return false;

    }

}


export let gatewaySockets: sip.Store;
let clientSockets: sip.Store;

export async function startServer() {

    await getPublicIp();

    gatewaySockets = new sip.Store();
    clientSockets = new sip.Store();

    let options: tls.TlsOptions = c.tlsOptions;

    let s1= net.createServer()
        .on("error", error => { throw error; })
        .listen(5060, "0.0.0.0")
        .on("connection", onClientConnection);

    let s2= tls.createServer(options)
        .on("error", error => { throw error; })
        .listen(5061, "0.0.0.0")
        .on("secureConnection", onClientConnection);

    let s3= tls.createServer(options)
        .on("error", error => { throw error; })
        .listen(c.backendSipProxyListeningPortForGateways, "0.0.0.0")
        .on("secureConnection", onGatewayConnection);

    await Promise.all(
        [s1, s2, s3].map(
            s => new Promise<void>(
                resolve => s1.on("listening", () => resolve())
            )
        )
    );


}



function onClientConnection(clientSocketRaw: net.Socket) {

    let clientSocket = new sip.Socket(clientSocketRaw);

    let flowToken = md5(`${clientSocket.remoteAddress}:${clientSocket.remotePort}`);

    debug(`${flowToken} New client socket, ${clientSocket.remoteAddress}:${clientSocket.remotePort}\n\n`.yellow);

    clientSockets.add(flowToken, clientSocket);

    let boundGatewaySocket: sip.Socket = null as any;
    let imei= "";

    /*
    clientSocket.evtPacket.attach(sipPacket =>
        debug("From Client Parsed:\n", sip.stringify(sipPacket).red, "\n\n")
    );
    */

    clientSocket.evtData.attach(chunk =>
        debug("From Client:\n", chunk.yellow, "\n\n")
    );

    clientSocket.evtRequest.attachOnce(firstRequest => {

        try {

            let parsedFromUri = sip.parseUri(firstRequest.headers.from.uri);

            if (!parsedFromUri.user) throw new Error("no imei");

            imei= parsedFromUri.user;

            debug(`${flowToken} Client socket, target dongle imei: ${imei}`.yellow);

            if (! gatewaySockets.get(imei) ) throw new Error("Gateway socket not found");

            boundGatewaySocket = gatewaySockets.get(imei)!;

            debug(`${flowToken} Found path to Gateway ip: ${boundGatewaySocket.remoteAddress}`.yellow);

        } catch (error) {

            debug("Can't route to any gateway: ".red, error.message);

            //Should send 480 temporary unavailable

            clientSocket.destroy();

            return;

        }

        boundGatewaySocket.evtClose.attachOnce(clientSocket, () => {

            debug(`${flowToken} Gateway Socket bound closed, destroying client socket`.yellow);

            boundGatewaySocket = null as any;

            clientSocket.destroy();

        });


    });

    clientSocket.evtRequest.attach(sipRequest => {

        if (boundGatewaySocket !== gatewaySockets.get(imei)) {
            clientSocket.destroy();
            return;
        }

        try {

            boundGatewaySocket.addViaHeader(sipRequest, extraParamFlowToken(flowToken));

            if (sipRequest.method === "REGISTER") {

                sip.addOptionTag(sipRequest.headers, "supported", "path");

                //TODO: See if it fail
                sipRequest.headers.route= undefined;

                boundGatewaySocket.addPathHeader(sipRequest, informativeHostname, extraParamFlowToken(flowToken));

            } else boundGatewaySocket.shiftRouteAndAddRecordRoute(sipRequest, informativeHostname);

            boundGatewaySocket.write(sipRequest);

        } catch (error) {

            handleError("clientSocket.evtRequest", clientSocket, sipRequest, error);

        }

    });

    clientSocket.evtResponse.attach(sipResponse => {

        if (boundGatewaySocket !== gatewaySockets.get(imei)) {
            clientSocket.destroy();
            return;
        }

        try {

            boundGatewaySocket.rewriteRecordRoute(sipResponse, informativeHostname);

            sipResponse.headers.via.shift();

            boundGatewaySocket.write(sipResponse);

        } catch (error) {

            handleError("clientSocket.evtResponse", clientSocket, sipResponse, error);

        }

    });

    clientSocket.evtClose.attachOnce(() => {

        if (!boundGatewaySocket) return;

        boundGatewaySocket.evtClose.detach({ "boundTo": clientSocket });

    });

}

function onGatewayConnection(gatewaySocketRaw: net.Socket) {

    debug("New Gateway socket !\n\n".grey);

    let gatewaySocket = new sip.Socket(gatewaySocketRaw);

    gatewaySocket.setKeepAlive(true);

    /*
    gatewaySocket.evtPacket.attach(sipPacket =>
        debug("From gateway:\n", sip.stringify(sipPacket).grey, "\n\n")
    );
    */

    gatewaySocket.evtData.attach(chunk =>
        debug("From gateway:\n", chunk.grey, "\n\n")
    );

    apiStartListening(gatewaySocket);

    gatewaySocket.evtRequest.attach(sipRequest => {

        try {

            let flowToken = sipRequest.headers.via[0].params[c.flowTokenKey]!;

            let clientSocket = clientSockets.get(flowToken);

            if (!clientSocket) return;

            clientSocket.addViaHeader(sipRequest);

            clientSocket.shiftRouteAndAddRecordRoute(sipRequest, publicIp);

            clientSocket.write(sipRequest);

        } catch (error) {

            handleError("gatewaySocket.evtRequest", gatewaySocket, sipRequest, error);

        }

    });

    gatewaySocket.evtResponse.attach(sipResponse => {

        try {

            let flowToken = sipResponse.headers.via[0].params[c.flowTokenKey]!;

            let clientSocket = clientSockets.get(flowToken);

            if (!clientSocket) return;

            clientSocket.rewriteRecordRoute(sipResponse, publicIp);

            sipResponse.headers.via.shift();

            clientSocket.write(sipResponse);

        } catch (error) {

            handleError("gatewaySocket.evtResponse", gatewaySocket, sipResponse, error);

        }

    });

}

function handleError(where: string, fromSocket: sip.Socket, sipPacket: sip.Packet, error: Error) {

    debug(`Unexpected error in: ${where}`);
    debug(JSON.stringify(sipPacket, null, 2));
    debug(error.stack);

    fromSocket.destroy();

}