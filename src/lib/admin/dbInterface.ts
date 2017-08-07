
import { execQueue, ExecQueue } from "ts-exec-queue";
import * as mysql from "mysql";
import { SyncEvent } from "ts-events-extended";
import * as sip from "../sipProxy/sip";
import { Contact } from "./endpointsContacts";

export const callContext = "from-sip-call";
export const messageContext = "from-sip-message";
export const subscribeContext = (imei: string) => `from-sip-subscribe-${imei}`;

import * as _debug from "debug";
let debug = _debug("_admin/dbInterface");

const dbParams = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "abcde12345"
};

const cluster = {};

function queryOnConnection(
    connection: mysql.IConnection,
    sql: string,
    values?: (string | number | null)[]
): Promise<any> {

    return new Promise<any>((resolve, reject) => {

        let r = connection.query(
            sql,
            values || [],
            (err, results) => err ? reject(err) : resolve(results)
        );

    });

}

function buildInsertQuery(
    table: string,
    values: Record<string, string | number | null>
): [string, (string | number | null)[]] {

    let keys = Object.keys(values);

    let backtickKeys = keys.map(key => "`" + key + "`");

    let sqlLinesArray = [
        `INSERT INTO ${table} ( ${backtickKeys.join(", ")} )`,
        `VALUES ( ${keys.map(() => "?").join(", ")} )`,
        "ON DUPLICATE KEY UPDATE",
        backtickKeys.map(backtickKey => `${backtickKey} = VALUES(${backtickKey})`).join(", "),
        ";"
    ];

    return [
        sqlLinesArray.join("\n"),
        keys.map(key => values[key])
    ];

}

export namespace dbAsterisk {

    const group = "ASTERISK";

    let connection: mysql.IConnection | undefined = undefined;

    function query(
        sql: string,
        values?: (string | number | null)[]
    ): Promise<any> {

        if (!connection) {

            connection = mysql.createConnection({
                ...dbParams,
                "database": "asterisk",
                "multipleStatements": true
            });

        }

        return queryOnConnection(connection, sql, values);

    }

    export const queryEndpoints = execQueue(cluster, group,
        async (callback?): Promise<string[]> => {

            let endpoints = (await query("SELECT `id`,`set_var` FROM `ps_endpoints`")).map(({id})=> id);

            callback(endpoints);
            return null as any;
        }
    );

    export const truncateContacts = execQueue(cluster, group,
        async (callback?): Promise<void> => {

            await query("TRUNCATE ps_contacts");

            callback();

        }
    );

    export const queryContacts = execQueue(cluster, group,
        async (callback?): Promise<Contact[]> => {

            let contacts: Contact[] = await query(
                "SELECT `id`,`uri`,`path`,`endpoint`,`user_agent` FROM ps_contacts"
            );

            for (let contact of contacts) {
                contact.uri = contact.uri.replace(/\^3B/g, ";");
                contact.path = contact.path.replace(/\^3B/g, ";");
            }

            callback(contacts);
            return contacts;

        }
    );

    //TODO: to test
    export const queryLastConnectionTimestampOfDonglesEndpoint = execQueue(cluster, group,
        async (endpoint: string, callback?): Promise<number> => {

            let timestamp: number;

            try {

                let [{ set_var }] = await query(
                    "SELECT `set_var` FROM ps_endpoints WHERE `id`=?", [endpoint]
                );

                timestamp= parseInt(set_var.split("=")[1]);

            } catch (error) {

                timestamp= 0;

            }

            callback(timestamp);
            return null as any;

        }
    )

    export const deleteContact = execQueue(cluster, group,
        async (id: string, callback?): Promise<boolean> => {

            let { affectedRows } = await query(
                "DELETE FROM `ps_contacts` WHERE `id`=?", [id]
            );

            let isDeleted = affectedRows ? true : false;

            callback(isDeleted);
            return isDeleted;

        }
    );




    //TODO: isDongle connected is a stupid option
    export const addOrUpdateEndpoint = execQueue(cluster, group,
        async (endpoint: string, password: string, callback?): Promise<void> => {

            debug(`Add or update endpoint ${endpoint} in real time configuration`);

            let sql = "";
            let values: (string | number | null)[] = [];

            (() => {

                let [_sql, _values] = buildInsertQuery("ps_aors", {
                    "id": endpoint,
                    "max_contacts": 12,
                    "qualify_frequency": 0, //15000
                    "support_path": "yes"
                });

                sql += "\n" + _sql;

                values = [...values, ..._values];

            })();

            (() => {

                let [_sql, _values] = buildInsertQuery("ps_endpoints", {
                    "id": endpoint,
                    "disallow": "all",
                    "allow": "alaw,ulaw",
                    "context": callContext,
                    "message_context": messageContext,
                    "subscribe_context": subscribeContext(endpoint),
                    "aors": endpoint,
                    "auth": endpoint,
                    "force_rport": null,
                    "from_domain": "semasim.com",
                    "ice_support": "yes",
                    "direct_media": null,
                    "asymmetric_rtp_codec": null,
                    "rtcp_mux": null,
                    "direct_media_method": null,
                    "connected_line_method": null,
                    "transport": "transport-tcp",
                    "callerid_tag": null,
                    "set_var": `LAST_CONNECTION_TIMESTAMP=${Date.now()}`
                });

                sql += "\n" + _sql;

                values = [...values, ..._values];

            })();

            (() => {

                let [_sql, _values] = buildInsertQuery("ps_auths", {
                    "id": endpoint,
                    "auth_type": "userpass",
                    "username": endpoint,
                    "password": password,
                    "realm": "semasim"
                });


                sql += "\n" + _sql;

                values = [...values, ..._values];

            })();

            await query(sql, values);

            callback();

        }
    );


}

