import * as dns from "dns";
import * as tls from "tls";
import * as net from "net";
import { SyncEvent } from "ts-events-extended";
import { Contact, sipLibrary } from "../semasim-gateway";
import * as networkTools from "../tools/networkTools";
import * as sipApiServer from "./sipApiBackendServerImplementation";
import * as sipApiGateway from "./sipApiGatewayClientImplementation";
import * as utils from "./utils";

import { c } from "./_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy");

/** Map connectionId => socket */
export const clientSockets= utils.createSelfMaintainedSocketMap<number>();

/** Map imsi => gatewaySocket */
export namespace gatewaySockets {

    /** Map imsi => socket */
    const bySim= utils.createSelfMaintainedSocketMap<string>();

    /** Map gateway ip => socket */
    const byIp= new Map<string, Set<sipLibrary.Socket>>();

    export function add(gwSocket: sipLibrary.Socket){

        debug("Add socket");

        let ip= gwSocket.remoteAddress;

        debug({ ip });

        if (!byIp.has(ip)) {
            byIp.set(ip, new Set());
        }

        byIp.get(ip)!.add(gwSocket);

        gwSocket.evtClose.attachOnce(
            () => byIp.get(ip)!.delete(gwSocket)
        );

    }

    export function getConnectedFrom(
        remoteAddress: string
    ): Set<sipLibrary.Socket> {
        return byIp.get(remoteAddress) || new Set();
    }

    export function setSimRoute(
        gatewaySocket: sipLibrary.Socket,
        imsi: string
    ) {
        bySim.set(imsi, gatewaySocket);
    }

    export function removeSimRoute(
        imsi: string
    ) {
        bySim.delete(imsi);
    }

    export function getSimRoute(
        imsi: string
    ): sipLibrary.Socket |  undefined {
        return bySim.get(imsi);
    }

}

let publicIp = "";

export async function start() {

    let [sipSrv] = await networkTools.resolveSrv(`_sips._tcp.${c.shared.domain}`);

    let sipIps = await networkTools.retrieveIpFromHostname(sipSrv.name);

    publicIp = sipIps.publicIp;

    let options: tls.TlsOptions = c.tlsOptions;

    let servers: net.Server[] = [];

    servers[servers.length] = tls.createServer(options)
        .on("error", error => { throw error; })
        .listen(sipSrv.port, sipIps.interfaceIp)
        .on("secureConnection", onClientConnection)
        ;

    servers[servers.length] = tls.createServer(options)
        .on("error", error => { throw error; })
        .listen(c.shared.gatewayPort, sipIps.interfaceIp)
        .on("secureConnection", onGatewayConnection)
        ;

    await Promise.all(
        servers.map(
            server => new Promise<void>(
                resolve => server.on("listening", () => resolve())
            )
        )
    );


}

//TODO: ip that trigger those error should be ban
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

const uniqNow = (() => {
    let last = 0;
    return () => {
        let now = Date.now();
        return (now <= last) ? (++last) : (last = now);
    };
})();

