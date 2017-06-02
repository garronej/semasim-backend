import { SyncEvent } from "ts-events-extended";
export declare function sendHiddenMessage(contacts: string[], from: string, extraHeaders: Record<string, string>, hidden_payload: string, body: string, message_type: string, response_to_call_id?: string): Promise<void>;
export declare function sendMessage(contacts: string[], from: string, extraHeaders: Record<string, string>, payload: string, message_type: string, response_to_call_id?: string): Promise<void>;
export interface PacketSipMessage {
    to: string;
    from_endpoint: string;
    headers: {
        call_id: string;
        [key: string]: string;
    };
    body: string;
}
export declare function getEvtPacketSipMessage(): SyncEvent<PacketSipMessage>;
