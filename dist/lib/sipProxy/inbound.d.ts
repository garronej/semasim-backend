import * as sip from "./sip";
import { SyncEvent } from "ts-events-extended";
import "colors";
export declare const evtIncomingMessage: SyncEvent<{
    message: sip.Request;
    fromContact: string;
}>;
export declare function sendMessage(pjsipContactUri: string, fromUriUser: string, headers: Record<string, string>, content: string, fromName?: string): Promise<boolean>;
export declare let asteriskSockets: sip.Store;
export declare function start(): Promise<void>;
