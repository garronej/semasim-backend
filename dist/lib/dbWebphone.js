"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const f = require("../tools/mysqlCustom");
const deploy_1 = require("../deploy");
let esc;
let buildInsertQuery;
/** Must be called and awaited before use */
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        let api = f.createPoolAndGetApi(Object.assign({}, (yield deploy_1.deploy.getDbAuth()), { "database": "semasim_webphone" }), "HANDLE STRING ENCODING");
        exports.query = api.query;
        esc = api.esc;
        buildInsertQuery = api.buildInsertQuery;
    });
}
exports.launch = launch;
/** For test purpose only */
function flush() {
    return __awaiter(this, void 0, void 0, function* () {
        yield exports.query("DELETE FROM instance");
    });
}
exports.flush = flush;
function parseMessage(row) {
    //NOTE: Typescript fail to infer that message is always init.
    let message = null;
    const id_ = row["id_"];
    const time = row["time"];
    const text = row["text"];
    const direction = row["is_incoming"] === 1 ? "INCOMING" : "OUTGOING";
    switch (direction) {
        case "INCOMING":
            {
                const isNotification = row["incoming_is_notification"] === 1;
                if (isNotification) {
                    const m = {
                        id_, time, text, direction, isNotification
                    };
                    message = m;
                }
                else {
                    const m = {
                        id_, time, text, direction, isNotification
                    };
                    message = m;
                }
            }
            break;
        case "OUTGOING":
            {
                const status = (() => {
                    switch (row["outgoing_status_code"]) {
                        case 0: return "PENDING";
                        case 1: return "SEND REPORT RECEIVED";
                        case 2: return "STATUS REPORT RECEIVED";
                    }
                })();
                switch (status) {
                    case "PENDING":
                        {
                            const m = {
                                id_, time, text, direction, status
                            };
                            message = m;
                        }
                        break;
                    case "SEND REPORT RECEIVED":
                        {
                            const m = {
                                id_, time, text, direction, status,
                                "isSentSuccessfully": row["outgoing_is_sent_successfully"] === 1
                            };
                            message = m;
                        }
                        break;
                    case "STATUS REPORT RECEIVED":
                        {
                            const deliveredTime = row["outgoing_delivered_time"];
                            const email = row["outgoing_sent_by_email"];
                            if (email === null) {
                                const m = {
                                    id_, time, text, direction, status,
                                    deliveredTime,
                                    "sentBy": { "who": "USER" }
                                };
                                message = m;
                            }
                            else {
                                const m = {
                                    id_, time, text, direction, status,
                                    deliveredTime,
                                    "sentBy": { "who": "OTHER", email }
                                };
                                message = m;
                            }
                        }
                        break;
                }
            }
            break;
    }
    console.assert(!!message);
    return { message, "chat_id": row["chat"] };
}
function getOrCreateInstance(auth, imsi) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = [
            "SELECT @instance_ref:=NULL;",
            buildInsertQuery("instance", { "user": auth.user, imsi }, "IGNORE"),
            `SELECT @instance_ref:=id_ AS id_`,
            `FROM instance`,
            `WHERE user=${esc(auth.user)} AND imsi=${esc(imsi)}`,
            `;`,
            `SELECT *`,
            `FROM chat`,
            `WHERE instance=@instance_ref`,
            `;`,
            `SELECT message.*`,
            `FROM message`,
            `INNER JOIN chat ON chat.id_=message.chat`,
            `WHERE chat.instance=@instance_ref`,
            `ORDER BY message.time DESC`,
            `LIMIT 20`
        ].join("\n");
        const resp = yield exports.query(sql, { "user": auth.user });
        const chatById = new Map();
        for (const row of resp[3]) {
            const chat = {
                "id_": row["id_"],
                "contactNumber": row["contact_number"],
                "contactName": row["contact_name"],
                "contactIndexInSim": row["contact_index_in_sim"],
                "messages": [],
                "idOfLastMessageSeen": row["last_message_seen"]
            };
            chatById.set(chat.id_, chat);
        }
        for (const row of resp[4]) {
            const { message, chat_id } = parseMessage(row);
            chatById.get(chat_id).messages.push(message);
        }
        const chats = Array.from(chatById.values());
        for (const chat of chats) {
            chat.messages.reverse();
        }
        return {
            "instance_id": resp[2][0]["id_"],
            chats
        };
    });
}
exports.getOrCreateInstance = getOrCreateInstance;
function newChat(auth, instance_id, contactNumber, contactName, contactIndexInSim) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = [
            `SELECT _ASSERT( COUNT(*) , 'instance not found')`,
            `FROM instance`,
            `WHERE user= ${esc(auth.user)} AND id_= ${esc(instance_id)}`,
            `;`,
            buildInsertQuery("chat", {
                "instance": instance_id,
                "contact_number": contactNumber,
                "contact_name": contactName,
                "contact_index_in_sim": contactIndexInSim,
                "last_message_seen": null
            }, "THROW ERROR")
        ].join("\n");
        const resp = yield exports.query(sql, { "user": auth.user, instance_id });
        return { "chat_id": resp.pop().insertId };
    });
}
exports.newChat = newChat;
function fetchOlderMessages(auth, chat_id, olderThanMessageId) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = [
            `SELECT @older_than_time:=NULL`,
            `;`,
            `SELECT _ASSERT( COUNT(*), 'chat not found (fetchOlderMessages)')`,
            `FROM chat`,
            `INNER JOIN instance ON instance.id_=chat.instance`,
            `WHERE chat.id_=${esc(chat_id)} AND instance.user=${esc(auth.user)}`,
            `;`,
            `SELECT @older_than_time:=time`,
            `FROM message`,
            `WHERE id_=${esc(olderThanMessageId)}`,
            `;`,
            `SELECT _ASSERT(@older_than_time IS NOT NULL, 'Message older than !exist')`,
            `;`,
            `SELECT *`,
            `FROM message`,
            `WHERE chat=${esc(chat_id)} AND time < @older_than_time`,
            `ORDER BY message.time DESC`,
            `LIMIT 100`
        ].join("\n");
        const resp = yield exports.query(sql, { "user": auth.user, chat_id });
        return resp
            .pop()
            .map(row => parseMessage(row).message)
            .reverse();
    });
}
exports.fetchOlderMessages = fetchOlderMessages;
function updateChat(auth, chat_id, contactIndexInSim, contactName, idOfLastMessageSeen) {
    return __awaiter(this, void 0, void 0, function* () {
        const fields = { "id_": chat_id };
        if (contactIndexInSim !== undefined) {
            fields["contact_index_in_sim"] = contactIndexInSim;
        }
        if (contactName !== undefined) {
            fields["contact_name"] = contactName;
        }
        if (idOfLastMessageSeen !== undefined) {
            fields["last_message_seen"] = idOfLastMessageSeen;
        }
        const sql = [
            `SELECT _ASSERT( COUNT(*), 'chat not found (updateChat)')`,
            `FROM chat`,
            `INNER JOIN instance ON instance.id_=chat.instance`,
            `WHERE chat.id_=${esc(chat_id)} AND instance.user=${esc(auth.user)}`,
            `;`,
            buildInsertQuery("chat", fields, "UPDATE")
        ].join("\n");
        yield exports.query(sql, { "user": auth.user, chat_id });
        return;
    });
}
exports.updateChat = updateChat;
function destroyChat(auth, chat_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = [
            `SELECT _ASSERT( COUNT(*), 'chat not found (destroy chat)')`,
            `FROM chat`,
            `INNER JOIN instance ON instance.id_=chat.instance`,
            `WHERE chat.id_=${esc(chat_id)} AND instance.user=${esc(auth.user)}`,
            `;`,
            `DELETE FROM chat WHERE id_= ${esc(chat_id)}`
        ].join("\n");
        yield exports.query(sql, { "user": auth.user, chat_id });
        return;
    });
}
exports.destroyChat = destroyChat;
//TODO: Wrap assert user own chat in a template.
function newMessage(auth, chat_id, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const m = Object.assign({}, message, { "id_": NaN });
        let is_incoming;
        let incoming_is_notification = null;
        let outgoing_status_code = null;
        let outgoing_is_sent_successfully = null;
        let outgoing_delivered_time = null;
        let outgoing_sent_by_email = null;
        if (m.direction === "INCOMING") {
            is_incoming = f.bool.enc(true);
            incoming_is_notification = f.bool.enc(m.isNotification);
        }
        else {
            is_incoming = f.bool.enc(false);
            switch (m.status) {
                case "PENDING":
                    outgoing_status_code = 0;
                    break;
                case "SEND REPORT RECEIVED":
                    outgoing_status_code = 1;
                    outgoing_is_sent_successfully =
                        f.bool.enc(m.isSentSuccessfully);
                    break;
                case "STATUS REPORT RECEIVED":
                    outgoing_status_code = 2;
                    outgoing_delivered_time = m.deliveredTime;
                    if (m.sentBy.who === "OTHER") {
                        outgoing_sent_by_email = m.sentBy.email;
                    }
                    break;
            }
        }
        const sql = [
            `SELECT _ASSERT( COUNT(*), 'chat not found (newMessage)')`,
            `FROM chat`,
            `INNER JOIN instance ON instance.id_=chat.instance`,
            `WHERE chat.id_=${esc(chat_id)} AND instance.user=${esc(auth.user)}`,
            `;`,
            buildInsertQuery("message", {
                "chat": chat_id,
                "time": message.time,
                "text": message.text,
                is_incoming,
                incoming_is_notification,
                outgoing_status_code,
                outgoing_is_sent_successfully,
                outgoing_delivered_time,
                outgoing_sent_by_email
            }, "THROW ERROR")
        ].join("\n");
        const resp = yield exports.query(sql, { "user": auth.user, chat_id });
        return { "message_id": resp.pop().insertId };
    });
}
exports.newMessage = newMessage;
function updateMessageOnSendReport(auth, message_id, isSentSuccessfully) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = [
            `SELECT _ASSERT( COUNT(*), 'Message not found')`,
            `FROM message`,
            `INNER JOIN chat ON chat.id_=message.chat`,
            `INNER JOIN instance ON instance.id_=chat.instance`,
            `WHERE ` + [
                `instance.user=${esc(auth.user)}`,
                `message.id_=${esc(message_id)}`,
                `message.outgoing_status_code=0`
            ].join(" AND "),
            `;`,
            buildInsertQuery("message", {
                "id_": message_id,
                "outgoing_status_code": 1,
                "outgoing_is_sent_successfully": isSentSuccessfully ? 1 : 0
            }, "UPDATE")
        ].join("\n");
        yield exports.query(sql, { "user": auth.user, message_id });
    });
}
exports.updateMessageOnSendReport = updateMessageOnSendReport;
function updateMessageOnStatusReport(auth, message_id, deliveredTime) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = [
            `SELECT _ASSERT( COUNT(*), 'Message not found')`,
            `FROM message`,
            `INNER JOIN chat ON chat.id_=message.chat`,
            `INNER JOIN instance ON instance.id_=chat.instance`,
            `WHERE ` + [
                `instance.user=${esc(auth.user)}`,
                `message.id_=${esc(message_id)}`,
                `message.outgoing_status_code=1`
            ].join(" AND "),
            `;`,
            buildInsertQuery("message", {
                "id_": message_id,
                "outgoing_status_code": 2,
                "outgoing_delivered_time": deliveredTime
            }, "UPDATE")
        ].join("\n");
        yield exports.query(sql, { "user": auth.user, message_id });
    });
}
exports.updateMessageOnStatusReport = updateMessageOnStatusReport;
