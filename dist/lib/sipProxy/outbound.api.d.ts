import * as sip from "./sip";
import { Contact } from "../admin";
export declare function startListening(deviceSocket: sip.Socket): void;
export declare namespace claimDongle {
    const methodName = "claimDongle";
    interface Request extends Record<string, any> {
        imei: string;
    }
    function handle({imei}: Request, deviceSocket: sip.Socket): void;
    function run(imei: string): Promise<void>;
}
export declare namespace wakeUpUserAgent {
    const methodName = "wakeUpUserAgent";
    interface Request extends Record<string, any> {
        contact: Contact;
    }
    interface Response extends Record<string, any> {
        status: "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "FAIL";
    }
    function handle({contact}: Request): Promise<Response>;
    function run(contact: Contact): Promise<Response["status"]>;
}
