import * as tls from "tls";
import * as net from "net";
import { sipLibrary } from "../semasim-gateway";
import * as networkTools from "../tools/networkTools";
import * as sipApiServer from "./sipApiBackendServerImplementation";
import * as sipApiGateway from "./sipApiGatewayClientImplementation";
import * as utils from "./utils";
import * as db from "./db";
import * as WebSocket from "ws";
import { Session } from "./web";

import * as c from "./_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy");

/** Map connectionId => socket */
export const clientSockets= utils.createSelfMaintainedSocketMap<number>();

/** Map imsi => gatewaySocket */
export namespace gatewaySockets {

    /** Map imsi => socket */
    const byImsi= utils.createSelfMaintainedSocketMap<string>();

    /** Map gateway ip => socket */
    const byIp= new Map<string, Set<sipLibrary.Socket>>();

    export function add(gwSocket: sipLibrary.Socket){

        let ip= gwSocket.remoteAddress;

        if (!byIp.has(ip)) {

            db.addGatewayLocation(ip);

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
        byImsi.set(imsi, gatewaySocket);

        gatewaySocket.evtClose.attachOnce(() =>
            db.setSimOffline(imsi)
        );
    }

    export function removeSimRoute(
        imsi: string
    ) {
        byImsi.delete(imsi);
    }

    export function getSimRoute(
        imsi: string
    ): sipLibrary.Socket | undefined {
        return byImsi.get(imsi);
    }

}

let publicIp = "";

export async function start() {

    let [sipSrv] = await networkTools.resolveSrv(`_sips._tcp.${c.shared.domain}`);

    let sipIps = await networkTools.retrieveIpFromHostname(sipSrv.name);

    publicIp = sipIps.publicIp;

    let options: tls.TlsOptions = utils.getTlsOptions();

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

export function onClientConnection(socket: net.Socket);
export function onClientConnection(
    webSocket: WebSocket, 
    addrAndPorts: sipLibrary.Socket.AddrAndPorts, 
    auth: Session.Auth
);
export function onClientConnection(...inputs: any[]) {

    debug("Client connection");

    let clientSocket: sipLibrary.Socket;

    if (inputs.length === 1) {

        let socket: net.Socket = inputs[0];

        clientSocket = new sipLibrary.Socket(socket);

    } else {

        let webSocket: WebSocket = inputs[0];
        let addrAndPort: sipLibrary.Socket.AddrAndPorts = inputs[1];
        let auth: Session.Auth= inputs[2];

        console.log({ auth });

        clientSocket = new sipLibrary.Socket( webSocket, addrAndPort);

    }

    clientSocket.localAddressPublic= publicIp;

    //TODO: debug

    clientSocket.evtClose.attach( hasError => {

        console.log(`client socket closed: `.red, { hasError });

    });


    let connectionId = uniqNow();

    debug(`${connectionId} New client socket, ${clientSocket.remoteAddress}:${clientSocket.remotePort}\n\n`.yellow);

    clientSockets.set(connectionId, clientSocket);

    clientSocket.evtData.attach(chunk =>
        console.log(`\nFrom client:\n${chunk.yellow}\n\n`)
    );


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

    gatewaySocket.localAddressPublic= publicIp;

    gatewaySockets.add(gatewaySocket);

    gatewaySocket.setKeepAlive(true);

    sipApiServer.startListening(gatewaySocket);

    sipApiGateway.init(gatewaySocket);

    gatewaySocket.evtData.attach(chunk =>
        console.log(`\nFrom gateway:\n${chunk.yellow}\n\n`)
    );

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

            clientSocket.shiftRouteAndUnshiftRecordRoute(sipRequest);

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

            clientSocket.pushRecordRoute(sipResponse, false);

            sipResponse.headers.via.shift();

            clientSocket.write(sipResponse);

        } catch (error) {

            handleError("gatewaySocket.evtResponse", gatewaySocket, sipResponse, error);

        }

    });

}
