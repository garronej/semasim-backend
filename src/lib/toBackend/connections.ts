
import * as sip from "ts-sip";
import { handlers as localApiHandlers } from "./localApiHandlers";
import { logger } from "../../tools/logger";
import * as net from "net";
import * as router from "./router";
import { types as lbTypes } from "../../load-balancer"
import { getLocalRunningInstance } from "../launch";

import * as gatewayConnections from "../toGateway/connections";
import * as uaConnections from "../toUa/connections";

import * as remoteApiCaller from "./remoteApiCaller";
import { deploy } from "../../deploy";

//NOTE: We store those in misc to avoid having to register hundreds of close listener.
const __set_of_imsi__ = " set of imsi ";
const __set_of_ua_instance_id__ = " set of uaInstanceId ";
const __set_of_gateway_address__ = " set of gatewayAddress ";
const __set_of_ua_address__ = " set of uaAddress ";

export function listen(server: net.Server) {

    idString= `backend${getLocalRunningInstance().daemonNumber}toBackend`;

    server.on(
        "connection",
        netSocket => {

            const socket = new sip.Socket(netSocket, true);

            registerSocket(socket);

            remoteApiCaller.notifyRoute({
                "type": "ADD",
                "imsis": gatewayConnections.getImsis(),
                "gatewayAddresses": gatewayConnections.getAddresses(),
                "uaInstanceIds": uaConnections.getUaInstanceIds(),
                "uaAddresses": uaConnections.getAddresses()
            });

        }
    );

}

export function connect(
    runningInstance: lbTypes.RunningInstance,
    isInstanceStillRunning: () => Promise<boolean>
) {

    const socket = new sip.Socket(
        net.connect({
            "host": runningInstance.interfaceAddress,
            "port": runningInstance.interInstancesPort,
            "localAddress": getLocalRunningInstance().interfaceAddress
        }),
        true
    );

    //TODO: make sure it's ok to define api listener after connect
    socket.evtConnect.attachOnce(() => registerSocket(socket));

    socket.evtClose.attachOnce(async () => {

        if (await isInstanceStillRunning()) {

            connect(runningInstance, isInstanceStillRunning);

        }

    });

}

let idString = "";

const apiServer = new sip.api.Server(
    localApiHandlers,
    sip.api.Server.getDefaultLogger({
        idString,
        "log": logger.log,
        "hideKeepAlive": true,
        "displayOnlyErrors": deploy.getEnv() === "DEV"? false: true
    })
);

/** Assert: socket is connected */
function registerSocket(socket: sip.Socket) {

    apiServer.startListening(socket);

    sip.api.client.enableKeepAlive(socket);

    sip.api.client.enableErrorLogging(
        socket,
        sip.api.client.getDefaultErrorLogger({
            idString,
            "log": logger.log
        })
    );

    socket.enableLogger({
        "socketId": idString,
        "remoteEndId": "BACKEND",
        "localEndId": `BACKEND${getLocalRunningInstance().daemonNumber}`,
        "connection": deploy.getEnv() === "DEV"? true: false,
        "error": true,
        "close": deploy.getEnv() === "DEV"? true: false,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "colorizedTraffic": undefined,
        "ignoreApiTraffic": true
    }, logger.log);

    const ipEndpoint = `${socket.remoteAddress}:${socket.remotePort}`;

    byIpEndpoint.set(ipEndpoint, socket);

    socket.misc[__set_of_imsi__] = new Set<string>();
    socket.misc[__set_of_ua_instance_id__] = new Set<string>();
    socket.misc[__set_of_gateway_address__] = new Set<string>();
    socket.misc[__set_of_ua_address__] = new Set<string>();

    socket.evtClose.attachOnce(() => {

        for (const imsi of (socket.misc[__set_of_imsi__] as Set<string>)) {

            unbindFromImsi(imsi, socket);

        }

        for (const uaInstanceId of (socket.misc[__set_of_ua_instance_id__] as Set<string>)) {

            unbindFromUaInstanceId(uaInstanceId, socket);

        }

        for (const gatewayAddress of (socket.misc[__set_of_gateway_address__] as Set<string>)) {

            unbindFromGatewayAddress(gatewayAddress, socket);

        }

        for (const uaAddress of (socket.misc[__set_of_ua_address__] as Set<string>)) {

            unbindFromUaAddress(uaAddress, socket);

        }

        byIpEndpoint.delete(ipEndpoint);

    });

    router.handle(socket);

}

const byIpEndpoint = new Map<string, sip.Socket>();


export function getByIpEndpoint(remoteAddress: string, remotePort: number): sip.Socket | undefined {
    return byIpEndpoint.get(`${remoteAddress}:${remotePort}`);
}

