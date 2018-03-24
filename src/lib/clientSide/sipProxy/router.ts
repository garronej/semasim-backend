import { sipLibrary, sipProxyMisc } from "../../../semasim-gateway";
import * as web from "../web";
import * as clientSockets from "./clientSockets";
import * as gatewaySideSockets from "./gatewaySideSockets/index_sipProxy";

//TODO: catch exceptions

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
    }, console.log);

    if (clientSocket.protocol === "WSS") {

        if (!auth) {
            clientSocket.destroy();
            return;
        }

        //TODO: only allow one wss by user.

    }

    let connectionId = sipProxyMisc.cid.generate(clientSocket);

    clientSockets.set(connectionId, clientSocket);

    const onPacket = (sipPacketReceived: sipLibrary.Packet): void => {

        try {

            let gatewaySideSocket = gatewaySideSockets.get({
                "imsi": sipProxyMisc.readImsi(sipPacketReceived)
            });

            if (!gatewaySideSocket) {
                //TODO: close client socket???
                return;
            }

            let sipPacket = gatewaySideSocket.buildNextHopPacket(sipPacketReceived);

            if (sipLibrary.matchRequest(sipPacket)) {

                sipProxyMisc.cid.set(sipPacket, connectionId);

            }

            gatewaySideSocket.write(sipPacket);

        } catch (error) {

            throw error;

            //clientSocket.destroy();

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
    }, console.log);

    gatewaySideSockets.add(gatewaySideSocket);

    const onSipPacket = (sipPacketReceived: sipLibrary.Packet) => {

        try {

            let clientSocket = clientSockets.get(
                sipProxyMisc.cid.read(sipPacketReceived)
            );

            if (!clientSocket) {
                return;
            }

            clientSocket.write(
                clientSocket.buildNextHopPacket(sipPacketReceived)
            );

        } catch(error) { 

            throw error;

        }

    };

    gatewaySideSocket.evtRequest.attach(onSipPacket);
    gatewaySideSocket.evtResponse.attach(onSipPacket);

}