function onClientConnection(clientSocketRaw: net.Socket) {

    let clientSocket = new sipLibrary.Socket(clientSocketRaw);

    let connectionId = uniqNow();

    debug(`${connectionId} New client socket, ${clientSocket.remoteAddress}:${clientSocket.remotePort}\n\n`.yellow);

    clientSockets.set(connectionId, clientSocket);

    /*
    clientSocket.evtPacket.attach(sipPacket =>
        debug("From Client Parsed:\n", sipLibrary.stringify(sipPacket).red, "\n\n")
    );
    clientSocket.evtData.attach(chunk =>
        debug("From Client:\n", chunk.yellow, "\n\n")
    );
    */

    clientSocket.evtRequest.attach(sipRequest => {

        try {

            let parsedFromUri = sipLibrary.parseUri(sipRequest.headers.from.uri);

            if (!parsedFromUri.user) {

                throw new Error("Request malformed, no IMSI in from header");

            }

            let imsi = parsedFromUri.user;

            debug(`(client ${connectionId}) ${sipRequest.method} ${imsi}`.yellow);

            let gatewaySocket = gatewaySockets.getSimRoute(imsi);

            if (!gatewaySocket) {

                debug(`(client ${connectionId}) no route to SIM: ${imsi}`.yellow);

                clientSocket.destroy();

                return;

            }

            /** Way of saying: "if it's the first message that this gw socket receive from this client" */
            if (!gatewaySocket.evtClose.getHandlers().find(({ boundTo }) => boundTo === clientSocket)) {

                //** when gw socket close then close client socket */
                gatewaySocket.evtClose.attachOnce(clientSocket, clientSocket.destroy);

                clientSocket.evtClose.attachOnce(() => gatewaySocket!.evtClose.detach(clientSocket));

            }

            gatewaySocket.addViaHeader(sipRequest, {
                "connection_id": `${connectionId}`,
                "received": clientSocket.remoteAddress
            });

            if (sipRequest.method === "REGISTER") {

                sipLibrary.addOptionTag(sipRequest.headers, "supported", "path");

                sipRequest.headers.route = undefined;

                gatewaySocket.addPathHeader(sipRequest);

            } else {

                gatewaySocket.shiftRouteAndUnshiftRecordRoute(sipRequest);

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

            if (!parsedToUri.user) {
                throw new Error("Client response malformed, no IMSI in to header");
            }

            let imsi = parsedToUri.user;

            let gatewaySocket = gatewaySockets.getSimRoute(imsi);

            if (!gatewaySocket) {

                debug(`(client ${connectionId}) no route to SIM: ${imsi}`.yellow);

                clientSocket.destroy();

                return;

            }

            gatewaySocket.pushRecordRoute(sipResponse, true);

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

    gatewaySockets.add(gatewaySocket);

    gatewaySocket.setKeepAlive(true);

    sipApiServer.startListening(gatewaySocket);

    sipApiGateway.init(gatewaySocket);

    /*
    gatewaySocket.evtPacket.attach(sipPacket =>
        debug("From gateway:\n", sipLibrary.stringify(sipPacket).grey, "\n\n")
    );
    gatewaySocket.evtData.attach(chunk =>
        debug("From gateway:\n", chunk.grey, "\n\n")
    );
    */

    gatewaySocket.evtRequest.attach(sipRequest => {

        try {

            debug(`(gateway): ${sipRequest.method}`.grey);

            let connectionId = parseInt(sipRequest.headers.via[0].params["connection_id"]!);

            if (!connectionId) {
                throw new Error("Malformed, No connectionId in topmost via header");
            }

            let clientSocket = clientSockets.get(connectionId);

            if (!clientSocket) {

                debug(`(gateway) no route to client`.grey);

                return;

            }

            clientSocket.addViaHeader(sipRequest);

            clientSocket.shiftRouteAndUnshiftRecordRoute(sipRequest, publicIp);

            clientSocket.write(sipRequest);

        } catch (error) {

            handleError("gatewaySocket.evtRequest", gatewaySocket, sipRequest, error);

        }

    });

    gatewaySocket.evtResponse.attach(sipResponse => {

        try {

            debug(`(gateway): ${sipResponse.status} ${sipResponse.reason}`.grey);

            let connectionId = parseInt(sipResponse.headers.via[0].params["connection_id"]!);

            if (!connectionId) {
                throw new Error("Malformed, No connectionId in topmost via header");
            }

            let clientSocket = clientSockets.get(connectionId);

            if (!clientSocket) {

                debug(`(gateway) no route to client`.grey);

                return;

            }

            clientSocket.pushRecordRoute(sipResponse, false, publicIp);

            sipResponse.headers.via.shift();

            clientSocket.write(sipResponse);

        } catch (error) {

            handleError("gatewaySocket.evtResponse", gatewaySocket, sipResponse, error);

        }

    });

}
