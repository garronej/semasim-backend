const uuidv3 = require("uuid/v3");
import { types as feTypes } from "../../../semasim-frontend";
import { Auth } from "./sessionManager";
import * as c from "../../_constants"
import { mysqlCustom as f } from "../../../semasim-gateway";
import * as networkTools from "../../../tools/networkTools";

/** exported only for tests */
export let query: f.Api["query"];
let esc: f.Api["esc"];
let buildInsertQuery: f.Api["buildInsertQuery"];

/** Must be called and awaited before use */
export async function launch(): Promise<void> {

    let api = await f.connectAndGetApi({
        ...c.dbAuth,
        "database": "semasim_webphone",
        "localAddress": networkTools.getInterfaceAddressInRange(c.semasim_lan)
    }, "HANDLE STRING ENCODING");

    query= api.query;
    esc= api.esc;
    buildInsertQuery= api.buildInsertQuery;

}

/** For test purpose only */
export async function flush() {
    await query("DELETE FROM root");
}

export async function fetch(
    { user, email }: Auth
): Promise<feTypes.WebphoneData> {

    const uuidNs = "5e9906d0-07cc-11e8-83d5-fbdd176f7bb9";

    const sql = [
        buildInsertQuery("root", {
            "user": user,
            "ua_instance": `uuid:${uuidv3(`${user}`, uuidNs)}`
        }, "IGNORE"),
        "SELECT *",
        "from root",
        `WHERE user= ${esc(user)}`,
        ";",
        "SELECT instance.*",
        "FROM instance",
        "INNER JOIN root ON root.id_= instance.root",
        `WHERE root.user= ${esc(user)}`,
        ";",
        "SELECT chat.*",
        "FROM chat",
        "INNER JOIN instance ON instance.id_= chat.instance",
        "INNER JOIN root ON root.id_= instance.root",
        `WHERE root.user= ${esc(user)}`,
        ";",
        "SELECT message.*",
        "FROM message",
        "INNER JOIN chat ON chat.id_= message.chat",
        "INNER JOIN instance ON instance.id_= chat.instance",
        "INNER JOIN root ON root.id_= instance.root",
        `WHERE root.user= ${esc(user)}`,
        "ORDER BY message.time",
        ";",
    ].join("\n");

    let resp = await query(sql);

    let [rowRoot] = resp[1];
    let rowsInstance = resp[2];
    let rowsChat = resp[3];
    let rowsMessage = resp[4];

    let webphoneData: feTypes.WebphoneData = {
        "uaInstanceId": rowRoot["ua_instance"],
        email,
        "instances": []
    };

    let instanceById = new Map<number, feTypes.WebphoneData.Instance>();

    for (let rowInstance of rowsInstance) {

        let instance: feTypes.WebphoneData.Instance = {
            "id_": rowInstance["id_"],
            "imsi": rowInstance["imsi"],
            "chats": []
        };

        instanceById.set(instance.id_, instance);

        webphoneData.instances.push(instance);

    }

    let chatById = new Map<number, feTypes.WebphoneData.Chat>();

    for (let rowChat of rowsChat) {

        let chat: feTypes.WebphoneData.Chat = {
            "id_": rowChat["id_"],
            "contactNumber": rowChat["contact_number"],
            "contactName": rowChat["contact_name"],
            "contactIndexInSim": rowChat["contact_index_in_sim"],
            "lastSeenTime": rowChat["last_seen_time"],
            "messages": []
        };

        chatById.set(chat.id_, chat);

        instanceById.get(rowChat["instance"])!.chats.push(chat);

    }

    for (let rowMessage of rowsMessage) {

        let message: feTypes.WebphoneData.Message;

        let messageBase: feTypes.WebphoneData.Message.Base = {
            "id_": rowMessage["id_"],
            "text": rowMessage["text"],
            "time": rowMessage["time"],
            "direction": null as any,
        }


        if (rowMessage["is_incoming"]) {

            let incomingMessage: feTypes.WebphoneData.Message.Incoming = {
                ...messageBase,
                "direction": "INCOMING",
                "isNotification": (rowMessage["incoming_is_notification"] === 1) as any
            };

            message = incomingMessage;

        } else {

            let outgoingBase: feTypes.WebphoneData.Message.Outgoing.Base = {
                ...messageBase,
                "direction": "OUTGOING",
                "sentBy": ((): feTypes.WebphoneData.Message.Outgoing["sentBy"] => {

                    let email: string = rowMessage["outgoing_sent_by_email"];

                    if (email) {
                        return { "who": "OTHER", email };
                    } else {
                        return { "who": "MYSELF" };
                    }

                })(),
                "status": null as any
            };

            let outgoingMessage!: feTypes.WebphoneData.Message.Outgoing;

            switch (rowMessage["outgoing_status_code"] as (0 | 1 | 2)) {
                case 0:
                    let o0: feTypes.WebphoneData.Message.Outgoing.TransmittedToGateway = {
                        ...outgoingBase,
                        "status": "TRANSMITTED TO GATEWAY"
                    };
                    outgoingMessage = o0;
                    break;
                case 1:
                    let o1: feTypes.WebphoneData.Message.Outgoing.SendReportReceived = {
                        ...outgoingBase,
                        "status": "SEND REPORT RECEIVED",
                        "dongleSendTime": rowMessage["outgoing_dongle_send_time"]
                    };
                    outgoingMessage = o1;
                    break;
                case 2:
                    let o2: feTypes.WebphoneData.Message.Outgoing.StatusReportReceived = {
                        ...outgoingBase,
                        "status": "STATUS REPORT RECEIVED",
                        "dongleSendTime": rowMessage["outgoing_dongle_send_time"],
                        "deliveredTime": rowMessage["outgoing_delivered_time"]
                    };
                    outgoingMessage = o2;
                    break;
            }

            message = outgoingMessage;

        }

        chatById.get(rowMessage["chat"])!.messages.push(message);

    }

    return webphoneData;

}

