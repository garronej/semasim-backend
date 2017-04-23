import { AGIChannel } from "ts-async-agi";
export declare function fromDongle(channel: AGIChannel): Promise<void>;
export declare namespace fromDongle {
    interface DongleIdentifier {
        name: string;
        provider: string;
        imei: string;
        imsi: string;
        number: string;
    }
    function message(dongle: DongleIdentifier, channel: AGIChannel): Promise<void>;
    function statusReport(dongle: DongleIdentifier, channel: AGIChannel): Promise<void>;
    function call(dongle: DongleIdentifier, channel: AGIChannel): Promise<void>;
}
