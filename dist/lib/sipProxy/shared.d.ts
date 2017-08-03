import * as sip from "./sip";
export interface Message {
    messageId: string;
}
export declare namespace Message {
    function buildSipRequest(data: any): sip.Request;
    function matchSipRequest(sipRequest: sip.Request): boolean;
    function parseSipRequest(sipRequest: sip.Request): Message;
    interface NotifyKnownDongle extends Message {
        messageId: typeof NotifyKnownDongle["messageId"];
        imei: string;
        lastConnection: number;
    }
    namespace NotifyKnownDongle {
        const messageId = "NotifyKnownDongle";
        function buildSipRequest(imei: string, lastConnection: number): sip.Request;
        function match(message: Message): message is NotifyKnownDongle;
    }
}
