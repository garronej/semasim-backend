import { SyncEvent } from "ts-events-extended";
import * as sip from "./sipLibrary";
export declare type EvtType = {
    method: string;
    payload: Record<string, any>;
    sendResponse: (response: Record<string, any>) => void;
};
export declare function startListening(sipSocket: sip.Socket): SyncEvent<EvtType>;
export declare function sendRequest(sipSocket: sip.Socket, method: string, payload: Record<string, any>): Promise<Record<string, any>>;
