import * as types from "../../frontend/types";
import * as mysqlCustom from "../../tools/mysqlCustom";
export declare function connectToDbAndGetMysqlApi(connectionType: "POOL" | "SINGLE CONNECTION"): mysqlCustom.Api;
export declare function getApi(getMysqlApi: () => mysqlCustom.Api): {
    flush: () => Promise<void>;
    deleteAllUserData: (user: number) => Promise<void>;
    getUserSimChats: (user: number, imsi: string, maxMessageCountByChat: number) => Promise<types.wd.Chat<"ENCRYPTED">[]>;
    newChat: (user: number, imsi: string, ref: string, contactNumber: {
        encrypted_string: string;
    }, contactName: {
        encrypted_string: string;
    }, contactIndexInSim: {
        encrypted_number_or_null: string;
    }) => Promise<{
        isUnchanged: boolean;
    }>;
    fetchOlderMessages: (user: number, imsi: string, chatRef: string, olderThanTime: number, maxMessageCount: number) => Promise<types.wd.Message<"ENCRYPTED">[]>;
    updateChatContactNameOrIndexInSim: (user: number, imsi: string, chatRef: string, contactIndexInSim: {
        encrypted_number_or_null: string;
    } | undefined, contactName: {
        encrypted_string: string;
    } | undefined) => Promise<{
        isUnchanged: boolean;
    }>;
    /** Return true if chat row updated,
     * chat row updated if the ref point to a message
     * more resent that the current one.
     */
    updateChatLastMessageSeen: (user: number, imsi: string, chatRef: string, refOfLastMessageSeen: string) => Promise<{
        isUnchanged: boolean;
    }>;
    destroyChat: (user: number, imsi: string, chatRef: string) => Promise<{
        isUnchanged: boolean;
    }>;
    newMessage: (user: number, imsi: string, chatRef: string, message: types.wd.Message.Incoming.Text<"ENCRYPTED"> | types.wd.Message.Incoming.Notification<"ENCRYPTED"> | types.wd.Message.Outgoing.Pending<"ENCRYPTED">) => Promise<{
        isUnchanged: boolean;
    }>;
    updateMessageOnSendReport: (user: number, imsi: string, chatRef: string, messageRef: string, isSentSuccessfully: boolean) => Promise<{
        isUnchanged: boolean;
    }>;
    updateMessageOnStatusReport: (user: number, imsi: string, chatRef: string, messageRef: string, deliveredTime: number | null, sentBy: ({
        who: "USER";
    } & {
        who: "USER";
    }) | ({
        who: "OTHER";
        email: {
            encrypted_string: string;
        };
    } & {
        who: "USER";
    }) | ({
        who: "USER";
    } & {
        who: "OTHER";
        email: {
            encrypted_string: string;
        };
    }) | ({
        who: "OTHER";
        email: {
            encrypted_string: string;
        };
    } & {
        who: "OTHER";
        email: {
            encrypted_string: string;
        };
    })) => Promise<{
        isUnchanged: boolean;
    }>;
};
