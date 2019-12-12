export declare function launch(): void;
export declare const dbWebphoneData: {
    "flush": () => Promise<void>;
    "deleteAllUserData": (user: number) => Promise<void>;
    "getUserSimChats": (user: number, imsi: string, maxMessageCountByChat: number) => Promise<import("../../../../frontend/shared/dist/lib/types/webphoneData/types").Chat<"ENCRYPTED">[]>;
    "newChat": (user: number, imsi: string, ref: string, contactNumber: {
        encrypted_string: string;
    }, contactName: {
        encrypted_string: string;
    }, contactIndexInSim: {
        encrypted_number_or_null: string;
    }) => Promise<{
        isUnchanged: boolean;
    }>;
    "fetchOlderMessages": (user: number, imsi: string, chatRef: string, olderThanTime: number, maxMessageCount: number) => Promise<import("../../../../frontend/shared/dist/lib/types/webphoneData/types").Message<"ENCRYPTED">[]>;
    "updateChatContactNameOrIndexInSim": (user: number, imsi: string, chatRef: string, contactIndexInSim: {
        encrypted_number_or_null: string;
    } | undefined, contactName: {
        encrypted_string: string;
    } | undefined) => Promise<{
        isUnchanged: boolean;
    }>;
    "updateChatLastMessageSeen": (user: number, imsi: string, chatRef: string, refOfLastMessageSeen: string) => Promise<{
        isUnchanged: boolean;
    }>;
    "destroyChat": (user: number, imsi: string, chatRef: string) => Promise<{
        isUnchanged: boolean;
    }>;
    "newMessage": (user: number, imsi: string, chatRef: string, message: import("../../../../frontend/shared/dist/lib/types/webphoneData/types").Message.Incoming.Text<"ENCRYPTED"> | import("../../../../frontend/shared/dist/lib/types/webphoneData/types").Message.Incoming.Notification<"ENCRYPTED"> | import("../../../../frontend/shared/dist/lib/types/webphoneData/types").Message.Outgoing.Pending<"ENCRYPTED">) => Promise<{
        isUnchanged: boolean;
    }>;
    "updateMessageOnSendReport": (user: number, imsi: string, chatRef: string, messageRef: string, isSentSuccessfully: boolean) => Promise<{
        isUnchanged: boolean;
    }>;
    "updateMessageOnStatusReport": (user: number, imsi: string, chatRef: string, messageRef: string, deliveredTime: number | null, sentBy: ({
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
