import * as sip from "./sip";




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



}


