import { Contact } from "../../admin";
import * as sip from "../../sipProxy/sip";
export declare function message(fromContact: Contact, sipRequest: sip.Request): Promise<void>;
