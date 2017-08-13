import { SyncEvent } from "ts-events-extended";
import * as sip from "./sipLibrary";

namespace Message {

    const sipMethod = "INTERNAL";
    const actionIdKey= "action-id";
    const methodKey= "method";

    export function buildSip(
        actionId: number,
        payload: Record<string, any>
    ): sip.Request {

        let sipRequest = sip.parse([
            `${sipMethod} _ SIP/2.0`,
            "\r\n"
        ].join("\r\n")) as sip.Request;

        sipRequest.headers[actionIdKey] = `${actionId++}`;

        sipRequest.content = JSON.stringify(payload);

        return sipRequest;

    }

    export function matchSip(sipRequest: sip.Request): boolean {
        return sipRequest.method === sipMethod;
    }

    export function readActionId(sipRequest: sip.Request): number {
        return parseInt(sipRequest.headers[actionIdKey]);
    }

    export function parsePayload(sipRequest: sip.Request): Record<string, any>{
        return JSON.parse(sipRequest.content);
    }

    export namespace Request {

        let actionIdCounter = 0;

        export function buildSip(
            method: string,
            payload: Record<string, any>,
        ) {

            let sipRequest = Message.buildSip(actionIdCounter++, payload);

            sipRequest.headers[methodKey]= method;

            return sipRequest;

        }

        export function matchSip(
            sipRequest: sip.Request
        ): boolean {

            return (
                Message.matchSip(sipRequest) &&
                sipRequest.headers[methodKey]
            );

        }

        export function readMethod(sipRequest: sip.Request): string {
            return sipRequest.headers[methodKey];
        }


    }

    export namespace Response {

        export function buildSip(
            actionId: number,
            payload: Record<string, any>,
        ) {

            let sipRequest = Message.buildSip(actionId, payload);

            return sipRequest;

        }

        export function matchSip(
            sipRequest: sip.Request, 
            actionId: number
        ): boolean {

            return (
                Message.matchSip(sipRequest) &&
                sipRequest.headers[methodKey] === undefined &&
                Message.readActionId(sipRequest) === actionId
            );

        }


    }


}


export type EvtType= {
    method: string;
    payload: Record<string, any>;
    sendResponse: (response: Record<string, any>) => void;
}

export function startListening(sipSocket: sip.Socket): SyncEvent<EvtType> {

    let evt = new SyncEvent<EvtType>();

    sipSocket.evtRequest.attachExtract(
        sipRequest => Message.Request.matchSip(sipRequest),
        sipRequest => {

            let actionId= Message.readActionId(sipRequest);

            let method= Message.Request.readMethod(sipRequest);

            let payload= Message.parsePayload(sipRequest);

            evt.post({
                method, 
                payload, 
                "sendResponse": payload => sipSocket.write(Message.Response.buildSip(actionId, payload))
            })

        }
    );

    return evt;

}

export async function sendRequest(
    sipSocket: sip.Socket, 
    method: string, 
    payload: Record<string, any>
): Promise<Record<string, any>>{

    let sipRequest= Message.Request.buildSip(method, payload);

    let actionId= Message.readActionId(sipRequest);

    sipSocket.write(sipRequest);

    let sipRequestResponse= await sipSocket.evtRequest.waitForExtract( 
        sipRequestResponse => Message.Response.matchSip(sipRequestResponse, actionId),
    );

    return Message.parsePayload(sipRequestResponse);

}


//deviceSockets.add(message.imei, deviceSocket);