export async function newInstance(
    user: number,
    imsi: string
): Promise<feTypes.WebphoneData.Instance> {

    const sql = [
        "SELECT @root_ref:= NULL;",
        "SELECT @root_ref:= id_",
        "FROM root",
        `WHERE user= ${esc(user)}`,
        ";",
        buildInsertQuery("instance", {
            imsi,
            "root": { "@": "root_ref" }
        }, "THROW ERROR")
    ].join("\n");

    let resp = await query(sql);

    return {
        "id_": resp.pop().insertId,
        imsi,
        "chats": []
    };

}

export async function newChat(
    user: number,
    instance_id: number,
    contactNumber: string,
    contactName: string,
    contactIndexInSim: number | null
): Promise<feTypes.WebphoneData.Chat> {

    const sql = [
        "SELECT _ASSERT( COUNT(*) , 'Instance does not exist')",
        "FROM instance",
        "INNER JOIN root ON root.id_= instance.root",
        `WHERE root.user= ${esc(user)} AND instance.id_= ${esc(instance_id)}`,
        ";",
        buildInsertQuery("chat", {
            "instance": instance_id,
            "contact_number": contactNumber,
            "contact_name": contactName,
            "contact_index_in_sim": contactIndexInSim,
            "last_seen_time": 0
        }, "THROW ERROR")
    ].join("\n");


    let resp = await query(sql);

    return {
        "id_": resp.pop().insertId,
        contactNumber,
        contactName,
        contactIndexInSim,
        "messages": [],
        "lastSeenTime": 0
    };

}

export async function updateChat(
    user: number,
    chat_id: number,
    lastSeenTime: number | undefined,
    contactName: string | undefined,
    contactIndexInSim: number | null | undefined
): Promise<undefined> {

    const fields: { [key: string]: f.TSql } = { "id_": chat_id };

    if (lastSeenTime !== undefined) {
        fields["last_seen_time"] = lastSeenTime;
    }

    if (contactName !== undefined) {
        fields["contact_name"] = contactName;
    }

    if (contactIndexInSim !== undefined) {
        fields["contact_index_in_sim"] = contactIndexInSim;
    }

    const sql = [
        "SELECT _ASSERT( COUNT(*) , 'Chat does not exist')",
        "FROM chat",
        "INNER JOIN instance ON instance.id_= chat.instance",
        "INNER JOIN root ON root.id_= instance.root",
        `WHERE root.user= ${esc(user)} AND chat.id_= ${esc(chat_id)}`,
        ";",
        buildInsertQuery("chat", fields, "UPDATE")
    ].join("\n");

    await query(sql);

    return;

}

export async function destroyChat(
    user: number,
    chat_id: number
): Promise<undefined> {

    let sql = [
        "SELECT _ASSERT( COUNT(*) , 'Chat does not exist')",
        "FROM chat",
        "INNER JOIN instance ON instance.id_= chat.instance",
        "INNER JOIN root ON root.id_= instance.root",
        `WHERE root.user= ${esc(user)} AND chat.id_= ${esc(chat_id)}`,
        ";",
        `DELETE FROM chat WHERE id_= ${esc(chat_id)}`
    ].join("\n");

    await query(sql);

    return;

}

