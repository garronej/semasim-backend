require("rejection-tracker").main(__dirname, "..", "..", "..");

import * as net from "net";
import { SyncEvent } from "ts-events-extended";
import * as shared from "./shared";
import * as md5 from "md5";
import * as sip from "./sip";
import * as path from "path";
import * as fs from "fs";
import * as tls from "tls";

import "colors";

//TODO device is not trustable.
//TODO: decrement max forward

console.log("Outbound sipProxy started!");


let publicIp: string;
let deviceSockets: sip.Store;
let clientSockets: sip.Store;

(async function startServer() {

    publicIp = await shared.getOutboundProxyPublicIp();

    deviceSockets = new sip.Store();
    clientSockets = new sip.Store();

    let options: tls.TlsOptions = (() => {

        let pathToCerts = path.join("/", "home", "admin", "ns.semasim.com");

        let key = fs.readFileSync(path.join(pathToCerts, "privkey2.pem"), "utf8");
        let cert = fs.readFileSync(path.join(pathToCerts, "fullchain2.pem"), "utf8");
        let ca = fs.readFileSync(path.join(pathToCerts, "chain2.pem"), "utf8");

        return { key, cert, ca };

    })();

    net.createServer()
        .on("error", error => { throw error; })
        .listen(5060, "0.0.0.0")
        .on("connection", onClientConnection);

    tls.createServer(options)
        .on("error", error => { throw error; })
        .listen(5061, "0.0.0.0")
        .on("secureConnection", onClientConnection);

    tls.createServer(options)
        .on("error", error => { throw error; })
        .listen(shared.relayPort, "0.0.0.0")
        .on("secureConnection", onDeviceConnection);


})();



function onClientConnection(clientSocketRaw: net.Socket) {

    //let clientSocket = new sip.Socket(clientSocketRaw, 31000);
    let clientSocket = new sip.Socket(clientSocketRaw);

    clientSocket.disablePong= true;

    clientSocket.evtPing.attach(() => console.log("Client ping!"));

    clientSocket.evtTimeout.attachOnce(()=> {

        console.log("Client timeout!");

        clientSocket.destroy(); 

    });



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

            //Should send 480 temporary unavailable

            clientSocket.destroy();

            return;

        }

        boundDeviceSocket.evtClose.attachOnce(clientSocket, () => {

            console.log(`${flowToken} Device Socket bound closed, destroying client socket`.yellow);

            boundDeviceSocket = undefined;

            clientSocket.destroy();

        });


    });

    clientSocket.evtRequest.attach(sipRequest => {

        if (!boundDeviceSocket) return;

        if (sipRequest.method === "REGISTER") {

            console.log(`new register on flow token: ${flowToken}`);

        }

        boundDeviceSocket.addViaHeader(sipRequest, (() => {

            let extraParams: Record<string, string> = {};

            extraParams[shared.flowTokenKey] = flowToken;

            return extraParams;

        })());


        let displayedAddr = "semasim-outbound-proxy.invalid";

        if (sipRequest.method === "REGISTER") {

            sip.addOptionTag(sipRequest.headers, "supported", "path");

            boundDeviceSocket.addPathHeader(sipRequest, displayedAddr);

        } else {

            boundDeviceSocket.shiftRouteAndAddRecordRoute(sipRequest, displayedAddr);

        }

        boundDeviceSocket.write(sipRequest);

    });

    clientSocket.evtResponse.attach(sipResponse => {

        if (!boundDeviceSocket) return;

        boundDeviceSocket.rewriteRecordRoute(sipResponse, "semasim-outbound-proxy.invalid");

        sipResponse.headers.via.shift();

        boundDeviceSocket.write(sipResponse);

    });

    clientSocket.evtClose.attachOnce(() => {

        if (!boundDeviceSocket) return;

        console.log(`${flowToken} Client socket closed AND boundDeviceSocket is not, notify device`.yellow);

        boundDeviceSocket.write(
            shared.Message.NotifyBrokenFlow.buildSipRequest(flowToken)
        );

        boundDeviceSocket.evtClose.detach({ "boundTo": clientSocket });

    });

}

function onDeviceConnection(deviceSocketRaw: net.Socket) {

    console.log("New device socket !\n\n".grey);

    let deviceSocket = new sip.Socket(deviceSocketRaw);

    deviceSocket.setKeepAlive(true);

    deviceSocket.evtPacket.attach(sipPacket =>
        console.log("From device:\n", sip.stringify(sipPacket).grey, "\n\n")
    );

    /*
    deviceSocket.evtData.attach(chunk =>
        console.log("From device:\n", chunk.grey, "\n\n")
    );
    */

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

            } else if (shared.Message.NotifyBrokenFlow.match(message)) {

                console.log(`${message.flowToken} Device notify connection closed, destroying client socket`);

                let clientSocket = clientSockets.get(message.flowToken);

                if (!clientSocket) {

                    console.log(`${message.flowToken} Client connection was closed already`);

                    return;

                };

                clientSocket.destroy();

            }


        }
    );

    deviceSocket.evtRequest.attach(sipRequest => {

        let flowToken = sipRequest.headers.via[0].params[shared.flowTokenKey]!;

        let clientSocket = clientSockets.get(flowToken);

        if (!clientSocket) return;

        clientSocket.addViaHeader(sipRequest);

        clientSocket.shiftRouteAndAddRecordRoute(sipRequest, publicIp);

        clientSocket.write(sipRequest);

    });

    deviceSocket.evtResponse.attach(sipResponse => {

        let flowToken = sipResponse.headers.via[0].params[shared.flowTokenKey]!;

        let clientSocket = clientSockets.get(flowToken);

        if (!clientSocket) return;

        clientSocket.rewriteRecordRoute(sipResponse, publicIp);

        sipResponse.headers.via.shift();

        clientSocket.write(sipResponse);

    });


}