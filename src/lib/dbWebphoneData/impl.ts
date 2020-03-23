import * as types from "../../frontend/types";
import { assert } from "../../frontend/tools";
import * as mysqlCustom from "../../tools/mysqlCustom";
import { deploy } from "../../deploy";

export function connectToDbAndGetMysqlApi(
    connectionType: "POOL" | "SINGLE CONNECTION"
): mysqlCustom.Api {
    return mysqlCustom.createPoolAndGetApi(
        {
            ...deploy.dbAuth.value,
            "database": "semasim_webphone_data",
        },
        undefined,
        connectionType === "SINGLE CONNECTION" ? 1 : undefined
    );
}

export function getApi(getMysqlApi: () => mysqlCustom.Api) {

    const query: mysqlCustom.Api["query"] = (...args) => getMysqlApi().query(...args);
    const esc: mysqlCustom.Api["esc"] = (...args) => getMysqlApi().esc(...args);
    const buildInsertQuery: mysqlCustom.Api["buildInsertQuery"] = (...args) => getMysqlApi().buildInsertQuery(...args);

    return {
        "flush": async ()=> {
            
            const sql = `DELETE FROM chat WHERE 1;`;

            await query(sql);

        },
        "deleteAllUserData": async (user: number): Promise<void> => {

            const sql = `DELETE FROM chat WHERE user=${esc(user)};`;

            await query(sql, { user });

        },
        "getUserSimChats": async (
            user: number,
            imsi: string,
            maxMessageCountByChat: number
        ): Promise<types.wd.Chat<"ENCRYPTED">[]> => {

            const sql = [
                `SELECT chat.*, message.ref AS ref_of_last_message_seen`,
                `FROM chat`,
                `LEFT JOIN message ON message.id_=chat.last_message_seen`,
                `WHERE user=${esc(user)} AND imsi=${esc(imsi)}`,
                `;`,
                `SELECT message.*`,
                `FROM message`,
                `INNER JOIN chat ON chat.id_=message.chat`,
                `WHERE user=${esc(user)} AND imsi=${esc(imsi)}`,
                `ORDER BY message.time DESC`,
                `LIMIT ${esc(maxMessageCountByChat)}`
            ].join("\n");

            const resp = await query(sql, { user });

            const chatById = new Map<number, types.wd.Chat<"ENCRYPTED">>();

            for (const row of resp[0] as Record<string, mysqlCustom.TSql>[]) {

                const chat: types.wd.Chat<"ENCRYPTED"> = {
                    "ref": row["ref"] as string,
                    "contactNumber": { "encrypted_string": row["contact_number_enc"] as string },
                    "contactName": { "encrypted_string": row["contact_name_enc"] as string },
                    "contactIndexInSim": { "encrypted_number_or_null": row["contact_index_in_sim_enc"] as string },
                    "messages": [],
                    "refOfLastMessageSeen": row["ref_of_last_message_seen"] as string | null
                };

                chatById.set(row["id_"] as number, chat);

            }


            for (const row of resp[1]) {

                const { message, chat_id } = parseMessage(row);

                chatById.get(chat_id)!.messages.push(message);

            }

            const chats = Array.from(chatById.values());

            //NOTE: We reverse here instead in SQL query because we do not pull all the messages.
            //We return the message from the older to the newest.
            //This is not the real conversation time but it's a (premature?) optimization as the 
            //ordering will be very close from the real one.
            for (const chat of chats) {

                chat.messages.reverse();

            }

            return chats;

        },
        "newChat": async (
            user: number,
            imsi: string,
            ref: string,
            contactNumber: types.wd.Encryptable["string"]["ENCRYPTED"],
            contactName: types.wd.Encryptable["string"]["ENCRYPTED"],
            contactIndexInSim: types.wd.Encryptable["number | null"]["ENCRYPTED"]
        ): Promise<{ isUnchanged: boolean; }> => {

            /*
            const sql = [
                buildInsertQuery("chat", {
                    user,
                    imsi,
                    ref,
                    "contact_number_enc": contactNumber.encrypted_string,
                    "contact_name_enc": contactName.encrypted_string,
                    "contact_index_in_sim_enc": contactIndexInSim.encrypted_number_or_null,
                    "last_message_seen": null
                }, "IGNORE"),
                `SELECT message.ref AS ref_of_last_message_seen`,
                `FROM chat`,
                `INNER JOIN message ON message.id_=chat.last_message_seen`,
                `WHERE chat.user=${esc(user)} AND chat.imsi=${esc(imsi)} AND chat.ref=${esc(ref)}`
            ].join("\n");

            const rows = (await query(sql, { user })).pop();

            return {
                "refOfLastMessageSeen": rows.length === 0 ?
                    null : rows[0]["ref_of_last_message_seen"]
            };
            */

            /*
            const sql = buildInsertQuery("chat", {
                user,
                imsi,
                ref,
                "contact_number_enc": contactNumber.encrypted_string,
                "contact_name_enc": contactName.encrypted_string,
                "contact_index_in_sim_enc": contactIndexInSim.encrypted_number_or_null,
                "last_message_seen": null
            }, "IGNORE");

            console.log(sql);

            const res = await query(sql, { user });

            console.log("newChat");

            console.log(JSON.stringify(res,null,2));

            process.exit(0);

            //TODO: Return true if new row have been inserted.

            return { "isUnchanged": false };
            */


            const sql = buildInsertQuery("chat", {
                user,
                imsi,
                ref,
                "contact_number_enc": contactNumber.encrypted_string,
                "contact_name_enc": contactName.encrypted_string,
                "contact_index_in_sim_enc": contactIndexInSim.encrypted_number_or_null,
                "last_message_seen": null
            }, "IGNORE");

            const res = await query(sql, { user });

            return { "isUnchanged": res["affectedRows"] === 0 };
            /*
            const out= { "isUnchanged": res["affectedRows"] === 0 };

            console.log(out);

            return out;
            */


        },
        "fetchOlderMessages": async (
            user: number,
            imsi: string,
            chatRef: string,
            olderThanTime: number,
            maxMessageCount: number
        ): Promise<types.wd.Message<"ENCRYPTED">[]> => {

            const sql = [
                `SELECT message.*`,
                `FROM message`,
                `INNER JOIN chat ON chat.id_=message.chat`,
                `WHERE ` + [
                    `chat.user=${esc(user)}`,
                    `chat.imsi=${esc(imsi)}`,
                    `chat.ref=${esc(chatRef)}`,
                    `message.time < ${esc(olderThanTime)}`
                ].join(" AND "),
                `ORDER BY message.time DESC`,
                `LIMIT ${esc(maxMessageCount)}`
            ].join("\n");

            const rows = await query(sql, { user, imsi });

            return rows
                .map(row => parseMessage(row).message)
                .reverse()
                ;

        },
        "updateChatContactNameOrIndexInSim": async (
            user: number,
            imsi: string,
            chatRef: string,
            contactIndexInSim: types.wd.Encryptable["number | null"]["ENCRYPTED"] | undefined,
            contactName: types.wd.Encryptable["string"]["ENCRYPTED"] | undefined,
        ): Promise<{ isUnchanged: boolean; }> => {

            const set_clause = [
                ...(contactIndexInSim !== undefined ? [`contact_index_in_sim_enc=${esc(contactIndexInSim.encrypted_number_or_null)}`] : []),
                ...(contactName !== undefined ? [`contact_name_enc=${esc(contactName.encrypted_string)}`] : [])
            ];

            if (set_clause.length === 0) {
                return { "isUnchanged": true };
            }

            const sql = [
                `UPDATE chat`,
                `   SET ${set_clause.join(", ")}`,
                `WHERE user=${esc(user)} AND imsi=${esc(imsi)} AND ref=${esc(chatRef)}`
            ].join("\n");

            const res = await query(sql, { user });

            return { "isUnchanged": res["changedRows"] === 0 };

        },
        /** Return true if chat row updated,
         * chat row updated if the ref point to a message
         * more resent that the current one.
         */
        "updateChatLastMessageSeen": async (
            user: number,
            imsi: string,
            chatRef: string,
            refOfLastMessageSeen: string
        ): Promise<{ isUnchanged: boolean; }> => {

            const sql = [
                `SELECT @current_last_message_seen_ordering_time:=NULL, @new_last_message_seen_ordering_time:=NULL, @message_id_:=NULL`,
                `;`,
                `SELECT`,
                `   @current_last_message_seen_ordering_time:= IF(message.outgoing_delivered_time IS NULL, message.time, message.outgoing_delivered_time)`,
                `FROM chat`,
                `INNER JOIN message ON chat.last_message_seen=message.id_`,
                `WHERE chat.user=${esc(user)} AND chat.imsi=${esc(imsi)} AND chat.ref=${esc(chatRef)}`,
                `;`,
                `SELECT`,
                `   @new_last_message_seen_ordering_time:= IF(message.outgoing_delivered_time IS NULL, message.time, message.outgoing_delivered_time),`,
                `   @message_id_:=message.id_`,
                `FROM message`,
                `INNER JOIN chat ON chat.id_=message.chat`,
                `WHERE chat.user=${esc(user)} AND chat.imsi=${esc(imsi)} AND message.ref=${esc(refOfLastMessageSeen)}`,
                `;`,
                `UPDATE chat`,
                `SET last_message_seen=@message_id_`,
                `WHERE ` + [
                    `( @current_last_message_seen_ordering_time IS NULL OR @new_last_message_seen_ordering_time > @current_last_message_seen_ordering_time )`,
                    `user=${esc(user)}`,
                    `imsi=${esc(imsi)}`,
                    `ref=${esc(chatRef)}`
                ].join(" AND ")
            ].join("\n");

            const queryResult = await query(sql, { user });

            return { "isUnchanged": queryResult[queryResult.length - 1]["changedRows"] === 0 };

        },
        "destroyChat": async (
            user: number,
            imsi: string,
            chatRef: string
        ): Promise<{ isUnchanged: boolean; }> => {

            const sql = `DELETE FROM chat WHERE user=${esc(user)} AND imsi=${esc(imsi)} AND ref=${esc(chatRef)}`;

            const res = await query(sql, { user });

            return { "isUnchanged": res["affectedRows"] === 0 };

        },
        "newMessage": async (
            user: number,
            imsi: string,
            chatRef: string,
            message:
                types.wd.Message.Incoming<"ENCRYPTED"> |
                types.wd.Message.Outgoing.Pending<"ENCRYPTED">
        ): Promise<{ isUnchanged: boolean; }> => {


            let is_incoming: 0 | 1;
            let incoming_is_notification: 0 | 1 | null;
            let outgoing_status_code: 0 | null;

            switch (message.direction) {
                case "INCOMING":
                    is_incoming = mysqlCustom.bool.enc(true);
                    incoming_is_notification = mysqlCustom.bool.enc(message.isNotification);
                    outgoing_status_code = null;
                    break;
                case "OUTGOING":
                    is_incoming = mysqlCustom.bool.enc(false);
                    incoming_is_notification = null;
                    outgoing_status_code = 0;
                    break;
            }

            const sql = [
                `SELECT @chat_id_:=NULL`,
                `;`,
                `SELECT @chat_id_:=id_`,
                `FROM chat`,
                `WHERE user=${esc(user)} AND imsi=${esc(imsi)} AND ref=${esc(chatRef)}`,
                `;`,
                buildInsertQuery("message", {
                    "ref": message.ref,
                    "chat": { "@": "chat_id_" },
                    "time": message.time,
                    "text_enc": message.text.encrypted_string,
                    is_incoming,
                    incoming_is_notification,
                    outgoing_status_code,
                    "outgoing_is_sent_successfully": null,
                    "outgoing_delivered_time": null,
                    "outgoing_sent_by_email_enc": null
                }, "IGNORE")
            ].join("\n");

            const res = await query(sql, { user });

            return { "isUnchanged":  res[res.length-1]["affectedRows"] === 0 };



        },
        "updateMessageOnSendReport": async (
            user: number,
            imsi: string,
            chatRef: string,
            messageRef: string,
            isSentSuccessfully: boolean
        ): Promise<{ isUnchanged: boolean; }> => {

            const sql = [
                `UPDATE message`,
                `INNER JOIN chat ON chat.id_=message.chat`,
                `SET`,
                `   message.outgoing_status_code=1,`,
                `   message.outgoing_is_sent_successfully=${isSentSuccessfully ? 1 : 0}`,
                `WHERE ` + [
                    `chat.user=${esc(user)}`,
                    `chat.imsi=${esc(imsi)}`,
                    `chat.ref=${esc(chatRef)}`,
                    `message.ref=${esc(messageRef)}`,
                    `message.outgoing_status_code=0`
                ].join(" AND ")
            ].join("\n");

            const res = await query(sql, { user });

            return { "isUnchanged": res["changedRows"] === 0 };

        },
        "updateMessageOnStatusReport": async (
            user: number,
            imsi: string,
            chatRef: string,
            messageRef: string,
            deliveredTime: number | null,
            sentBy: types.wd.Message.Outgoing.StatusReportReceived<"ENCRYPTED">["sentBy"]
        ): Promise<{ isUnchanged: boolean; }> => {

            const sql = [
                `UPDATE message`,
                `INNER JOIN chat ON chat.id_=message.chat`,
                `SET`,
                `   message.outgoing_status_code=2,`,
                `   message.outgoing_delivered_time=${esc(deliveredTime)},`,
                `   message.outgoing_sent_by_email_enc=${esc(sentBy.who === "OTHER" ? sentBy.email.encrypted_string : null)}`,
                `WHERE ` + [
                    `chat.user=${esc(user)}`,
                    `chat.imsi=${esc(imsi)}`,
                    `chat.ref=${esc(chatRef)}`,
                    `message.ref=${esc(messageRef)}`,
                    `message.outgoing_status_code=1`
                ].join(" AND ")
            ].join("\n");

            const res = await query(sql, { user });

            return { "isUnchanged": res["changedRows"] === 0 };

        }
    };

}


