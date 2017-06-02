import { DongleExtendedClient, Ami } from "chan-dongle-extended-client";

import { getAvailableContactsOfEndpoint } from "./endpointsContacts";

import { SyncEvent } from "ts-events-extended";
import { Base64 } from "js-base64";

import { messageContext } from "./dbInterface";


import * as _debug from "debug";
let debug = _debug("_pjsip/message");


type Headers= {
    payload_id: string;
    parts_count: string;
    part_number: string;
    [key: string]: string;
};

function toSipHeaders(
    message_type: string,
    headers: Headers
): Record<string, string> {

    const appKeyword= "semasim";

    let sipHeaders: Record<string, string> = {};

    sipHeaders[`${appKeyword}-message_type`] = message_type;

    for (let key of Object.keys(headers))
        sipHeaders[`${appKeyword}-${message_type}-${key}`] = headers[key];

    return sipHeaders;

}

async function __sendMessage__(
    contacts: string[],
    from: string,
    extraHeaders: Record<string, string>,
    message_type: string,
    params:
        {
            isHiddenPayload: true;
            hidden_payload: string;
            body: string;
        } |
        {
            isHiddenPayload: false,
            payload: string,
        },
    payload_id?: string
) {

    if( !contacts.length ) return;


    let payloadSplit = Ami.base64TextSplit(
        params.isHiddenPayload ? params.hidden_payload : params.payload
    );

    let headers= { 
        ...extraHeaders, 
        "payload_id": payload_id || Ami.generateUniqueActionId(),
        "parts_count": `${payloadSplit.length}`,
    };

    if (!payload_id) payload_id = Ami.generateUniqueActionId();


    let imei= contacts[0].match(/^([0-9]{15})\//)![1];

    let name = await DongleExtendedClient.localhost().getContactName(imei, from);


    for (let contact of contacts)
        for (let part_number = 1; part_number <= payloadSplit.length; part_number++) {

            let payloadPart = payloadSplit[part_number - 1];

            let partHeader= { ...headers, "part_number": `${part_number}` };

            let body: string;

            if (params.isHiddenPayload){
                partHeader = { ...partHeader, "base64_payload": payloadPart };
                body= (part_number === payloadSplit.length)?params.body:"";
            }else
                body= Base64.decode(payloadPart);

            await DongleExtendedClient.localhost().ami.messageSend(
                `pjsip:${contact}`,
                name?`"${name}" <sip:${from}@semasim>`:from,
                body,
                toSipHeaders( message_type, partHeader )
            );


        }


}


export async function sendHiddenMessage(
    contacts: string[],
    from: string,
    extraHeaders: Record<string, string>,
    hidden_payload: string,
    body: string,
    message_type: string,
    response_to_call_id?: string
) {

    await __sendMessage__(
        contacts,
        from,
        extraHeaders,
        message_type,
        { "isHiddenPayload": true, hidden_payload, body },
        response_to_call_id
    );

}


export async function sendMessage(
    contacts: string[],
    from: string,
    extraHeaders: Record<string, string>,
    payload: string,
    message_type: string,
    response_to_call_id?: string
) {

    await __sendMessage__(
        contacts,
        from,
        extraHeaders,
        message_type,
        { "isHiddenPayload": false, payload },
        response_to_call_id
    );

}


function getActualTo(toUri: string): string {

    return toUri.match(/^pjsip:([^@]+)/)![1];

}

function getEndpoint(from: string): string {

    return from.match(/^.*<sip:([^@]+)/)![1];

}


export interface PacketSipMessage {
    to: string;
    from_endpoint: string;
    headers: {
        call_id: string;
        [key: string]: string;
    };
    body: string;
}

let evtPacketSipMessage: SyncEvent<PacketSipMessage> | undefined = undefined;

export function getEvtPacketSipMessage(): SyncEvent<PacketSipMessage> {

    if (evtPacketSipMessage) return evtPacketSipMessage;

    evtPacketSipMessage = new SyncEvent<PacketSipMessage>();

    getEvtPacketReassembled().attach(({ to, from, headers, body }) => {

        let packet: PacketSipMessage = {
            "to": getActualTo(to),
            "from_endpoint": getEndpoint(from),
            headers,
            body
        };

        evtPacketSipMessage!.post(packet);

    });

    return evtPacketSipMessage;


}

interface PacketReassembled {
    to: string;
    from: string;
    headers: {
        call_id: string;
        [key: string]: string;
    };
    body: string;
}


function getEvtPacketReassembled(): SyncEvent<PacketReassembled> {

    let evt = new SyncEvent<PacketReassembled>();

    let evtPacketWithExtraHeaders = getEvtPacketWithExtraHeaders();

    evtPacketWithExtraHeaders.attach(async ({ to, from, headers, body }) => {

        let { payload_id, parts_count, part_number, ...restHeaders } = headers;

        let packet: Partial<PacketReassembled> = {
            to, from,
            "headers": restHeaders
        };

        let bodyParts: string[] = [];

        bodyParts[part_number] = body;

        while (bodyParts.filter(v => v).length !== parseInt(parts_count)) {

            let { headers, body } = await evtPacketWithExtraHeaders.waitFor(newPacket => (
                newPacket.to === to &&
                newPacket.from === from &&
                newPacket.headers.payload_id === payload_id
            ));

            bodyParts[headers.part_number] = body;

        }

        packet.body = bodyParts.join("");

        evt.post(packet as PacketReassembled);

    });

    return evt;

}


interface PacketWithExtraHeaders {
    to: string;
    from: string;
    headers: Headers & { call_id: string; };
    body: string;
}


function getEvtPacketWithExtraHeaders(): SyncEvent<PacketWithExtraHeaders> {

    let evt = new SyncEvent<PacketWithExtraHeaders>();

    getEvtPacketRaw().attach(packetRaw => {

        let mainBody = Base64.decode(packetRaw.base64_body);

        let packet: PacketWithExtraHeaders = {
            "to": packetRaw.to,
            "from": packetRaw.from,
            "headers": {
                "call_id": packetRaw.call_id,
                "payload_id": `${undefined}`,
                "parts_count": `${1}`,
                "part_number": `${1}`
            },
            "body": mainBody
        };


        try {

            let { body, ...extra_headers } = JSON.parse(mainBody);

            if (!body) throw new Error();

            packet.body = body;
            packet.headers = {
                ...packet.headers,
                ...extra_headers
            };

        } catch (error) { }

        evt!.post(packet);


    });

    return evt;

}



interface PacketRaw {
    to: string;
    from: string;
    call_id: string;
    content_length: string;
    base64_body: string;
}

function getEvtPacketRaw(): SyncEvent<PacketRaw> {

    let evt = new SyncEvent<PacketRaw>();

    let ami = DongleExtendedClient.localhost().ami;

    initDialplan().then(() => {

        ami.evt.attach(
            ({ event, context, priority }) => (
                event === "Newexten" &&
                context === messageContext &&
                priority === "1"
            ),
            async newExten => {

                let packet: Partial<PacketRaw> = {};

                let uniqueId = newExten.uniqueid;

                while (true) {

                    let { application, appdata } = newExten;

                    if (application === "Hangup") break;

                    let match: RegExpMatchArray | null;

                    if (
                        application === "NoOp" &&
                        (match = appdata.match(/^([^=]+)===(.*)$/))
                    ) packet[match[1]] = match[2];

                    newExten = await ami.evt.waitFor(
                        ({ uniqueid }) => uniqueid === uniqueId
                    );

                }

                if (!packet.base64_body && packet.content_length) {

                    sendMessage(
                        await getAvailableContactsOfEndpoint(getEndpoint(packet.from!)),
                        getActualTo(packet.to!),
                        {},
                        "TOO LONG!",
                        "error",
                        packet.call_id
                    );

                    return;

                }

                evt!.post(packet as PacketRaw);

            }
        );

    });


    return evt;

}

async function initDialplan() {

    let ami = DongleExtendedClient.localhost().ami;

    let arrAppData = [
        "to===${MESSAGE(to)}",
        "from===${MESSAGE(from)}",
        "call_id===${MESSAGE_DATA(Call-ID)}",
        "content_length===${MESSAGE_DATA(Content-Length)}",
        "base64_body===${BASE64_ENCODE(${MESSAGE(body)})}"
    ];


    let matchAllExt = "_.";

    await ami.dialplanExtensionRemove(matchAllExt, messageContext);

    let priority = 1;

    for (let appData of arrAppData)
        await ami.dialplanExtensionAdd(messageContext, matchAllExt, priority++, "NoOp", appData);

    //await ami.addDialplanExtension(messageContext, matchAllExt, priority++, "DumpChan");

    await ami.dialplanExtensionAdd(messageContext, matchAllExt, priority++, "Hangup");

}

/* let arrAppData = [
        ...[
            "MESSAGE(to)",
            "MESSAGE(from)",
            "MESSAGE_DATA(Via)",
            "MESSAGE_DATA(To)",
            "MESSAGE_DATA(From)",
            "MESSAGE_DATA(Call-ID)",
            "MESSAGE_DATA(CSeq)",
            "MESSAGE_DATA(Allow)",
            "MESSAGE_DATA(Content-Type)",
            "MESSAGE_DATA(User-Agent)",
            "MESSAGE_DATA(Authorization)",
            "MESSAGE_DATA(Content-Length)",
            "MESSAGE_DATA(True-Content-Type)"
        ].map(variable => `${variable}===\${${variable}}`),
        `MESSAGE(base-64-encoded-body)===\${BASE64_ENCODE(\${MESSAGE(body)})}`
    ];
    */