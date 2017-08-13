import { LockedDongle } from "chan-dongle-extended-client";
import * as sip from "./sipLibrary";
export declare function startListening(): void;
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
        lastFourDigitsOfIccid: string;
        pinFirstTry: string;
        pinSecondTry?: string;
    }
    interface Response {
        dongleFound: boolean;
        pinState?: LockedDongle["pinState"] | "READY";
        tryLeft?: number;
    }
    function handle({imei, lastFourDigitsOfIccid, pinFirstTry, pinSecondTry}: Request): Promise<Response>;
    function run(deviceSocket: sip.Socket, request: Request): Promise<Response>;
}
