import * as sip from "./sip";
import { Contact } from "../admin";
export declare function startListening(deviceSocket: sip.Socket): void;
export declare namespace claimDongle {
    const methodName = "claimDongle";
    interface Request {
        imei: string;
    }
    function handle({imei}: Request, newDeviceSocket: sip.Socket): Promise<void>;
    function run(imei: string): Promise<void>;
}
export declare namespace wakeUpUserAgent {
    const methodName = "wakeUpUserAgent";
    interface Request {
        contact: Contact;
    }
    interface Response {
        status: "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "FAIL";
    }
    function handle({contact}: Request): Promise<Response>;
    function run(contact: Contact): Promise<Response["status"]>;
}