function parseMessage(row: Record<string, mysqlCustom.TSql>): { message: types.wd.Message<"ENCRYPTED">; chat_id: number; } {

    //NOTE: Typescript fail to infer that message is always init.
    let message: types.wd.Message<"ENCRYPTED"> = null as any;

    const ref = row["ref"] as string;
    const time = row["time"] as number;
    const text = { "encrypted_string": row["text_enc"] as string };
    const direction: types.wd.Message._Base<"ENCRYPTED">["direction"] =
        row["is_incoming"] === 1 ? "INCOMING" : "OUTGOING";

    switch (direction) {
        case "INCOMING": {

            const isNotification = row["incoming_is_notification"] === 1;

            if (isNotification) {

                const m: types.wd.Message.Incoming.Notification<"ENCRYPTED"> = {
                    ref, time, text, direction, isNotification
                };

                message = m;

            } else {

                const m: types.wd.Message.Incoming.Text<"ENCRYPTED"> = {
                    ref, time, text, direction, isNotification
                };

                message = m;

            }

        } break;
        case "OUTGOING": {

            const status: types.wd.Message.Outgoing._Base<"ENCRYPTED">["status"] = ((status: 0 | 1 | 2) => {
                switch (status) {
                    case 0: return "PENDING";
                    case 1: return "SEND REPORT RECEIVED";
                    case 2: return "STATUS REPORT RECEIVED";
                }
            })(row["outgoing_status_code"] as any);

            switch (status) {
                case "PENDING": {

                    const m: types.wd.Message.Outgoing.Pending<"ENCRYPTED"> = {
                        ref, time, text, direction, status
                    };

                    message = m;

                } break;
                case "SEND REPORT RECEIVED": {

                    const m: types.wd.Message.Outgoing.SendReportReceived<"ENCRYPTED"> = {
                        ref, time, text, direction, status,
                        "isSentSuccessfully":
                            row["outgoing_is_sent_successfully"] === 1
                    };

                    message = m;


                } break;
                case "STATUS REPORT RECEIVED": {

                    const deliveredTime =
                        row["outgoing_delivered_time"] as number | null;

                    const email_enc =
                        row["outgoing_sent_by_email_enc"] as string | null;

                    if (email_enc === null) {

                        const m: types.wd.Message.Outgoing.StatusReportReceived.SentByUser<"ENCRYPTED"> = {
                            ref, time, text, direction, status,
                            deliveredTime,
                            "sentBy": { "who": "USER" }
                        };

                        message = m;

                    } else {

                        const m: types.wd.Message.Outgoing.StatusReportReceived.SentByOther<"ENCRYPTED"> = {
                            ref, time, text, direction, status,
                            deliveredTime,
                            "sentBy": { "who": "OTHER", "email": { "encrypted_string": email_enc } }
                        };

                        message = m;

                    }


                } break;
            }

        } break;
    }

    assert(!!message);

    return { message, "chat_id": row["chat"] as number };

}


