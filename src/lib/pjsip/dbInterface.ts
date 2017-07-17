
import { execQueue, ExecQueue } from "ts-exec-queue";
import * as mysql from "mysql";
import { SyncEvent } from "ts-events-extended";
import * as sharedSipProxy from "../sipProxy/shared";
import * as sip from "../sipProxy/sip";

export const callContext= "from-sip-call";
export const messageContext= "from-sip-message";
export const subscribeContext= (imei: string)=> `from-sip-subscribe-${imei}`;

import * as _debug from "debug";
let debug = _debug("_pjsip/dbInterface");

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
    async (callback?): Promise<{ endpoint: string; lastUpdated: number}[]> =>{

        //let res= await query("SELECT `username`,`realm` FROM `ps_auths`");

        let res= await query("SELECT `id`,`set_var` FROM `ps_endpoints`");

        /*
        let endpoints= res.map( ({ username, realm})=> 
            ({ "endpoint": username, "lastUpdated": parseInt(realm) })
        );
        */

        let endpoints= res.map(({ id, set_var })=>
        ( {"endpoint": id, "lastUpdated": parseInt(set_var.split("=")[1]) } )
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

const queryContacts= execQueue(cluster , group,
    async (callback?): Promise<string[]> => {

        let res: any[] = await query("SELECT `uri`,`endpoint` FROM `ps_contacts`");

        let contacts = res.map(
            ({ uri, endpoint }) => `${endpoint}/${uri.replace(/\^3B/g, ";")}`
        );

        callback(contacts);
        return contacts;

    }
);

export async function queryContactsOfEndpoints(endpoint: string): Promise<string[]> {



    let contacts = await queryContacts();

    return contacts.filter( uri => sip.parseUriWithEndpoint(uri).endpoint === endpoint);

}

export async function getContactOfFlow(flowToken: string): Promise<string | undefined> {

    let contacts = await queryContacts();

    for (let contactUri of contacts) 
        if (sip.parseUriWithEndpoint(contactUri).params[sharedSipProxy.flowTokenKey] === flowToken) 
            return contactUri;


    return undefined;

}


const deleteContact = execQueue(cluster, group,
    async (uri: string, callback?): Promise<boolean> => {

        let match = uri.match(/^([^\/]+)\/(.*)$/)!;

        let { affectedRows } = await query(
            "DELETE FROM `ps_contacts` WHERE `endpoint`=? AND `uri`=?",
            [match[1], match[2].replace(/;/g, "^3B")]
        );

        let isDeleted = affectedRows ? true : false;

        callback!(isDeleted);
        return isDeleted;

    }
);


export async function deleteContactOfFlow(flowToken: string): Promise<boolean> {

    let isDeleted: boolean;

    let uri = await getContactOfFlow(flowToken);

    if (!uri) {

        isDeleted = true;

        return isDeleted;

    }

    isDeleted = await deleteContact(uri);

    return isDeleted;

}

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
                "connected_line_method": null
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
