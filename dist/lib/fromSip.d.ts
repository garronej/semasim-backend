import { AGIChannel } from "ts-async-agi";
import { SipData } from "./evtFromSipData";
export declare namespace fromSip {
    function call(channel: AGIChannel): Promise<void>;
    function data(sipData: SipData): Promise<void>;
    namespace data {
        function message(sipData: SipData, body: string): Promise<void>;
        function request(sipData: SipData, body: string): Promise<void>;
    }
}