export function getAll(): sip.Socket[] {
    return Array.from(byIpEndpoint.values());
}


const byImsi = new Map<string, sip.Socket>();

export function bindToImsi(
    imsi: string,
    socket: sip.Socket
): void {

    if (byImsi.has(imsi)) {

        unbindFromImsi(imsi, byImsi.get(imsi)!);

    }

    byImsi.set(imsi, socket);

    socket.misc[__set_of_imsi__].add(imsi);

}


export function unbindFromImsi(
    imsi: string,
    socket: sip.Socket
): void {

    const set_of_imsi = socket.misc[__set_of_imsi__] as Set<string>;

    if (!set_of_imsi.has(imsi)) {
        return;
    }

    set_of_imsi.delete(imsi);

    byImsi.delete(imsi);

}

export function getBindedToImsi(
    imsi: string
): sip.Socket | undefined {

    return byImsi.get(imsi);

}

const byUaInstanceId = new Map<string, sip.Socket>();

/**
 * If there is an other socket currently bound to the
 * uaInstanceId the previous socket is first unbound.
 * This is not an error, it happen when a user open an other tab.
 */
export function bindToUaInstanceId(
    uaInstanceId: string,
    socket: sip.Socket
): void {

    if (byUaInstanceId.has(uaInstanceId)) {

        unbindFromUaInstanceId(uaInstanceId, byUaInstanceId.get(uaInstanceId)!);

    }

    byUaInstanceId.set(uaInstanceId, socket);


    (socket.misc[__set_of_ua_instance_id__] as Set<string>).add(uaInstanceId);

}

/**
 * If at the time this function is called the
 * socket is no longer bound to the uaInstanceId
 * nothing is done, this is not an error.
 */
export function unbindFromUaInstanceId(
    uaInstanceId: string,
    socket: sip.Socket
): void {

    const set_of_ua_instance_id = socket.misc[__set_of_ua_instance_id__] as Set<string>;

    if (!set_of_ua_instance_id.has(uaInstanceId)) {
        return;
    }

    set_of_ua_instance_id.delete(uaInstanceId);

    byUaInstanceId.delete(uaInstanceId);

}

export function getBoundToUaInstanceId(
    uaInstanceId: string
): sip.Socket | undefined {

    return byUaInstanceId.get(uaInstanceId);

}


const byUaAddress = new Map<string, Set<sip.Socket>>();

/*
Here we do not need to unbind first because
we can have different processes that hold 
connection to the same ua ip.
Whereas for imsi or for email there may be 
at most one instance that hold the connection.

We will never receive an unbind after a bind.

*/
export function bindToUaAddress(
    uaAddress: string,
    socket: sip.Socket
): void {

    let set = byUaAddress.get(uaAddress);

    if (!set) {

        set = new Set();

        byUaAddress.set(uaAddress, set);

    }

    set.add(socket);

    (socket.misc[__set_of_ua_address__] as Set<string>).add(uaAddress);

}

export function unbindFromUaAddress(
    uaAddress: string,
    socket: sip.Socket
): void {

    (socket.misc[__set_of_ua_address__] as Set<string>).delete(uaAddress);

    //Should not be undefined.
    const set = byUaAddress.get(uaAddress)!;

    set.delete(socket);

    if (set.size === 0) {

        byUaAddress.delete(uaAddress);

    }

}

export function getBindedToUaAddress(
    uaAddress: string
): Set<sip.Socket> {

    return byUaAddress.get(uaAddress) || new Set();

}



const byGatewayAddress = new Map<string, Set<sip.Socket>>();

/* Symmetric of ua address */
export function bindToGatewayAddress(
    gatewayAddress: string,
    socket: sip.Socket
): void {

    let set = byGatewayAddress.get(gatewayAddress);

    if (!set) {

        set = new Set();

        byGatewayAddress.set(gatewayAddress, set);

    }

    set.add(socket);

    (socket.misc[__set_of_gateway_address__] as Set<string>).add(gatewayAddress);

}

export function unbindFromGatewayAddress(
    gatewayAddress: string,
    socket: sip.Socket
): void {

    (socket.misc[__set_of_gateway_address__] as Set<string>).delete(gatewayAddress);

    //Should not be undefined.
    const set = byGatewayAddress.get(gatewayAddress)!;

    set.delete(socket);

    if (set.size === 0) {

        byGatewayAddress.delete(gatewayAddress);

    }

}

export function getBindedToGatewayAddress(
    uaAddress: string
): Set<sip.Socket> {

    return byGatewayAddress.get(uaAddress) || new Set();

}









