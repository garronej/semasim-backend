import * as net from "net";
import { sipProxyMisc } from "../../semasim-gateway";
import * as sipLibrary from "ts-sip";
import { networkTools } from "../../semasim-load-balancer";
import * as clientSideSockets from "./clientSideSockets/store";
import * as gatewaySockets from "./gatewaySockets/store";
import * as i from "../../bin/installer";
import * as logger from "logger";

const debug= logger.debugFactory();

export function createClientSideSocket(
    remoteAddress: string,
    remotePort: number
): sipLibrary.Socket | undefined {

    if (!!clientSideSockets.get({ remoteAddress, remotePort })) {

        debug("Load balancer notified a running instance as up but we already had it");
        
        return undefined;
    }

    let clientSideSocket = new sipLibrary.Socket(
        net.connect({
            "host": remoteAddress,
            "port": remotePort,
            "localAddress": networkTools.getInterfaceAddressInRange(i.semasim_lan)
        })
    );

    clientSideSocket.enableLogger({
        "socketId": "clientSideSocket",
        "remoteEndId": "BACKEND-CLIENT",
        "localEndId": "BACKEND-GW",
        "connection": true,
        "error": true,
        "close": true,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "colorizedTraffic": "IN",
        "ignoreApiTraffic": true
    }, logger.log);

    clientSideSockets.set({ remoteAddress, remotePort }, clientSideSocket);


    const onPacket = (sipPacketReceived: sipLibrary.Packet) => {

        try {

            const gatewaySocket = gatewaySockets.byImsi.get(
                sipProxyMisc.readImsi(sipPacketReceived)
            );

            if (!gatewaySocket) {
                return;
            }

            gatewaySocket.write(
                gatewaySocket.buildNextHopPacket(sipPacketReceived)
            );

        } catch(error){ 

            throw error;

        }

    };

    clientSideSocket.evtRequest.attach(onPacket);
    clientSideSocket.evtResponse.attach(onPacket);


    return clientSideSocket;

}


//TODO: catch errors
export function onGwConnection(
    gatewaySocket: sipLibrary.Socket
) {

    gatewaySocket.enableLogger({
        "socketId": "gatewaySocket",
        "remoteEndId": "GW",
        "localEndId": "BACKEND-GW",
        "connection": true,
        "error": true,
        "close": true,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "colorizedTraffic": "OUT",
        "ignoreApiTraffic": true
    }, logger.log);

    gatewaySockets.add(gatewaySocket);

    const onPacket = (sipPacketReceived: sipLibrary.Packet) => {

        try {

            let wrap: { host?: string; port: number; };

            if (sipLibrary.matchRequest(sipPacketReceived)) {

                wrap = sipPacketReceived.headers.route![1].uri;

            } else {

                wrap = sipPacketReceived.headers.via[1];

            }

            let clientSideSocket = clientSideSockets.get({
                "remoteAddress": wrap.host!,
                "remotePort": wrap.port
            });

            if (!clientSideSocket) {
                return;
            }

            clientSideSocket.write(
                clientSideSocket.buildNextHopPacket(sipPacketReceived)
            );

        } catch(error){

            throw error;

            //gatewaySocket.destroy();

        }

    };

    gatewaySocket.evtRequest.attach(onPacket);
    gatewaySocket.evtResponse.attach(onPacket);

}
