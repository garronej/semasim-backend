import { AGIChannel } from "ts-async-agi";
export declare const gain = "4000";
export declare const context = "from-dongle";
export declare const outboundExt = "outbound";
export declare const jitterBuffer: {
    type: string;
    params: string;
};
export declare function call(channel: AGIChannel): Promise<void>;
export declare namespace call {
    function inbound(channel: AGIChannel): Promise<void>;
    function outbound(channel: AGIChannel): Promise<void>;
}
