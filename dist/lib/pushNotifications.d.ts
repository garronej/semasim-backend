import { types as gwTypes } from "../gateway";
export declare function launch(): void;
export declare type Payload = Payload.ReloadConfig | Payload.WakeUp | Payload.ReRegisterOnNewConnection | Payload.SimConnectivity;
export declare namespace Payload {
    type ReloadConfig = {
        type: "RELOAD CONFIG";
    };
    type WakeUp = {
        type: "WAKE UP";
        imsi: string;
    };
    type ReRegisterOnNewConnection = {
        type: "RE REGISTER ON NEW CONNECTION";
    };
    type SimConnectivity = {
        type: "SIM CONNECTIVITY";
        isOnline: "0" | "1";
        imsi: string;
    };
}
declare function send(uas: gwTypes.Ua[], payload: Payload): Promise<void>;
export declare const sendSafe: typeof send;
export {};
