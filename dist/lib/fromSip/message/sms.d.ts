import * as admin from "../../admin";
import * as sip from "../../sipProxy/sip";
export declare function sms(fromContact: admin.Contact, sipRequest: sip.Request): Promise<void>;
