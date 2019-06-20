import { wd } from "../frontend";
import * as f from "../tools/mysqlCustom";
/** exported only for tests */
export declare let query: f.Api["query"];
/** Must be called and awaited before use */
export declare function launch(): void;
/** For test purpose only */
export declare function flush(): Promise<void>;
export declare function deleteAllUserInstance(user: number): Promise<void>;
export declare function getOrCreateInstance(user: number, imsi: string): Promise<{
    instance_id: number;
    chats: wd.Chat<"ENCRYPTED">[];
}>;
export declare function newChat(user: number, instance_id: number, contactNumber: wd.Encryptable["string"]["ENCRYPTED"], contactName: wd.Encryptable["string"]["ENCRYPTED"], contactIndexInSim: wd.Encryptable["number | null"]["ENCRYPTED"]): Promise<{
    chat_id: number;
}>;
export declare function fetchOlderMessages(user: number, chat_id: number, olderThanMessageId: number): Promise<wd.Message<"ENCRYPTED">[]>;
export declare function updateChat(user: number, chat_id: number, contactIndexInSim: wd.Encryptable["number | null"]["ENCRYPTED"] | undefined, contactName: wd.Encryptable["string"]["ENCRYPTED"] | undefined, idOfLastMessageSeen: number | null | undefined): Promise<void>;
export declare function destroyChat(user: number, chat_id: number): Promise<undefined>;
export declare function newMessage(user: number, chat_id: number, message: wd.NoId<wd.Message.Incoming<"ENCRYPTED"> | wd.Message.Outgoing.Pending<"ENCRYPTED"> | wd.Message.Outgoing.StatusReportReceived<"ENCRYPTED">>): Promise<{
    message_id: number;
}>;
export declare function updateMessageOnSendReport(user: number, message_id: number, isSentSuccessfully: boolean): Promise<void>;
export declare function updateMessageOnStatusReport(user: number, message_id: number, deliveredTime: number | null): Promise<void>;
