import { AGIChannel } from "ts-async-agi";
import { StatusReport, Message } from "chan-dongle-extended-client";
export declare namespace fromDongle {
    function sms(imei: string, message: Message): Promise<void>;
    function statusReport(imei: string, statusReport: StatusReport): Promise<void>;
    function call(channel: AGIChannel): Promise<void>;
}
