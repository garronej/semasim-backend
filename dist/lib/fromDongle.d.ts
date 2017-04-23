import { AGIChannel } from "ts-async-agi";
import { StatusReport, Message } from "chan-dongle-extended-client";
export declare namespace fromDongle {
    interface DongleIdentifier {
        name: string;
        provider: string;
        imei: string;
        imsi: string;
        number: string;
    }
    function sms(imei: string, message: Message): Promise<void>;
    function statusReport(imei: string, statusReport: StatusReport): Promise<void>;
    function call(channel: AGIChannel): Promise<void>;
}
