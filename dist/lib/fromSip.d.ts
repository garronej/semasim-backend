import { AGIChannel } from "ts-async-agi";
export interface OutOfCallMessage {
    'MESSAGE': {
        'to': string;
        'from': string;
        'base-64-encoded-body': string;
    };
    'MESSAGE_DATA': {
        'Via': string;
        'To': string;
        'From': string;
        'Call-ID': string;
        'CSeq': string;
        'Allow': string;
        'Content-Type': string;
        'User-Agent': string;
        'Authorization': string;
        'Content-Length': string;
    };
}
export declare namespace fromSip {
    function call(channel: AGIChannel): Promise<void>;
    function outOfCallMessage(sipPacket: OutOfCallMessage): Promise<void>;
    namespace outOfCallMessage {
        function sms(sipPacket: OutOfCallMessage): Promise<void>;
        function applicationData(sipPacket: OutOfCallMessage): Promise<void>;
    }
}
