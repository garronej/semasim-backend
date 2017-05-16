import { SyncEvent } from "ts-events-extended";
export declare function sendMessage(endpoint: string, from: string, headers: Record<string, string>, body: string, message_type: string, response_to_call_id?: string, visible_message?: string): Promise<void>;
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
