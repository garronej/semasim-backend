require("rejection-tracker").main(__dirname, "..", "..", "..");

import * as net from "net";
import { SyncEvent } from "ts-events-extended";
import * as shared from "./shared";
import * as md5 from "md5";
import * as sip from "./sip";

import "colors";

//TODO device is not trustable.
//TODO: decrement max forward

console.log("outbound sipProxy started!");

const publicPort = 5060;
let publicIp: string;
let deviceSockets: sip.Store;
let clientSockets: sip.Store;

(async function startServer() {

    publicIp = await shared.getOutboundProxyPublicIp();

    deviceSockets = new sip.Store();
    clientSockets = new sip.Store();

    net.createServer()
        .on("error", error => { throw error; })
        .listen(publicPort, "0.0.0.0")
        .on("connection", onClientConnection);

    net.createServer()
        .on("error", error => { throw error; })
        .listen(shared.relayPort, "0.0.0.0")
        .on("connection", onDeviceConnection);


})();



function onClientConnection(clientSocketRaw: net.Socket) {

    let clientSocket = new sip.Socket(clientSocketRaw);

    let flowToken = md5(`${clientSocket.remoteAddress}:${clientSocket.remotePort}`);

    console.log(`${flowToken} New client socket, ${clientSocket.remoteAddress}:${clientSocket.remotePort}\n\n`.yellow);

    clientSockets.add(flowToken, clientSocket);

    let boundDeviceSocket: sip.Socket | undefined = undefined;

    /*
    clientSocket.evtPacket.attach(sipPacket =>
        console.log("From Client:\n", sip.stringify(sipPacket).yellow, "\n\n")
    );
    */

    clientSocket.evtData.attach(chunk =>
        console.log("From Client:\n", chunk.yellow, "\n\n")
    );

    clientSocket.evtRequest.attachOnce(firstRequest => {

        try {

            let parsedFromUri = sip.parseUri(firstRequest.headers.from.uri);

            let imei = parsedFromUri.user;

            if (!imei) throw new Error("no imei");

            console.log(`${flowToken} Client socket, target dongle imei: ${imei}`.yellow);

            boundDeviceSocket = deviceSockets.get(imei);

            if (!boundDeviceSocket) throw new Error("device socket not found");

        } catch (error) {

            console.log("Can't route to proxy: ".yellow, error.message);

            clientSocket.destroy();

            return;

        }

        boundDeviceSocket.evtClose.attachOnce(() => {

            console.log(`${flowToken} Device Socket bound closed, destroying client socket`.yellow);

            boundDeviceSocket = undefined;

            clientSocket.destroy();

        });


    });

    clientSocket.evtRequest.attach(sipRequest => {

        if (!boundDeviceSocket) return;

        let branch= boundDeviceSocket.addViaHeader(sipRequest, (()=>{

            let extraParams: Record<string,string>= {};

            extraParams[shared.flowTokenKey]= flowToken;

            return extraParams;

        })());

        boundDeviceSocket.write(sipRequest);

        boundDeviceSocket.evtResponse.attachOnce(
            ({ headers }) => headers.via[0].params["branch"] === branch,
            sipResponse => {

                if (clientSocket.evtClose.postCount) return;

                sip.shiftViaHeader(sipResponse);

                clientSocket.write(sipResponse);

            }
        );

    });

    clientSocket.evtClose.attachOnce(() => {

        if (!boundDeviceSocket) return;

        console.log(`${flowToken} Client socket closed AND boundDeviceSocket is not, notify device`.yellow);

        boundDeviceSocket.write(
            shared.Message.NotifyBrokenFlow.buildSipRequest(flowToken)
        );

    });

}



function onDeviceConnection(deviceSocketRaw: net.Socket) {

    console.log("New device socket\n\n".grey);

    let deviceSocket = new sip.Socket(deviceSocketRaw);

    deviceSocket.setKeepAlive(true);

    /*
    deviceSocket.evtPacket.attach(sipPacket =>
        console.log("From device:\n", sip.stringify(sipPacket).grey, "\n\n")
    );
    */

    deviceSocket.evtData.attach( chunk => 
        console.log("From device:\n", chunk.grey, "\n\n")
    );

    deviceSocket.evtRequest.attachExtract(
        sipRequest => shared.Message.matchSipRequest(sipRequest),
        sipRequest => {

            let message = shared.Message.parseSipRequest(sipRequest);

            if (shared.Message.NotifyKnownDongle.match(message)) {

                //TODO: this can be hacked

                if (deviceSockets.getTimestamp(message.imei) < message.lastConnection) {

                    console.log(`Device socket handle dongle imei: ${message.imei}`.grey);

                    deviceSockets.add(message.imei, deviceSocket, message.lastConnection);
                }

            }


        }
    );


    deviceSocket.evtRequest.attach(sipRequest => {

        let flowToken= sipRequest.headers.via[0].params[shared.flowTokenKey]!;

        let clientSocket= clientSockets.get(flowToken);

        if (!clientSocket) return;

        let branch= clientSocket.addViaHeader(sipRequest);

        sip.updateContactHeader(sipRequest, publicIp, publicPort, "TCP");

        clientSocket.write(sipRequest);

        clientSocket.evtResponse.attachOnce(
            ({ headers }) => headers.via[0].params["branch"] === branch,
            sipResponse => {

                if (deviceSocket.evtClose.postCount) return;

                sip.shiftViaHeader(sipResponse);

                deviceSocket.write(sipResponse);

            }
        );

    });


}

