import { types as feTypes } from "../frontend";
import wd = feTypes.webphoneData;
import { Auth } from "./web/sessionManager";
import * as f from "../tools/mysqlCustom";
import { deploy } from "../deploy";

/** exported only for tests */
export let query: f.Api["query"];
let esc: f.Api["esc"];
let buildInsertQuery: f.Api["buildInsertQuery"];


/** Must be called and awaited before use */
export async function launch(): Promise<void> {

    let api = f.createPoolAndGetApi({
        ...(await deploy.getDbAuth()),
        "database": "semasim_webphone",
    }, "HANDLE STRING ENCODING");

    query = api.query;
    esc = api.esc;
    buildInsertQuery = api.buildInsertQuery;

}

/** For test purpose only */
export async function flush() {
    await query("DELETE FROM instance");
}

function parseMessage(row: any): { message: wd.Message; chat_id: number; } {

    //NOTE: Typescript fail to infer that message is always init.
    let message: wd.Message = null as any;

    const id_: number = row["id_"];
    const time: number = row["time"];
    const text: string = row["text"];
    const direction: wd.Message._Base["direction"] =
        row["is_incoming"] === 1 ? "INCOMING" : "OUTGOING";

    switch (direction) {
        case "INCOMING": {

            const isNotification: boolean = row["incoming_is_notification"] === 1;

            if (isNotification) {

                const m: wd.Message.Incoming.Notification = {
                    id_, time, text, direction, isNotification
                };

                message = m;

            } else {

                const m: wd.Message.Incoming.Text = {
                    id_, time, text, direction, isNotification
                };

                message = m;

            }

        } break;
        case "OUTGOING": {

            const status: wd.Message.Outgoing._Base["status"] = (() => {
                switch (row["outgoing_status_code"] as (0 | 1 | 2)) {
                    case 0: return "PENDING";
                    case 1: return "SEND REPORT RECEIVED";
                    case 2: return "STATUS REPORT RECEIVED";
                }
            })();

            switch (status) {
                case "PENDING": {

                    const m: wd.Message.Outgoing.Pending = {
                        id_, time, text, direction, status
                    };

                    message = m;

                } break;
                case "SEND REPORT RECEIVED": {

                    const m: wd.Message.Outgoing.SendReportReceived = {
                        id_, time, text, direction, status,
                        "isSentSuccessfully":
                            row["outgoing_is_sent_successfully"] === 1
                    };

                    message = m;


                } break;
                case "STATUS REPORT RECEIVED": {

                    const deliveredTime: number | null =
                        row["outgoing_delivered_time"];

                    const email: string | null =
                        row["outgoing_sent_by_email"];

                    if (email === null) {

                        const m: wd.Message.Outgoing.StatusReportReceived.SentByUser = {
                            id_, time, text, direction, status,
                            deliveredTime,
                            "sentBy": { "who": "USER" }
                        };

                        message = m;


                    } else {

                        const m: wd.Message.Outgoing.StatusReportReceived.SentByOther = {
                            id_, time, text, direction, status,
                            deliveredTime,
                            "sentBy": { "who": "OTHER", email }
                        };

                        message = m;


                    }


                } break;
            }

        } break;
    }

    console.assert(!!message);

    return { message, "chat_id": row["chat"] };

}

export async function getOrCreateInstance(
    auth: Auth,
    imsi: string
): Promise<{ instance_id: number; chats: wd.Chat[]; }> {

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

    const resp = await query(sql, { "user": auth.user });

    const chatById = new Map<number, wd.Chat>();

    for (const row of resp[3]) {

        const chat: wd.Chat = {
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

        chatById.get(chat_id)!.messages.push(message);

    }

    const chats= Array.from(chatById.values());

    for( const chat of chats ){

        chat.messages.reverse();

    }

    return {
        "instance_id": resp[2][0]["id_"],
        chats
    };

}

export async function newChat(
    auth: Auth,
    instance_id: number,
    contactNumber: string,
    contactName: string,
    contactIndexInSim: number | null
): Promise<{ chat_id: number; }> {


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


    const resp = await query(sql, { "user": auth.user, instance_id });

    return { "chat_id": resp.pop().insertId };

}

export async function fetchOlderMessages(
    auth: Auth,
    chat_id: number,
    olderThanMessageId: number
): Promise<wd.Message[]> {

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

    const resp = await query(sql, { "user": auth.user, chat_id });

    return resp
        .pop()
        .map(row => parseMessage(row).message)
        .reverse()
        ;

}






export async function updateChat(
    auth: Auth,
    chat_id: number,
    contactIndexInSim: number | null | undefined,
    contactName: string | undefined,
    idOfLastMessageSeen: number | null | undefined
): Promise<void> {

    const fields: { [key: string]: f.TSql } = { "id_": chat_id };

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

    await query(sql, { "user": auth.user, chat_id });

    return;

}

export async function destroyChat(
    auth: Auth,
    chat_id: number
): Promise<undefined> {

    const sql = [
        `SELECT _ASSERT( COUNT(*), 'chat not found (destroy chat)')`,
        `FROM chat`,
        `INNER JOIN instance ON instance.id_=chat.instance`,
        `WHERE chat.id_=${esc(chat_id)} AND instance.user=${esc(auth.user)}`,
        `;`,
        `DELETE FROM chat WHERE id_= ${esc(chat_id)}`
    ].join("\n");

    await query(sql, { "user": auth.user, chat_id });

    return;

}

//TODO: Wrap assert user own chat in a template.
export async function newMessage(
    auth: Auth,
    chat_id: number,
    message: wd.NoId<
        wd.Message.Incoming |
        wd.Message.Outgoing.Pending |
        wd.Message.Outgoing.StatusReportReceived
        >
): Promise<{ message_id: number; }> {

    const m: wd.Message = { ...message, "id_": NaN } as any;

    let is_incoming: 0 | 1;
    let incoming_is_notification: 0 | 1 | null = null;
    let outgoing_status_code: 0 | 1 | 2 | null = null;
    let outgoing_is_sent_successfully: 0 | 1 | null = null;
    let outgoing_delivered_time: number | null = null;
    let outgoing_sent_by_email: string | null = null;


    if (m.direction === "INCOMING") {

        is_incoming = f.bool.enc(true);
        incoming_is_notification = f.bool.enc(m.isNotification);

    } else {

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

    const resp = await query(sql, { "user": auth.user, chat_id });

    return { "message_id": resp.pop().insertId };

}

export async function updateMessageOnSendReport(
    auth: Auth,
    message_id: number,
    isSentSuccessfully: boolean
): Promise<void> {

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

    await query(sql, { "user": auth.user, message_id });

}

export async function updateMessageOnStatusReport(
    auth: Auth,
    message_id: number,
    deliveredTime: number | null
): Promise<void> {

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

    await query(sql, { "user": auth.user, message_id });

}

