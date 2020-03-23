
import * as sip from "ts-sip";
import { handlers as localApiHandlers } from "./localApiHandlers";
import * as dbSemasim from "../dbSemasim";
import * as logger from "logger";
import * as tls from "tls";
import * as router from "./router";
import * as uaRemoteApiCaller from "../toUa/remoteApiCaller";
import { deploy } from "../../deploy";

import * as backendRemoteApiCaller from "../toBackend/remoteApiCaller";

const __set_of_imsi__ = " set of imsi ";

export function listen(
    server: tls.Server,
    spoofedLocalAddressAndPort: { localAddress: string; localPort: number; }
) {

    const idString = "backendToGateway";

    const apiServer = new sip.api.Server(
        localApiHandlers,
        sip.api.Server.getDefaultLogger({
            idString,
            "log": logger.log,
            "hideKeepAlive": true,
            "displayOnlyErrors": deploy.getEnv() === "DEV" ? false : true
        })
    );

    server.on("secureConnection", tlsSocket => {

        const socket = new sip.Socket(
            tlsSocket,
            false,
            spoofedLocalAddressAndPort
        );

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
            "remoteEndId": "GATEWAY",
            "localEndId": "BACKEND",
            "connection": deploy.getEnv() === "DEV" ? true : false,
            "error": true,
            "close": deploy.getEnv() === "DEV" ? true : false,
            "incomingTraffic": false,
            "outgoingTraffic": false,
            "colorizedTraffic": "OUT",
            "ignoreApiTraffic": true
        }, logger.log);


        dbSemasim.addGatewayLocation(socket.remoteAddress);


        {

            let set = byAddress.get(socket.remoteAddress);

            if (!set) {

                set = new Set();

                byAddress.set(socket.remoteAddress, set);

            }

            set.add(socket);

        }

        socket.misc[__set_of_imsi__] = new Set<string>();

        socket.evtClose.attachOnce(() => {

            {

                let set = byAddress.get(socket.remoteAddress)!;

                set.delete(socket);

                if (set.size === 0) {
                    byAddress.delete(socket.remoteAddress);
                }

            }

            const imsis = Array.from(socket.misc[__set_of_imsi__] as Set<string>);

            imsis.forEach(imsi => unbindFromImsi(imsi, socket));

            dbSemasim.setSimsOffline(imsis)
                .then(uasByImsi =>
                    Object.keys(uasByImsi)
                        .forEach(imsi =>
                            uaRemoteApiCaller.notifyUserSimChange({
                                "params": {
                                    "type": "IS NOW UNREACHABLE",
                                    imsi
                                },
                                "uas": uasByImsi[imsi]
                            })
                        )
                )
                ;


            backendRemoteApiCaller.notifyRoute({
                "type": "DELETE",
                imsis,
                "gatewayAddresses": getByAddress(socket.remoteAddress).size === 0 ?
                    [socket.remoteAddress] : undefined,
            });

        });

        router.handle(socket);

        backendRemoteApiCaller.notifyRoute({
            "type": "ADD",
            "gatewayAddresses": getByAddress(socket.remoteAddress).size === 1 ?
                [socket.remoteAddress] : undefined,
        });


    });

}


const byImsi = new Map<string, sip.Socket>();

/** Will notify route */
export function bindToImsi(
    imsi: string,
    socket: sip.Socket
): void {

    byImsi.set(imsi, socket);

    socket.misc[__set_of_imsi__].add(imsi);

    backendRemoteApiCaller.notifyRoute({
        "type": "ADD",
        "imsis": [imsi]
    });

}

/** Will notify route and set sim as offline in db */
export function unbindFromImsi(
    imsi: string,
    socket: sip.Socket
): void {

    /*
    NOTE: If the socket has closed we notify all route lost and 
    set sims offline in db all at once
    */
    if (socket.evtClose.postCount === 0) {

        dbSemasim.setSimsOffline([imsi])
            .then(({ [imsi]: uas }) =>
                uaRemoteApiCaller.notifyUserSimChange({
                    "params": {
                        "type": "IS NOW UNREACHABLE",
                        imsi
                    },
                    uas
                })
            )
            ;

        backendRemoteApiCaller.notifyRoute({
            "type": "DELETE",
            "imsis": [imsi]
        });

    }

    socket.misc[__set_of_imsi__].delete(imsi);

    byImsi.delete(imsi);

}

export function getBindedToImsi(
    imsi: string
): sip.Socket | undefined {

    return byImsi.get(imsi);

}

export function getImsis(): string[] {
    return Array.from(byImsi.keys());
}

const byAddress = new Map<string, Set<sip.Socket>>();

export function getByAddress(gatewayAddress: string): Set<sip.Socket> {
    return byAddress.get(gatewayAddress) || new Set();
}

export function getAddresses(): string[] {
    return Array.from(byAddress.keys());
}


const __set_of_imei__ = " set of imei ";

export function addImei(
    socket: sip.Socket,
    imei: string
): void {

    let set = socket.misc[__set_of_imei__] as Set<string> | undefined;

    if (!set) {

        set = new Set();

        socket.misc[__set_of_imei__] = set;

    }

    set.add(imei);

}

export function deleteImei(
    socket: sip.Socket,
    imei: string,
): void {

    (socket.misc[__set_of_imei__] as Set<string>).delete(imei);

}

export function getImeis(socket: sip.Socket): string[] {
    return Array.from((socket.misc[__set_of_imei__] as Set<string>) || []);
}


