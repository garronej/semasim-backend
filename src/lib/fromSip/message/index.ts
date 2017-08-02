import { Contact } from "../../admin";
import * as sip from "../../sipProxy/sip";

import { sms } from "./sms";


export async function message(fromContact: Contact, sipRequest: sip.Request) {

    console.log(" FROM SIP MESSAGE...");

    switch ( sipRequest.headers.to ) {
        default:
            await sms(fromContact, sipRequest);
            break;
    }
}
