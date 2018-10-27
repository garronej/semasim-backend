import { types as feTypes } from "../frontend";
import wd = feTypes.webphoneData;
import { Auth } from "./web/sessionManager";
import * as f from "../tools/mysqlCustom";
/** exported only for tests */
export declare let query: f.Api["query"];
/** Must be called and awaited before use */
export declare function launch(): Promise<void>;
/** For test purpose only */
export declare function flush(): Promise<void>;
export declare function getOrCreateInstance(auth: Auth, imsi: string): Promise<{
    instance_id: number;
    chats: wd.Chat[];
}>;
export declare function newChat(auth: Auth, instance_id: number, contactNumber: string, contactName: string, contactIndexInSim: number | null): Promise<{
    chat_id: number;
}>;
export declare function fetchOlderMessages(auth: Auth, chat_id: number, olderThanMessageId: number): Promise<wd.Message[]>;
export declare function updateChat(auth: Auth, chat_id: number, contactIndexInSim: number | null | undefined, contactName: string | undefined, idOfLastMessageSeen: number | null | undefined): Promise<void>;
export declare function destroyChat(auth: Auth, chat_id: number): Promise<undefined>;
export declare function newMessage(auth: Auth, chat_id: number, message: wd.NoId<wd.Message.Incoming | wd.Message.Outgoing.Pending | wd.Message.Outgoing.StatusReportReceived>): Promise<{
    message_id: number;
}>;
export declare function updateMessageOnSendReport(auth: Auth, message_id: number, isSentSuccessfully: boolean): Promise<void>;
export declare function updateMessageOnStatusReport(auth: Auth, message_id: number, deliveredTime: number | null): Promise<void>;