export namespace dbSemasim {

    const group = "SEMASIM";

    let connection: mysql.IConnection | undefined = undefined;

    function query(
        sql: string,
        values?: (string | number | null)[]
    ): Promise<any> {

        if (!connection) {

            connection = mysql.createConnection({
                ...dbParams,
                "database": "semasim",
                "multipleStatements": true
            });

        }

        return queryOnConnection(connection, sql, values);

    }

    export const addDongleIfNew = execQueue(cluster, group,
        async (imei: string, callback?): Promise<void> => {

            debug("enter add dongle if new");

            let [sql, values] = buildInsertQuery("dongles", { imei });

            await query(sql, values);

            callback();

        }
    );


    export const addContactIfNew = execQueue(cluster, group,
        async (contact: Contact, callback?): Promise<void> => {

            debug("enter add contact if new");

            let instanceid = Contact.readInstanceId(contact);

            let dongles_imei = contact.endpoint;

            let [sql, values] = buildInsertQuery("contacts", { instanceid, dongles_imei });

            await query(sql, values);

            callback();

        }
    );


    export interface Notification {
        endpoint: string;
        date: number;
        payload: string
    }


    async function addNotificationAndGetId(
        notification: Notification
    ): Promise<string> {

        debug("addNotificationAndGetId", { notification });

        let dongles_imei = notification.endpoint;
        let date = notification.date;
        let payload = notification.payload;

        let [sql, values] = buildInsertQuery("notifications", { dongles_imei, date, payload });

        debug("1");

        await query(sql, values);

        debug("2");

        let [{ id }] = await query(
            "SELECT `id` FROM `notifications` WHERE `dongles_imei`=? AND `date`=?",
            [dongles_imei, date]
        );

        debug("3");

        return id;

    }

    export function addNotificationAsUndelivered(notification: Notification): Promise<void>;
    export function addNotificationAsUndelivered(notification: Notification, contact: Contact): Promise<void>;
    export function addNotificationAsUndelivered(...inputs: any[]): Promise<void> {
        return _addNotificationAsUndelivered_(inputs[0], inputs[1]);
    }


    const _addNotificationAsUndelivered_ = execQueue(cluster, group,
        async (notification: Notification, contact: Contact | undefined, callback?): Promise<void> => {

            let notifications_id = await addNotificationAndGetId(notification);

            let contacts: { id: number, instanceid: string }[];

            if (contact) {

                contacts = await query(
                    "SELECT `id`, `instanceid` FROM contacts WHERE `dongles_imei`=? AND `instanceid`= ?",
                    [notification.endpoint, Contact.readInstanceId(contact)]
                );

            } else {

                contacts = await query(
                    "SELECT `id`, `instanceid` FROM contacts WHERE `dongles_imei`=?",
                    [notification.endpoint]
                );

            }

            let sql = "";
            let values: (string | number | null)[] = [];

            for (let { id } of contacts) {

                let [_sql, _values] = buildInsertQuery("contacts_notifications", {
                    "contacts_id": id, notifications_id, "delivered": 0
                });

                sql += "\n" + _sql;
                values = [...values, ..._values];

            }

            await query(sql, values);

            callback();

        }
    );


    export const getUndeliveredNotificationsOfContact = execQueue(cluster, group,
        async (contact: Contact, callback?): Promise<Notification[]> => {

            debug("enter get undelivered");

            let instanceid = Contact.readInstanceId(contact);

            let notifications = await query(
                [
                    "SELECT notifications.`dongles_imei` AS `endpoints`, notifications.`date`, notifications.`payload`",
                    "FROM notifications",
                    "INNER JOIN contacts_notifications ON contacts_notifications.`notifications_id` = notifications.`id`",
                    "INNER JOIN contacts ON contacts.`id` = contacts_notifications.`contacts_id`",
                    "WHERE notifications.`dongles_imei` = ? AND contacts_notifications.`delivered`=0 AND contacts.`instanceid`=?",
                    "ORDER BY notifications.`date`"
                ].join("\n"),
                [contact.endpoint, Contact.readInstanceId(contact)]
            );

            callback(notifications);
            return null as any;

        }
    );




}