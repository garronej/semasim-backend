import * as pjsip from "../../pjsip";
import * as sip from "../../sipProxy/sip";
export declare function sms(fromContact: pjsip.Contact, sipRequest: sip.Request): Promise<void>;
