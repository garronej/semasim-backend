import { AGIChannel } from "ts-async-agi";
import { StatusReport, Message } from "chan-dongle-extended-client";
export declare const gain = "4000";
export declare const context = "from-dongle";
export declare const outboundExt = "outbound";
export declare namespace fromDongle {
    function sms(imei: string, message: Message): Promise<void>;
    function statusReport(imei: string, statusReport: StatusReport): Promise<void>;
    function call(channel: AGIChannel): Promise<void>;
    namespace call {
        function inbound(channel: AGIChannel): Promise<void>;
        function outbound(channel: AGIChannel): Promise<void>;
    }
}
