import { LockedDongle } from "chan-dongle-extended-client";
import * as sip from "./sipLibrary";
export declare function startListening(proxySocket: sip.Socket): void;
export declare namespace isDongleConnected {
    const methodName = "isDongleConnected";
    interface Request {
        imei: string;
    }
    interface Response {
        isConnected: boolean;
        lastConnectionTimestamp: number;
    }
    function handle({imei}: Request): Promise<Response>;
    function run(deviceSocket: sip.Socket, imei: string): Promise<Response>;
}
export declare namespace unlockDongle {
    const methodName = "unlockDongle";
    interface Request {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try: string;
        pin_second_try?: string;
    }
    interface Response {
        dongleFound: boolean;
        pinState?: LockedDongle["pinState"] | "READY";
        tryLeft?: number;
    }
    function handle({imei, last_four_digits_of_iccid, pin_first_try, pin_second_try}: Request): Promise<Response>;
    function run(deviceSocket: sip.Socket, request: Request): Promise<Response>;
}
