import * as sip from "./sip";
export declare const relayPort = 8883;
export declare const flowTokenKey = "flowtoken";
export declare const outboundProxyDomainName = "ns.semasim.com";
export declare function getOutboundProxyPublicIp(): Promise<string>;
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
    interface NotifyBrokenFlow extends Message {
        messageId: typeof NotifyBrokenFlow["messageId"];
        flowToken: string;
    }
    namespace NotifyBrokenFlow {
        const messageId = "NotifyClientSocketClosed";
        function buildSipRequest(flowToken: string): sip.Request;
        function match(message: Message): message is NotifyBrokenFlow;
    }
}
