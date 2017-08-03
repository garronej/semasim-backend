
import { Contact } from "./endpointsContacts";
import { DongleExtendedClient, Ami } from "chan-dongle-extended-client";
import { evtOutgoingMessage, evtIncomingMessage } from "../sipProxy/inbound";
import * as sip from "../sipProxy/sip";
import { SyncEvent } from "ts-events-extended";


import * as _debug from "debug";
let debug = _debug("_admin/message");

export const evtMessage= evtIncomingMessage;

export function sendMessage(
    contact: Contact,
    number: string,
    headers: Record<string, string>,
    content: string,
    contactName?: string
): Promise<boolean> {

    return new Promise<boolean>((resolve, reject) => {

        //console.log("sending message", { contact, fromUriUser, headers, content, fromName });

        debug("sendMessage", { contact, number, headers, content, contactName });

        let actionId = Ami.generateUniqueActionId();

        let uri= contact.path.split(",")[0].match(/^<(.*)>$/)![1].replace(/;lr/,"");

        DongleExtendedClient.localhost().ami.messageSend(
            `pjsip:${contact.endpoint}/${uri}`, number, actionId
        ).catch( error=> reject(error));

        evtOutgoingMessage.attachOnce(
            ({ sipRequest }) => sipRequest.content === actionId,
            ({ sipRequest, evtReceived }) => {

                //TODO: inform that the name come from the SD card
                if (contactName) sipRequest.headers.from.name = `${contactName}`;

                sipRequest.uri= contact.uri;
                sipRequest.headers.to= { "name": undefined, "uri": contact.uri, "params": {} };

                delete sipRequest.headers.contact;

                sipRequest.content = content;

                sipRequest.headers = { ...sipRequest.headers, ...headers };

                evtReceived.waitFor(3000).then(() => resolve(true)).catch(() => resolve(false));

            }
        );


    });


}