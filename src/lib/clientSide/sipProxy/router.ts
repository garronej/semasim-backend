import { sipLibrary, sipProxyMisc } from "../../../semasim-gateway";
import * as web from "../web";
import * as clientSockets from "./clientSockets";
import * as gatewaySideSockets from "./gatewaySideSockets/index_sipProxy";

//TODO: catch exceptions

export function onUaConnection(
    clientSocket: sipLibrary.Socket,
    auth?: web.Auth
) {

    if (clientSocket.protocol === "WSS") {

        if (!auth) {
            clientSocket.destroy();
            return;
        }

        //TODO: only allow one wss by user.

    }

    let connectionId = sipProxyMisc.cid.generate(clientSocket);

    clientSockets.set(connectionId, clientSocket);

    clientSocket.evtData.attach(data=> console.log("CLI=>BK-CLI\n", data.toString("utf8").yellow));

    clientSocket.evtRequest.attach(sipRequestReceived => {

        try {

            let gatewaySideSocket = gatewaySideSockets.get({
                "imsi": sipProxyMisc.readImsi(sipRequestReceived)
            });

            if (!gatewaySideSocket) {
                //TODO: close client socket???
                return;
            }

            let sipRequest = gatewaySideSocket.buildNextHopPacket(sipRequestReceived);

            sipProxyMisc.cid.set(sipRequest, connectionId);

            console.log("CLI<=BK-CLI\n", sipLibrary.stringify(sipRequest));

            gatewaySideSocket.write(sipRequest);

        } catch{

            clientSocket.destroy();

        }

    });

    clientSocket.evtResponse.attach(sipResponseReceived => {

        try {

            let gatewaySideSocket = gatewaySideSockets.get({
                "imsi": sipProxyMisc.readImsi(sipResponseReceived)
            });

            if (!gatewaySideSocket) {
                //TODO: close client socket???
                return;
            }

            console.log("CLI<=BK-CLI\n", sipLibrary.stringify(gatewaySideSocket.buildNextHopPacket(sipResponseReceived)));

            gatewaySideSocket.write(
                gatewaySideSocket.buildNextHopPacket(sipResponseReceived)
            );

        } catch{

            clientSocket.destroy();

        }

    });

}

export function onGwSideConnection(
    gatewaySideSocket: sipLibrary.Socket
) {

    gatewaySideSockets.add(gatewaySideSocket);

    gatewaySideSocket.evtData.attach(data=> console.log("BK-CLI<=BK-GW\n", `${data.toString("utf8")}`));

    (() => {

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

            } catch { }

        };

        gatewaySideSocket.evtRequest.attach(onSipPacket);
        gatewaySideSocket.evtResponse.attach(onSipPacket);

    })();

}


