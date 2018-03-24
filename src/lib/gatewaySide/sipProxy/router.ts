import * as net from "net";
import { sipLibrary, sipProxyMisc } from "../../../semasim-gateway";
import * as networkTools from "../../../tools/networkTools";
import * as clientSideSockets from "./clientSideSockets/index_sipProxy";
import * as gatewaySockets from "./gatewaySockets/index_sipProxy";
import * as c from "../../_constants";

export function createClientSideSocket(
    remoteAddress: string,
    remotePort: number
): sipLibrary.Socket | undefined {

    if (!!clientSideSockets.get({ remoteAddress, remotePort })) {
        return undefined;
    }

    let clientSideSocket = new sipLibrary.Socket(
        net.connect({
            "host": remoteAddress,
            "port": remotePort,
            "localAddress": networkTools.getInterfaceAddressInRange(c.semasim_lan)
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
    }, console.log);

    clientSideSockets.set({ remoteAddress, remotePort }, clientSideSocket);


    const onPacket = (sipPacketReceived: sipLibrary.Packet) => {

        try {

            let gatewaySocket = gatewaySockets.byImsi.get(
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
    }, console.log);

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
