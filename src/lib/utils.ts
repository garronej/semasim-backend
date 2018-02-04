import { DongleController as Dc } from "chan-dongle-extended-client";
import { sipLibrary, Contact } from "../semasim-gateway";
import * as sipProxy from "./sipProxy";
import * as pushSender from "../tools/pushSender";
import { c } from "./_constants";
import * as sipApiGateway from "./sipApiGatewayClientImplementation";
import * as _debug from "debug";
const debug = _debug("_utils");

export function createSelfMaintainedSocketMap<Key>(): Map<Key, sipLibrary.Socket>{

    let map= new Map<Key, sipLibrary.Socket>();

    map.set= (key, socket)=>{

        if( map.has(key) ){
            map.get(key)!.evtClose.detach(map);
        }

        socket.evtClose.attachOnce(map, ()=> Map.prototype.delete.call(map, key));

        return Map.prototype.set.call(map, key, socket);

    };

    map.delete= key=>{

        if( map.has(key) ){
            map.get(key)!.evtClose.detach(map);
        }

        return Map.prototype.delete.call(map, key);

    };

    return map;

}

export namespace simPassword{

    export function store(
        gwSocket: sipLibrary.Socket,
        imsi: string,
        password: string
    ) {

        if( !gwSocket.misc["passwordByImsi"]){
            gwSocket.misc["passwordByImsi"]= {};
        }

        gwSocket.misc["passwordByImsi"][imsi] = password;


    }

    export function read(
        gwSocket: sipLibrary.Socket,
        imsi: string
    ): string | undefined {

        let passwordByImsi= gwSocket.misc["passwordByImsi"];

        if( !passwordByImsi ){
            return undefined;
        }

        return passwordByImsi[imsi];

    }

}

export function qualifyContact(
    contact: Contact,
    timeout = 2500
): Promise<boolean> | false {

    debug("qualify contact...");

    let connectionId = contact.connectionId;

    let clientSocket = sipProxy.clientSockets.get(connectionId);

    if (!clientSocket) {

        debug("...No client connection qualify failed");

        return false;
    }

    let promiseResult = qualifyContact.pending.get(connectionId);

    if (promiseResult) {

        debug("...qualify pending for this contact");

        return promiseResult;

    }

    promiseResult = (async () => {

        let fromTag = `794ee9eb-${Date.now()}`;
        let callId = `138ce538-${Date.now()}`;
        let cSeqSequenceNumber = Math.floor(Math.random() * 2000);

        let imsi = contact.uaSim.imsi;

        let sipRequest = sipLibrary.parse([
            `OPTIONS ${contact.uri} SIP/2.0`,
            `From: <sip:${imsi}@${c.shared.domain}>;tag=${fromTag}`,
            `To: <${contact.uri}>`,
            `Call-ID: ${callId}`,
            `CSeq: ${cSeqSequenceNumber} OPTIONS`,
            "Supported: path",
            "Max-Forwards: 70",
            "User-Agent: Semasim-backend",
            "Content-Length:  0",
            "\r\n"
        ].join("\r\n")) as sipLibrary.Request;

        //TODO: should be set to [] already :(
        sipRequest.headers.via = [];

        let branch = clientSocket.addViaHeader(sipRequest);

        debug(`(backend) ${sipRequest.method} ${imsi}`.blue);
        clientSocket.write(sipRequest);

        try {

            let sipResponse = await Promise.race([
                new Promise<never>((_, reject) =>
                    clientSocket!.evtClose.attachOnce(sipRequest, () =>
                        reject(new Error("Socket disconnected before receiving response to qualify"))
                    )
                ),
                clientSocket.evtResponse.attachOnceExtract(
                    ({ headers }) => { 
                        try{

                            return headers.via[0].params["branch"] === branch 

                        }catch{

                            clientSocket!.destroy();

                            return false;

                        }
                    },
                    timeout, 
                    () => clientSocket!.evtClose.detach(sipRequest)
                )
            ]);

            debug("...qualify success");

            debug(`(client ${connectionId}): ${sipResponse.status} ${sipResponse.reason} for qualify ${imsi}`.yellow);

            return true;

        } catch (error) {

            debug(`...qualify failed ${error.message}`);

            if (!clientSocket.evtClose.postCount) {
                clientSocket.destroy();
            }

            return false;

        }

    })();

    qualifyContact.pending.set(connectionId, promiseResult);

    return promiseResult;

}

export namespace qualifyContact {

    export const pending= new Map<number, Promise<boolean>>();

    pending.set = function set(connectionId, promiseResult) {

        let self: typeof pending = this;

        promiseResult.then(() => self.delete(connectionId));

        return Map.prototype.set.call(self, connectionId, promiseResult);

    }

}


//TODO: implement reload config!!!!
export function sendPushNotification(
    ua: Contact.UaSim.Ua,
    reloadConfig: "RELOAD CONFIG" | undefined= undefined
): Promise<boolean> {

    if( !sendPushNotification.isInitialized ){

        pushSender.initialize(c.pushNotificationCredentials);

        sendPushNotification.isInitialized= true;

    }

    let prIsSent = sendPushNotification.pending.get(ua);

    if (prIsSent) return prIsSent;

    prIsSent = (async () => {

        try {

            await pushSender.send(
                ua.platform as pushSender.Platform,
                ua.pushToken
            );

        } catch{

            return false;

        }

        return true;

    })();

    sendPushNotification.pending.set(ua, prIsSent);

    return prIsSent;

}

export namespace sendPushNotification {

    export let isInitialized = false;

    export namespace pending {

        /** UaId => prIsSent */
        const map = new Map<string, Promise<boolean>>();

        export function get(
            ua: Contact.UaSim.Ua
        ) {
            return map.get(Contact.UaSim.Ua.id(ua));
        }

        export function set(
            ua: Contact.UaSim.Ua,
            prIsSent: Promise<boolean>
        ) {

            let uaId = Contact.UaSim.Ua.id(ua);

            switch (ua.platform) {
                case "iOS":
                    setTimeout(() => map.delete(uaId), 10000);
                    break;
                case "android":
                    prIsSent.then(() => map.delete(uaId))
                    break;
            }

            map.set(uaId, prIsSent);

        }

    }

    export async function toUas(
        uas: Iterable<Contact.UaSim.Ua>,
        reloadConfig: "RELOAD CONFIG" | undefined = undefined
    ){

        let task: Promise<boolean>[] = [];

        for (let ua of uas) {

            task[task.length] = sendPushNotification(ua, reloadConfig);

        }

        await task;

    }

}

export async function getDonglesConnectedFrom(
    remoteAddress: string
): Promise<Map<Dc.Dongle, sipLibrary.Socket>> {

    let gatewaySockets = await sipProxy.gatewaySockets.getConnectedFrom(remoteAddress);

    let tasks: Promise<void>[] = [];

    let map = new Map<Dc.Dongle, sipLibrary.Socket>();

    for (let gatewaySocket of gatewaySockets) {

        tasks[tasks.length] = (async () => {

            for (let dongle of await sipApiGateway.getDongles(gatewaySocket)) {

                map.set(dongle, gatewaySocket);

            }

        })();

    }

    await Promise.all(tasks);

    return map;

}

