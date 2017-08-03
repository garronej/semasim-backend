
import { execQueue, ExecQueue } from "ts-exec-queue";
import * as mysql from "mysql";
import { SyncEvent } from "ts-events-extended";
import * as sharedSipProxy from "../sipProxy/shared";
import * as sip from "../sipProxy/sip";
import { Contact } from "./endpointsContacts";

export const callContext= "from-sip-call";
export const messageContext= "from-sip-message";
export const subscribeContext= (imei: string)=> `from-sip-subscribe-${imei}`;

import * as _debug from "debug";
let debug = _debug("_admin/dbInterface");

const dbParams = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "abcde12345"
};

const connection = mysql.createConnection({
    ...dbParams,
    "database": "asterisk",
    "multipleStatements": true
});


function query(sql: string, values?: any[]): Promise<any> {

    return new Promise<any>((resolve, reject) => {

        let r = connection.query(
            sql,
            values || [],
            (err, results) => err ? reject(err) : resolve(results)
        );

    });

}


const cluster= {};

const group= "DB_ACCESS";

export const queryEndpoints= execQueue(cluster, group,
    async (callback?): Promise<{ endpoint: string; lastUpdated: Date}[]> =>{

        let res= await query("SELECT `id`,`set_var` FROM `ps_endpoints`");

        let endpoints= res.map(({ id, set_var })=>
            ({ "endpoint": id, "lastUpdated": new Date(parseInt(set_var.split("=")[1])) })
        );

        callback(endpoints);
        return endpoints;
    }
);

export const truncateContacts= execQueue(cluster, group,
    async (callback?): Promise<void> => {

        await query("TRUNCATE ps_contacts");

        callback();

    }
);

export const queryContacts= execQueue(cluster , group,
    async (callback?): Promise<Contact[]> => {

        let contacts: Contact[] = await query(
            "SELECT `id`,`uri`,`path`,`endpoint`,`user_agent` FROM `ps_contacts`"
        );

        for( let contact of contacts ){
            contact.uri= contact.uri.replace(/\^3B/g, ";");
            contact.path= contact.path.replace(/\^3B/g, ";");
        }

        callback(contacts);
        return contacts;

    }
);

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


function generateQueryInsert(
    table: string,
    values: Record<string, string | number | null>
): [string, (string | number | null)[]] {

    let keys = Object.keys(values);

    let backtickKeys = keys.map(key => "`" + key + "`");

    let queryLines = [
        `INSERT INTO ${table} ( ${backtickKeys.join(", ")} )`,
        `VALUES ( ${keys.map(() => "?").join(", ")} )`,
        "ON DUPLICATE KEY UPDATE",
        backtickKeys.map(backtickKey => `${backtickKey} = VALUES(${backtickKey})`).join(", "),
        ";"
    ];

    return [
        queryLines.join("\n"),
        keys.map(key => values[key])
    ];

}


export const addOrUpdateEndpoint = execQueue(cluster, group,
    async (endpoint: string, isDongleConnected: boolean, callback?): Promise<void> => {

        debug(`Add or update endpoint ${endpoint} in real time configuration`);

        let queryLine = "";

        let values: (string | number | null)[] = [];

        (() => {

            let [_query, _values] = generateQueryInsert("ps_aors", {
                "id": endpoint,
                "max_contacts": 12,
                "qualify_frequency": 15000, //0
                "support_path": "yes"
            });

            queryLine += "\n" + _query;

            values = [...values, ..._values];

        })();

        (() => {

            let [_query, _values] = generateQueryInsert("ps_endpoints", {
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
                "callerid_tag": null
            });

            if (isDongleConnected) {

                _query += [
                    "UPDATE `ps_endpoints` SET `set_var` = ? WHERE `id` = ?",
                    ";"
                ].join("\n");

                _values = [..._values, `LAST_UPDATED=${Date.now()}`, endpoint];

            }

            queryLine += "\n" + _query;

            values = [...values, ..._values];

        })();

        (() => {

            let [_query, _values] = generateQueryInsert("ps_auths", {
                "id": endpoint,
                "auth_type": "userpass",
                "username": endpoint,
                "password": "password",
                "realm": "semasim"
            });


            queryLine += "\n" + _query;

            values = [...values, ..._values];

        })();

        await query(queryLine, values);

        callback();

    }
);