export async function newMessage(
    user: number,
    chat_id: number,
    message: feTypes.WebphoneData.Message
): Promise<feTypes.WebphoneData.Message> {


    let is_incoming: 0 | 1;
    let incoming_is_notification: 0 | 1 | null;
    let outgoing_sent_by_email: string | null;
    let outgoing_status_code: 0 | 1 | 2 | null;
    let outgoing_dongle_send_time: number | null;
    let outgoing_delivered_time: number | null;

    if (message.direction === "INCOMING") {

        is_incoming = f.bool.enc(true);
        incoming_is_notification = f.bool.enc(message.isNotification);
        outgoing_sent_by_email = null;
        outgoing_status_code = null;
        outgoing_dongle_send_time = null;
        outgoing_delivered_time = null;

    } else {

        is_incoming = f.bool.enc(false);
        incoming_is_notification = null;

        if (message.sentBy.who === "OTHER") {
            outgoing_sent_by_email = message.sentBy.email;
        } else {
            outgoing_sent_by_email = null;
        }

        switch (message.status) {
            case "TRANSMITTED TO GATEWAY":
                outgoing_status_code = 0;
                outgoing_dongle_send_time = null;
                outgoing_delivered_time = null;
                break;
            case "SEND REPORT RECEIVED":
                outgoing_status_code = 1;
                outgoing_dongle_send_time = message.dongleSendTime;
                outgoing_delivered_time = null;
                break;
            case "STATUS REPORT RECEIVED":
                outgoing_status_code = 2;
                outgoing_dongle_send_time = message.dongleSendTime;
                outgoing_delivered_time = message.deliveredTime;
                break;
            default: throw new Error();
        }

    }

    const sql = [
        "SELECT _ASSERT( COUNT(*) , 'Chat does not exist')",
        "FROM chat",
        "INNER JOIN instance ON instance.id_= chat.instance",
        "INNER JOIN root ON root.id_= instance.root",
        `WHERE root.user= ${esc(user)} AND chat.id_= ${esc(chat_id)}`,
        ";",
        buildInsertQuery("message", {
            "chat": chat_id,
            "time": message.time,
            "text": message.text,
            is_incoming,
            incoming_is_notification,
            outgoing_sent_by_email,
            outgoing_status_code,
            outgoing_dongle_send_time,
            outgoing_delivered_time
        }, "THROW ERROR")
    ].join("\n");

    let resp = await query(sql);

    message.id_ = resp.pop().insertId;

    return message;

}


export async function updateOutgoingMessageStatusToSendReportReceived(
    user: number,
    message_id: number,
    dongleSendTime: number | null
): Promise<undefined> {

    const sql = [
        "SELECT _ASSERT( COUNT(*) , 'Outgoing message in state transmitted to GW does not exist')",
        "FROM message",
        "INNER JOIN chat ON chat.id_= message.chat",
        "INNER JOIN instance ON instance.id_= chat.instance",
        "INNER JOIN root ON root.id_= instance.root",
        "WHERE " + [
            `root.user= ${esc(user)}`,
            `message.id_= ${esc(message_id)}`,
            `NOT message.is_incoming`,
            `message.outgoing_status_code= 0`
        ].join(" AND "),
        ";",
        buildInsertQuery("message", {
            "id_": message_id,
            "outgoing_status_code": 1,
            "outgoing_dongle_send_time": dongleSendTime
        }, "UPDATE")
    ].join("\n");

    await query(sql);

    return;
}

export async function updateOutgoingMessageStatusToStatusReportReceived(
    user: number,
    message_id: number,
    deliveredTime: number | null
): Promise<undefined> {

    const sql = [
        "SELECT _ASSERT( COUNT(*) , 'Outgoing message in state send report received does not exist')",
        "FROM message",
        "INNER JOIN chat ON chat.id_= message.chat",
        "INNER JOIN instance ON instance.id_= chat.instance",
        "INNER JOIN root ON root.id_= instance.root",
        "WHERE " + [
            `root.user= ${esc(user)}`,
            `message.id_= ${esc(message_id)}`,
            `NOT message.is_incoming`,
            `message.outgoing_status_code= 1`
        ].join(" AND "),
        ";",
        buildInsertQuery("message", {
            "id_": message_id,
            "outgoing_status_code": 2,
            "outgoing_delivered_time": deliveredTime
        }, "UPDATE")
    ].join("\n");

    await query(sql);

    return;
}

