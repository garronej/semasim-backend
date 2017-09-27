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

const informativeHostname = "semasim-backend.invalid";


export const gatewaySockets = new sipLibrary.Store();
export const clientSockets = new sipLibrary.Store();

let publicIp = "";

export async function startServer() {

    let {
        interfacePublicIp,
        interfaceLocalIp
    } = await networkTools.retrieveIpFromHostname((await c.shared.dnsSrv_sips_tcp).name);

    publicIp = interfacePublicIp;

    let options: tls.TlsOptions = c.tlsOptions;

    let servers: net.Server[] = [];

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

export function buildFlowToken(connectionId: string, imei: string): string {
    return `${connectionId}-${imei}`;
}

export function parseFlowToken(flowToken: string): { connectionId: string; imei: string; } {

    let split = flowToken.split("-");

    return {
        "connectionId": split[0],
        "imei": split[1]
    };

}

function handleError(
    where: string,
    socket: sipLibrary.Socket,
    sipPacket: sipLibrary.Packet,
    error: Error
) {

    debug(`Error in: ${where}`.red);
    debug(error.message);
    socket.destroy();

}

let connectionCounter = 1;

function onClientConnection(clientSocketRaw: net.Socket) {

    let clientSocket = new sipLibrary.Socket(clientSocketRaw);

    //TODO: replace by Date.now()
    let connectionId = `conn${connectionCounter++}`;

    debug(`${connectionId} New client socket, ${clientSocket.remoteAddress}:${clientSocket.remotePort}\n\n`.yellow);

    clientSockets.set(connectionId, clientSocket);

    /*
    clientSocket.evtPacket.attach(sipPacket =>
        debug("From Client Parsed:\n", sip.stringify(sipPacket).red, "\n\n")
    );
    clientSocket.evtData.attach(chunk =>
        debug("From Client:\n", chunk.yellow, "\n\n")
    );
    */

    clientSocket.evtRequest.attach(sipRequest => {

        try {

            let parsedFromUri = sipLibrary.parseUri(sipRequest.headers.from.uri);

            if (!parsedFromUri.user) throw new Error("Request malformed, no IMEI in from header");

            let imei = parsedFromUri.user;

            debug(`(client ${connectionId}) ${sipRequest.method} ${imei}`.yellow);

            let gatewaySocket = gatewaySockets.get(imei);

            if (!gatewaySocket) throw new Error("Target Gateway not found");

            gatewaySocket.evtClose.detach({ "boundTo": clientSocket });
            gatewaySocket.evtClose.attachOnce(clientSocket, () => {
                debug(`Gateway socket closed, closing client socket ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);
                clientSocket.destroy();
            });
            clientSocket.evtClose.detach({ "boundTo": gatewaySocket });
            clientSocket.evtClose.attachOnce(gatewaySocket, () => {
                debug(`Client socket ${connectionId} closed`);
                gatewaySocket!.evtClose.detach({ "boundTo": clientSocket });
            });

            let extraParamFlowToken: Record<string, string> = {};
            extraParamFlowToken[c.shared.flowTokenKey] = buildFlowToken(connectionId, imei);

            gatewaySocket.addViaHeader(sipRequest, extraParamFlowToken);

            if (sipRequest.method === "REGISTER") {

                sipLibrary.addOptionTag(sipRequest.headers, "supported", "path");

                //TODO: See if it fail
                sipRequest.headers.route = undefined;

                gatewaySocket.addPathHeader(sipRequest, informativeHostname, extraParamFlowToken);

            } else {

                gatewaySocket.shiftRouteAndAddRecordRoute(sipRequest, informativeHostname);

            }

            gatewaySocket.write(sipRequest);


        } catch (error) {

            handleError("clientSocket.evtRequest", clientSocket, sipRequest, error);

        }


    });

    clientSocket.evtResponse.attach(sipResponse => {

        try {

            debug(`(client ${connectionId}): ${sipResponse.status} ${sipResponse.reason}`.yellow);

            let parsedToUri = sipLibrary.parseUri(sipResponse.headers.to.uri);

            if (!parsedToUri.user) throw new Error("Response malformed, no IMEI in to header");

            let imei = parsedToUri.user;

            let gatewaySocket = gatewaySockets.get(imei);

            if (!gatewaySocket) throw new Error("Target Gateway not found");

            gatewaySocket.rewriteRecordRoute(sipResponse, informativeHostname);

            sipResponse.headers.via.shift();

            gatewaySocket.write(sipResponse);

        } catch (error) {

            handleError("clientSocket.evtResponse", clientSocket, sipResponse, error);

        }

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
    gatewaySocket.evtData.attach(chunk =>
        debug("From gateway:\n", chunk.grey, "\n\n")
    );
    */

    apiStartListening(gatewaySocket);

    gatewaySocket.evtRequest.attach(sipRequest => {

        try {

            debug(`(gateway): ${sipRequest.method}`.grey);

            let flowToken = sipRequest.headers.via[0].params[c.shared.flowTokenKey];

            if (!flowToken) throw new Error("No flow token in topmost via header");


            let clientSocket = clientSockets.get(
                parseFlowToken(flowToken).connectionId
            );

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

            debug(`(gateway): ${sipResponse.status} ${sipResponse.reason}`.grey);

            let flowToken = sipResponse.headers.via[0].params[c.shared.flowTokenKey];

            if (!flowToken) throw new Error("No flow token in topmost via header");

            let clientSocket = clientSockets.get(
                parseFlowToken(flowToken).connectionId
            );

            if (!clientSocket) return;

            clientSocket.rewriteRecordRoute(sipResponse, publicIp);

            sipResponse.headers.via.shift();

            clientSocket.write(sipResponse);

        } catch (error) {

            handleError("gatewaySocket.evtResponse", gatewaySocket, sipResponse, error);

        }

    });

}
