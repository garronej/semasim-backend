import * as net from "net";
import * as sip from "./sip";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import { DongleExtendedClient, Ami } from "chan-dongle-extended-client";
import * as shared from "./shared";
import * as os from "os";

import * as pjsip from "../pjsip";
import { Contact } from "../pjsip";

import * as tls from "tls";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipProxy/inbound");

const localIp= os.networkInterfaces()["eth0"].filter( ({family})=> family === "IPv4" )[0]["address"];

console.log({localIp});


export const evtIncomingMessage = new SyncEvent<{
    contact: pjsip.Contact;
    message: sip.Request;
}>();

const evtOutgoingMessage = new SyncEvent<{ 
    sipRequest: sip.Request;
    evtReceived: VoidSyncEvent;
}>();


export function sendMessage(
    contact: Contact,
    number: string,
    headers: Record<string, string>,
    content: string,
    contactName?: string
): Promise<boolean> {

    return new Promise<boolean>(resolve => {

        //console.log("sending message", { contact, fromUriUser, headers, content, fromName });

        debug("sendMessage", { contact, number, headers, content, contactName });


        let actionId = Ami.generateUniqueActionId();

        let uri= contact.path.split(",")[0].match(/^<(.*)>$/)![1].replace(/;lr/,"");

        DongleExtendedClient.localhost().ami.messageSend(
            `pjsip:${contact.endpoint}/${uri}`, number, actionId
        ).catch( error=> {

            debug("message send failed", error.message);            

            resolve(false);

        });

        evtOutgoingMessage.attachOnce(
            ({ sipRequest }) => sipRequest.content === actionId,
            ({ sipRequest, evtReceived }) => {

                debug("outgoingMessageCaught");

                //TODO: inform that the name come from the SD card

                if (contactName) sipRequest.headers.from.name = contactName;

                //sipRequest.headers.to.params["messagetype"]="SMS";

                delete sipRequest.headers.contact;

                sipRequest.content = content;

                sipRequest.headers = {
                    ...sipRequest.headers,
                    ...headers
                };

                evtReceived.waitFor(3000).then(() => resolve(true)).catch(() => resolve(false));

            }
        );


    });


}



function getContactOfFlow(asteriskSocketLocalPort: number): Promise<pjsip.Contact | undefined> {

    let returned = false;

    return new Promise<pjsip.Contact | undefined>(async resolve => {

        pjsip.getEvtNewContact().waitFor(
            ({ path }) => pjsip.readAsteriskSocketLocalPortFromPath(path) === asteriskSocketLocalPort,
            1200
        ).then(contact => {
            if (returned) return;
            returned = true;

            debug("contact resolved from event");

            resolve(contact);

        }).catch(() => {
            if (returned) return;
            returned = true;

            debug("contact not found timeout");

            resolve(undefined);
        });

        let contacts = await pjsip.queryContacts();

        if (returned) return;

        for (let contact of contacts) {

            if (pjsip.readAsteriskSocketLocalPortFromPath(contact.path) !== asteriskSocketLocalPort)
                continue;

            returned = true;

            debug("contact found from db");

            resolve(contact);

        }

    });


}




function matchTextMessage(sipRequest: sip.Request): boolean {

    return (
        sipRequest.method === "MESSAGE" &&
        sipRequest.headers["content-type"].match(/^text\/plain/)
    );

}

export let asteriskSockets: sip.Store;

