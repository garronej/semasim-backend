import { sipProxyMisc } from "../../../semasim-gateway";
import * as sipLibrary from "ts-sip";
import * as web from "../web";
import * as clientSockets from "./clientSockets";
import * as gatewaySideSockets from "./gatewaySideSockets/store";
import * as logger from "logger";
import * as util from "util";

export function onUaConnection(
    clientSocket: sipLibrary.Socket,
    auth?: web.Auth
) {

    clientSocket.enableLogger({
        "socketId": "clientSocket",
        "remoteEndId": "CLIENT",
        "localEndId": "BACKEND-CLIENT",
        "connection": true,
        "error": true,
        "close": true,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "colorizedTraffic": "IN",
        "ignoreApiTraffic": true
    }, logger.log);

    if (clientSocket.protocol === "WSS") {

        if (!auth) {
            clientSocket.destroy("User is not authenticated ( no auth for this websocket)");
            return;
        }

        //TODO: only allow one wss by user.

    }

    let connectionId = sipProxyMisc.cid.generate(clientSocket);

    clientSockets.set(connectionId, clientSocket);

    const onPacket = (sipPacketReceived: sipLibrary.Packet): void => {

        try {

            const gatewaySideSocket = gatewaySideSockets.get({
                "imsi": sipProxyMisc.readImsi(sipPacketReceived)
            });

            if (!gatewaySideSocket) {
                //TODO: close client socket???
                return;
            }

            const sipPacket = gatewaySideSocket.buildNextHopPacket(sipPacketReceived);

            if (sipLibrary.matchRequest(sipPacket)) {

                sipProxyMisc.cid.set(sipPacket, connectionId);

            }

            gatewaySideSocket.write(sipPacket);

        } catch (error) {

            clientSocket.destroy([
                "Client device sent data that made the sip router throw",
                `error: ${util.format(error)}`,
                util.inspect({ sipPacketReceived }, { "depth": 7 })
            ].join("\n"));

        }


    };

    clientSocket.evtRequest.attach(onPacket);
    clientSocket.evtResponse.attach(onPacket);


}

export function onGwSideConnection(
    gatewaySideSocket: sipLibrary.Socket
) {

    gatewaySideSocket.enableLogger({
        "socketId": "gatewaySideSocket",
        "remoteEndId": "BACKEND-GW",
        "localEndId": "BACKEND-CLIENT",
        "connection": true,
        "error": true,
        "close": true,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "colorizedTraffic": "OUT",
        "ignoreApiTraffic": true
    }, logger.log);

    gatewaySideSockets.add(gatewaySideSocket);

    // NOTE: Here we do not need to handle exception as gwSide is a trustable party. 
    const onSipPacket = (sipPacketReceived: sipLibrary.Packet) => {

        const clientSocket = clientSockets.get(
            sipProxyMisc.cid.read(sipPacketReceived)
        );

        if (!clientSocket) {
            return;
        }

        clientSocket.write(
            clientSocket.buildNextHopPacket(sipPacketReceived)
        );


    };

    gatewaySideSocket.evtRequest.attach(onSipPacket);
    gatewaySideSocket.evtResponse.attach(onSipPacket);

}


