"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysqlCustom = require("../../tools/mysqlCustom");
const deploy_1 = require("../../deploy");
const assert = require("assert");
function connectToDbAndGetMysqlApi(connectionType) {
    return mysqlCustom.createPoolAndGetApi(Object.assign(Object.assign({}, deploy_1.deploy.dbAuth.value), { "database": "semasim_webphone_data" }), undefined, connectionType === "SINGLE CONNECTION" ? 1 : undefined);
}
exports.connectToDbAndGetMysqlApi = connectToDbAndGetMysqlApi;
function getApi(getMysqlApi) {
    const query = (...args) => getMysqlApi().query(...args);
    const esc = (...args) => getMysqlApi().esc(...args);
    const buildInsertQuery = (...args) => getMysqlApi().buildInsertQuery(...args);
    return {
        "flush": async () => {
            const sql = `DELETE FROM chat WHERE 1;`;
            await query(sql);
        },
        "deleteAllUserData": async (user) => {
            const sql = `DELETE FROM chat WHERE user=${esc(user)};`;
            await query(sql, { user });
        },
        "getUserSimChats": async (user, imsi, maxMessageCountByChat) => {
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
            const chatById = new Map();
            for (const row of resp[0]) {
                const chat = {
                    "ref": row["ref"],
                    "contactNumber": { "encrypted_string": row["contact_number_enc"] },
                    "contactName": { "encrypted_string": row["contact_name_enc"] },
                    "contactIndexInSim": { "encrypted_number_or_null": row["contact_index_in_sim_enc"] },
                    "messages": [],
                    "refOfLastMessageSeen": row["ref_of_last_message_seen"]
                };
                chatById.set(row["id_"], chat);
            }
            for (const row of resp[1]) {
                const { message, chat_id } = parseMessage(row);
                chatById.get(chat_id).messages.push(message);
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
        "newChat": async (user, imsi, ref, contactNumber, contactName, contactIndexInSim) => {
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
        "fetchOlderMessages": async (user, imsi, chatRef, olderThanTime, maxMessageCount) => {
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
                .reverse();
        },
        "updateChatContactNameOrIndexInSim": async (user, imsi, chatRef, contactIndexInSim, contactName) => {
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
        "updateChatLastMessageSeen": async (user, imsi, chatRef, refOfLastMessageSeen) => {
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
        "destroyChat": async (user, imsi, chatRef) => {
            const sql = `DELETE FROM chat WHERE user=${esc(user)} AND imsi=${esc(imsi)} AND ref=${esc(chatRef)}`;
            const res = await query(sql, { user });
            return { "isUnchanged": res["affectedRows"] === 0 };
        },
        "newMessage": async (user, imsi, chatRef, message) => {
            let is_incoming;
            let incoming_is_notification;
            let outgoing_status_code;
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
            return { "isUnchanged": res[res.length - 1]["affectedRows"] === 0 };
        },
        "updateMessageOnSendReport": async (user, imsi, chatRef, messageRef, isSentSuccessfully) => {
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
        "updateMessageOnStatusReport": async (user, imsi, chatRef, messageRef, deliveredTime, sentBy) => {
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
exports.getApi = getApi;
function parseMessage(row) {
    //NOTE: Typescript fail to infer that message is always init.
    let message = null;
    const ref = row["ref"];
    const time = row["time"];
    const text = { "encrypted_string": row["text_enc"] };
    const direction = row["is_incoming"] === 1 ? "INCOMING" : "OUTGOING";
    switch (direction) {
        case "INCOMING":
            {
                const isNotification = row["incoming_is_notification"] === 1;
                if (isNotification) {
                    const m = {
                        ref, time, text, direction, isNotification
                    };
                    message = m;
                }
                else {
                    const m = {
                        ref, time, text, direction, isNotification
                    };
                    message = m;
                }
            }
            break;
        case "OUTGOING":
            {
                const status = ((status) => {
                    switch (status) {
                        case 0: return "PENDING";
                        case 1: return "SEND REPORT RECEIVED";
                        case 2: return "STATUS REPORT RECEIVED";
                    }
                })(row["outgoing_status_code"]);
                switch (status) {
                    case "PENDING":
                        {
                            const m = {
                                ref, time, text, direction, status
                            };
                            message = m;
                        }
                        break;
                    case "SEND REPORT RECEIVED":
                        {
                            const m = {
                                ref, time, text, direction, status,
                                "isSentSuccessfully": row["outgoing_is_sent_successfully"] === 1
                            };
                            message = m;
                        }
                        break;
                    case "STATUS REPORT RECEIVED":
                        {
                            const deliveredTime = row["outgoing_delivered_time"];
                            const email_enc = row["outgoing_sent_by_email_enc"];
                            if (email_enc === null) {
                                const m = {
                                    ref, time, text, direction, status,
                                    deliveredTime,
                                    "sentBy": { "who": "USER" }
                                };
                                message = m;
                            }
                            else {
                                const m = {
                                    ref, time, text, direction, status,
                                    deliveredTime,
                                    "sentBy": { "who": "OTHER", "email": { "encrypted_string": email_enc } }
                                };
                                message = m;
                            }
                        }
                        break;
                }
            }
            break;
    }
    assert(!!message);
    return { message, "chat_id": row["chat"] };
}