export async function start() {

    debug("(re)Staring !");

    asteriskSockets = new sip.Store();

    let proxySocket = new sip.Socket(
        tls.connect({ "host": "ns.semasim.com", "port": shared.relayPort }) as any
    );

    proxySocket.setKeepAlive(true);

    /*
    proxySocket.evtPacket.attach(sipPacket =>
        console.log("From proxy:\n", sip.stringify(sipPacket).yellow, "\n\n")
    );
    */
    proxySocket.evtData.attach(chunk =>
        console.log("From proxy:\n", chunk.yellow, "\n\n")
    );

    proxySocket.evtRequest.attach(async sipRequest => {


        let flowToken = sipRequest.headers.via[0].params[shared.flowTokenKey]!;

        let asteriskSocket = asteriskSockets.get(flowToken);

        if (!asteriskSocket)
            asteriskSocket = createAsteriskSocket(flowToken, proxySocket);

        if (!asteriskSocket.evtConnect.postCount)
            await asteriskSocket.evtConnect.waitFor();

        let branch = asteriskSocket.addViaHeader(sipRequest);

        if (sipRequest.method === "REGISTER") {

            sipRequest.headers["user-agent"] = [
                `user-agent=${sipRequest.headers["user-agent"]}`,
                `endpoint=${sip.parseUri(sipRequest.headers.from.uri).user}`,
                `+sip.instance=${sipRequest.headers.contact![0].params["+sip.instance"]}`
            ].join("_");

            asteriskSocket.addPathHeader(sipRequest);

        } else
            asteriskSocket.shiftRouteAndAddRecordRoute(sipRequest);



        //FOR MESSAGES

        //TODO see if dump is nessesary.
        let sipRequestDump = sip.copyMessage(sipRequest, true);

        //TODO match with authentication
        if (matchTextMessage(sipRequestDump)) {

            asteriskSocket.evtResponse.attachOncePrepend(
                ({ headers }) => headers.via[0].params["branch"] === branch,
                async sipResponse => {

                    if (sipResponse.status !== 202) return;

                    let contact= await getContactOfFlow(asteriskSocket!.localPort);

                    if( !contact ){

                        debug(`Contact not found for incoming message!!! TODO change result code`);

                        return;

                    }

                    evtIncomingMessage.post({ contact, "message": sipRequestDump });

                }
            );

        }

        asteriskSocket.write(sipRequest);

    });


    proxySocket.evtResponse.attach(sipResponse => {

        let flowToken = sipResponse.headers.via[0].params[shared.flowTokenKey]!;

        let asteriskSocket = asteriskSockets.get(flowToken);

        if (!asteriskSocket) return;

        asteriskSocket.rewriteRecordRoute(sipResponse);

        sipResponse.headers.via.shift();

        asteriskSocket.write(sipResponse);

    });


    proxySocket.evtRequest.attachExtract(
        sipRequest => shared.Message.matchSipRequest(sipRequest),
        sipRequest => {

            let message = shared.Message.parseSipRequest(sipRequest);

            if (shared.Message.NotifyBrokenFlow.match(message)) {

                debug(`${message.flowToken} Outbound notify flow ended, destroying asterisk socket`);

                let asteriskSocket = asteriskSockets.get(message.flowToken);

                if (!asteriskSocket) {

                    debug(`${message.flowToken} asterisk socket was close already`);

                    return;

                };

                asteriskSocket.destroy();

            }


        }
    );

    proxySocket.evtClose.attachOnce(() => {

        //TODO see what is the state of contacts

        debug("proxy socket closed, destroying all asterisk socket, waiting and restarting");

        asteriskSockets.destroyAll();

        setTimeout(() => start(), 10000);

    });


    proxySocket.evtConnect.attachOnce(async () => {

        debug("connection established with proxy");

        for (let { endpoint, lastUpdated } of await pjsip.queryEndpoints())
            notifyHandledDongle(endpoint, lastUpdated);

    });

    DongleExtendedClient.localhost().evtDongleConnect.attach(imei => notifyHandledDongle(imei, Date.now()));

    async function notifyHandledDongle(imei: string, lastConnection: number) {

        if (!proxySocket.evtConnect.postCount)
            await proxySocket.evtConnect.waitFor();

        proxySocket.write(
            shared.Message.NotifyKnownDongle.buildSipRequest(
                imei, lastConnection
            )
        );

    }

    function createAsteriskSocket(flowToken: string, proxySocket: sip.Socket): sip.Socket {

        debug(`${flowToken} Creating asterisk socket`);

        //let asteriskSocket = new sip.Socket(net.createConnection(5060, "127.0.0.1"));
        let asteriskSocket = new sip.Socket(net.createConnection(5060, localIp));

        asteriskSocket.disablePong = true;

        asteriskSocket.evtPing.attach(() => console.log("Asterisk ping!"));

        asteriskSockets.add(flowToken, asteriskSocket);

        /*
        asteriskSocket.evtPacket.attach(sipPacket =>
            console.log("From Asterisk:\n", sip.stringify(sipPacket).grey, "\n\n")
        );
        */

        asteriskSocket.evtData.attach(chunk =>
            console.log("From Asterisk:\n", chunk.grey, "\n\n")
        );

        asteriskSocket.evtPacket.attachPrepend(
            ({ headers }) => headers["content-type"] === "application/sdp",
            sipPacket => {

                let sdp = sip.parseSdp(sipPacket.content);

                //sip.purgeCandidates(sdp, { "host": false, "srflx": false, "relay": false });

                sip.overwriteGlobalAndAudioAddrInSdpCandidates(sdp);

                sipPacket.content = sip.stringifySdp(sdp);

            }
        );


        asteriskSocket.evtRequest.attach(sipRequest => {

            let branch = proxySocket.addViaHeader(sipRequest, (() => {

                let extraParams: Record<string, string> = {};

                extraParams[shared.flowTokenKey] = flowToken;

                return extraParams;

            })());

            proxySocket.shiftRouteAndAddRecordRoute(sipRequest, "semasim-inbound-proxy.invalid");

            if (matchTextMessage(sipRequest)) {
                let evtReceived = new VoidSyncEvent();
                evtOutgoingMessage.post({ sipRequest, evtReceived });
                proxySocket.evtResponse.attachOnce(
                    ({ headers }) => headers.via[0].params["branch"] === branch,
                    () => evtReceived.post()
                )
            }

            proxySocket.write(sipRequest);

        });

        asteriskSocket.evtResponse.attach(sipResponse => {

            if (proxySocket.evtClose.postCount) return;

            proxySocket.rewriteRecordRoute(sipResponse, "semasim-inbound-proxy.invalid");

            sipResponse.headers.via.shift();

            proxySocket.write(sipResponse);


        });

        asteriskSocket.evtClose.attachOnce(async () => {

            debug(`${flowToken} asteriskSocket closed!`);

            if (!proxySocket.evtClose.postCount) {

                debug(`${flowToken} We notify proxy that flow has been closed`);

                proxySocket.write(
                    shared.Message.NotifyBrokenFlow.buildSipRequest(flowToken)
                );

            }


            let contact = await getContactOfFlow(asteriskSocket.localPort);

            if (contact) {

                debug(`${flowToken} We have to delete this contact:  `, contact);

                let isDeleted = await pjsip.deleteContact(contact.id);

                debug(`${flowToken} is contact deleted from db: ${isDeleted}`);

            }


        });


        return asteriskSocket;
    }

}