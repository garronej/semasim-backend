require("rejection-tracker").main(__dirname, "..", "..", "..");

import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import { SyncEvent } from "ts-events-extended";
import * as shared from "./shared";
import * as md5 from "md5";
import * as dns from "dns";
import * as sip from "./sip";
import * as tls from "tls";
import * as webApi from "./outbound.webApi";
import { Contact } from "../admin";

import "colors";

export const listeningPortForDevices = 50610;
export const flowTokenKey = "flowtoken";

export const hostname= "semasim.com";

let publicIp= "";

export async function getPublicIp(): Promise<string> {

    if (publicIp) return publicIp;

    return new Promise<string>(resolve => 
        dns.resolve4(hostname, (error, addresses) => {

            if (error) throw error;

            resolve(addresses[0]);

        })
    );

}

export function getTlsOptions(): { key: string; cert: string; ca: string } {

        let pathToCerts = path.join("/", "home", "admin", "ns.semasim.com");

        let key = fs.readFileSync(path.join(pathToCerts, "privkey2.pem"), "utf8");
        let cert = fs.readFileSync(path.join(pathToCerts, "fullchain2.pem"), "utf8");
        let ca = fs.readFileSync(path.join(pathToCerts, "chain2.pem"), "utf8");

        return { key, cert, ca };

}

export function extraParamFlowToken(flowToken: string): Record<string, string> {
    let extraParams: Record<string,string>={};
    extraParams[flowTokenKey]= flowToken;
    return extraParams;
}

export async function qualifyContact(
    contact: Contact,
    timeout?: number
): Promise<boolean> {

    let fromTag = `794ee9eb-${Date.now()}`;
    let callId = `138ce538-${Date.now()}`;
    let cSeqSequenceNumber = Math.floor(Math.random() * 2000);
    let flowToken= sip.parsePath(contact.path).pop()!.uri.params[flowTokenKey]!;

    let sipRequest = sip.parse([
        `OPTIONS ${contact.uri} SIP/2.0`,
        `From: <sip:${contact.endpoint}@semasim.com>;tag=${fromTag}`,
        `To: <${contact.uri}>`,
        `Call-ID: ${callId}`,
        `CSeq: ${cSeqSequenceNumber} OPTIONS`,
        "Supported: path",
        "Max-Forwards: 70",
        "User-Agent: Semasim-sip-proxy",
        "Content-Length:  0",
        "\r\n"
    ].join("\r\n")) as sip.Request;

    //TODO: should be set to [] already :(
    sipRequest.headers.via= [];

    let clientSocket= clientSockets.get(flowToken);

    if( !clientSocket ) return false;

    let branch= clientSocket.addViaHeader(sipRequest)

    console.log("Sending qualify: \n", sip.stringify(sipRequest) );

    clientSocket.write(sipRequest);

    try {

        let sipResponse = await clientSocket.evtResponse.waitForExtract(
            ({ headers }) => headers.via[0].params["branch"] === branch,
            timeout || 5000
        );

        return true;

    } catch (error) {

        return false;

    }

}


let deviceSockets: sip.Store;
let clientSockets: sip.Store;

export async function startServer() {

    await getPublicIp();

    deviceSockets = new sip.Store();
    clientSockets = new sip.Store();

    let options: tls.TlsOptions = getTlsOptions();


    let s1= net.createServer()
        .on("error", error => { throw error; })
        .listen(5060, "0.0.0.0")
        .on("connection", onClientConnection);

    let s2= tls.createServer(options)
        .on("error", error => { throw error; })
        .listen(5061, "0.0.0.0")
        .on("secureConnection", onClientConnection);

    let s3= tls.createServer(options)
        .on("error", error => { throw error; })
        .listen(listeningPortForDevices, "0.0.0.0")
        .on("secureConnection", onDeviceConnection);

    await Promise.all(
        [s1, s2, s3].map(
            s => new Promise<void>(
                resolve => s1.on("listening", () => resolve())
            )
        )
    );


}



function onClientConnection(clientSocketRaw: net.Socket) {

    let clientSocket = new sip.Socket(clientSocketRaw);

    clientSocket.disablePong = true;

    clientSocket.evtPing.attach(() => console.log("Client ping!"));


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

        //sipRequest.headers.via[0].port= clientSocket.remotePort;

        boundDeviceSocket.addViaHeader(sipRequest, extraParamFlowToken(flowToken));

        let displayedHostname = "outbound-proxy.socket";

        if (sipRequest.method === "REGISTER") {

            sip.addOptionTag(sipRequest.headers, "supported", "path");

            boundDeviceSocket.addPathHeader(sipRequest, displayedHostname, extraParamFlowToken(flowToken));

        } else boundDeviceSocket.shiftRouteAndAddRecordRoute(sipRequest, displayedHostname);


        boundDeviceSocket.write(sipRequest);

    });

    clientSocket.evtResponse.attach(sipResponse => {

        if (!boundDeviceSocket) return;

        boundDeviceSocket.rewriteRecordRoute(sipResponse, "outbound-proxy.socket");

        sipResponse.headers.via.shift();

        boundDeviceSocket.write(sipResponse);

    });

    clientSocket.evtClose.attachOnce(() => {

        if (!boundDeviceSocket) return;

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

                if (deviceSockets.getTimestamp(message.imei) < message.lastConnection) {

                    console.log(`Device socket handle dongle imei: ${message.imei}`.grey);

                    deviceSockets.add(message.imei, deviceSocket, message.lastConnection);
                }

            }

        }
    );

    deviceSocket.evtRequest.attach(sipRequest => {

        let flowToken = sipRequest.headers.via[0].params[flowTokenKey]!;

        let clientSocket = clientSockets.get(flowToken);

        if (!clientSocket) return;

        clientSocket.addViaHeader(sipRequest);

        clientSocket.shiftRouteAndAddRecordRoute(sipRequest, publicIp);

        clientSocket.write(sipRequest);

    });

    deviceSocket.evtResponse.attach(sipResponse => {

        let flowToken = sipResponse.headers.via[0].params[flowTokenKey]!;

        let clientSocket = clientSockets.get(flowToken);

        if (!clientSocket) return;

        clientSocket.rewriteRecordRoute(sipResponse, publicIp);

        sipResponse.headers.via.shift();

        clientSocket.write(sipResponse);

    });

}