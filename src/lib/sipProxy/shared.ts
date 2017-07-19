import * as sip from "./sip";
import * as dns from "dns";

export const relayPort = 8883;
export const flowTokenKey = "flowtoken";

export const outboundProxyDomainName= "ns.semasim.com";

let outboundProxyPublicIp: string | undefined = undefined;

export async function getOutboundProxyPublicIp(): Promise<string> {

    if (outboundProxyPublicIp) return outboundProxyPublicIp;

    return new Promise<string>(resolve => 
        dns.resolve4(outboundProxyDomainName, (error, addresses) => {

            if (error) throw error;

            resolve(addresses[0]);


        })
    );

}


//TODO: implement ping/pong

export interface Message {
    messageId: string;
}

export namespace Message {

    const method = "INTERNAL";

    const message = sip.parse([
        `${method} _ SIP/2.0`,
        "\r\n"
    ].join("\r\n")) as sip.Request;

    export function buildSipRequest(data: any): sip.Request {

        let newMessage = sip.copyMessage(message);

        newMessage.content = JSON.stringify(data);

        return newMessage;

    }

    export function matchSipRequest(sipRequest: sip.Request): boolean {
        return sipRequest.method === method;
    }

    export function parseSipRequest(sipRequest: sip.Request): Message {
        return JSON.parse(sipRequest.content);
    }


    export interface NotifyKnownDongle extends Message {
        messageId: typeof NotifyKnownDongle["messageId"];
        imei: string;
        lastConnection: number;
    }


    export namespace NotifyKnownDongle {

        export const messageId = "NotifyKnownDongle";

        export function buildSipRequest(imei: string, lastConnection: number): sip.Request {

            let notifyKnownDongle: NotifyKnownDongle = { messageId, imei, lastConnection };

            return Message.buildSipRequest(notifyKnownDongle);

        }

        export function match(message: Message): message is NotifyKnownDongle {

            return message.messageId === messageId;

        }

    }

    export interface NotifyBrokenFlow extends Message {
        messageId: typeof NotifyBrokenFlow["messageId"];
        flowToken: string;
    }

    export namespace NotifyBrokenFlow {
        export const messageId = "NotifyClientSocketClosed";

        export function buildSipRequest(flowToken: string): sip.Request {

            let notifyClientSocketClosed: NotifyBrokenFlow = { messageId, flowToken };

            return Message.buildSipRequest(notifyClientSocketClosed);

        }

        export function match(message: Message): message is NotifyBrokenFlow {
            return message.messageId === messageId;
        }


    }


}


