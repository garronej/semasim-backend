import * as md5 from "md5";
import * as dns from "dns";
import * as tls from "tls";
import * as net from "net";
import * as networkTools from "../tools/networkTools";
import { SyncEvent } from "ts-events-extended";
import { startListening as apiStartListening } from "./sipApi";
import { Contact, sipLibrary } from "../semasim-gateway";

import { c } from "./_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy");

const informativeHostname= "semasim-backend.invalid";

export async function qualifyContact(
    contact: Contact,
    timeout?: number
): Promise<boolean> {

    let flowToken = Contact.readFlowToken(contact);

    let clientSocket = clientSockets.get(flowToken);

    if (!clientSocket) return false;

    let fromTag = `794ee9eb-${Date.now()}`;
    let callId = `138ce538-${Date.now()}`;
    let cSeqSequenceNumber = Math.floor(Math.random() * 2000);

    let sipRequest = sipLibrary.parse([
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
    ].join("\r\n")) as sipLibrary.Request;

    //TODO: should be set to [] already :(
    sipRequest.headers.via = [];

    let branch = clientSocket.addViaHeader(sipRequest)

    debug("Sending qualify: \n", sipLibrary.stringify(sipRequest));

    clientSocket.write(sipRequest);

    try {

        let sipResponse = await clientSocket.evtResponse.waitForExtract(
            ({ headers }) => headers.via[0].params["branch"] === branch,
            timeout || 1000
        );

        return true;

    } catch (error) {

        return false;

    }

}

export let gatewaySockets: sipLibrary.Store;
let clientSockets: sipLibrary.Store;

let publicIp= "";

export async function startServer() {

    let { 
        interfacePublicIp, 
        interfaceLocalIp 
    } = await networkTools.retrieveIpFromHostname(
        (await c.shared.dnsSrv_sips_tcp).name
    );

    publicIp= interfacePublicIp;

    gatewaySockets = new sipLibrary.Store();
    clientSockets = new sipLibrary.Store();

    let options: tls.TlsOptions = c.tlsOptions;

    let servers: net.Server[] = [];

    //TODO: get 5061 from DNS
    servers[servers.length] = tls.createServer(options)
        .on("error", error => { throw error; })
        .listen((await c.shared.dnsSrv_sips_tcp).port, interfaceLocalIp)
        .on("secureConnection", onClientConnection);

    servers[servers.length] = tls.createServer(options)
        .on("error", error => { throw error; })
        .listen(c.shared.gatewayPort, interfaceLocalIp)
        .on("secureConnection", onGatewayConnection);

    await Promise.all(
        servers.map(
            server => new Promise<void>(
                resolve => server.on("listening", () => resolve())
            )
        )
    );


}

function onClientConnection(clientSocketRaw: net.Socket) {

    let clientSocket = new sipLibrary.Socket(clientSocketRaw);

    let flowToken = md5(`${clientSocket.remoteAddress}:${clientSocket.remotePort}`);

    debug(`${flowToken} New client socket, ${clientSocket.remoteAddress}:${clientSocket.remotePort}\n\n`.yellow);

    clientSockets.add(flowToken, clientSocket);

    let boundGatewaySocket: sipLibrary.Socket = null as any;
    let imei = "";

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

            let parsedFromUri = sipLibrary.parseUri(firstRequest.headers.from.uri);

            if (!parsedFromUri.user) throw new Error("no imei");

            imei = parsedFromUri.user;

            debug(`${flowToken} Client socket, target dongle imei: ${imei}`.yellow);

            if (!gatewaySockets.get(imei)) throw new Error("Gateway socket not found");

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

                sipLibrary.addOptionTag(sipRequest.headers, "supported", "path");

                //TODO: See if it fail
                sipRequest.headers.route = undefined;

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

        debug("Client Socket close");

        if (!boundGatewaySocket) return;

        boundGatewaySocket.evtClose.detach({ "boundTo": clientSocket });

    });

}

function onGatewayConnection(gatewaySocketRaw: net.Socket) {

    debug("New Gateway socket !\n\n".grey);

    let gatewaySocket = new sipLibrary.Socket(gatewaySocketRaw);

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

            let flowToken = sipRequest.headers.via[0].params[c.shared.flowTokenKey]!;

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

            let flowToken = sipResponse.headers.via[0].params[c.shared.flowTokenKey]!;

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

function handleError(
    where: string,
    fromGatewaySocket: sipLibrary.Socket,
    sipPacket: sipLibrary.Packet,
    error: Error
) {

    debug(`Unexpected error in: ${where}`);
    debug(JSON.stringify(sipPacket, null, 2));
    debug(error.stack);

    fromGatewaySocket.destroy();

}

function extraParamFlowToken(flowToken: string): Record<string, string> {
    let extraParams: Record<string, string> = {};
    extraParams[c.shared.flowTokenKey] = flowToken;
    return extraParams;
}