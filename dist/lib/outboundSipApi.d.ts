import * as sip from "./sipLibrary";
import { Contact } from "./endpointsContacts";
export declare function startListening(deviceSocket: sip.Socket): void;
export declare namespace claimDongle {
    const methodName = "claimDongle";
    interface Request {
        imei: string;
    }
    interface Response {
        isGranted: boolean;
    }
    function handle({imei}: Request, newDeviceSocket: sip.Socket): Promise<Response>;
    function run(imei: string): Promise<boolean>;
}
export declare namespace wakeUpUserAgent {
    const methodName = "wakeUpUserAgent";
    interface Request {
        contactOrContactUri: Contact | string;
    }
    interface Response {
        status: "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";
    }
    function handle({contactOrContactUri}: Request): Promise<Response>;
    function run(contactOrContactUri: Contact | string): Promise<Response["status"]>;
}
