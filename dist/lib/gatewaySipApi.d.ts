import { LockedDongle } from "chan-dongle-extended-client";
import * as sipLibrary from "../tools/sipLibrary";
export declare function startListening(backendSocket: sipLibrary.Socket): void;
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
    function run(gatewaySocket: sipLibrary.Socket, imei: string): Promise<Response>;
}
export declare namespace doesDongleHasSim {
    const methodName = "doesDongleHasSIm";
    interface Request {
        imei: string;
        last_four_digits_of_iccid: string;
    }
    interface Response {
        value: boolean | "MAYBE";
    }
    function handle({imei, last_four_digits_of_iccid}: Request): Promise<Response>;
    function run(gatewaySocket: sipLibrary.Socket, imei: string, last_four_digits_of_iccid: string): Promise<Response["value"]>;
}
export declare namespace unlockDongle {
    const methodName = "unlockDongle";
    interface Request {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try: string;
        pin_second_try?: string;
    }
    type Response = {
        dongleFound: true;
        pinState: LockedDongle["pinState"];
        tryLeft: number;
    } | {
        dongleFound: false;
    } | {
        dongleFound: true;
        pinState: "READY";
        iccid: string;
        number: string | undefined;
        serviceProvider: string | undefined;
    };
    function handle({imei, last_four_digits_of_iccid, pin_first_try, pin_second_try}: Request): Promise<Response>;
    function run(gatewaySocket: sipLibrary.Socket, request: Request): Promise<Response>;
}
