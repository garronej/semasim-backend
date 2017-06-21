
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

        let res= await query("SELECT `username`,`realm` FROM `ps_auths`");

        let endpoints= res.map( ({ username, realm})=> 
            ({ "endpoint": username, "lastUpdated": parseInt(realm) })
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

        debug("entering queryContact");

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

    debug("entering getContactOfFlow", flowToken);

    let contacts = await queryContacts();

    for (let contactUri of contacts) 
        if (sip.parseUriWithEndpoint(contactUri).params[sharedSipProxy.flowTokenKey] === flowToken) 
            return contactUri;


    return undefined;

}


const deleteContact = execQueue(cluster, group,
    async (uri: string, callback?): Promise<boolean> => {

        debug("entering deleteContact", uri);

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

    debug("entering deleteContactOfFlow", flowToken);

    let isDeleted: boolean;

    let uri = await getContactOfFlow(flowToken);

    if (!uri) {

        isDeleted = true;

        return isDeleted;

    }

    isDeleted = await deleteContact(uri);

    return isDeleted;

}


export const addOrUpdateEndpoint = execQueue(cluster, group,
    async (endpoint: string, isDongleConnected: boolean, callback?): Promise<void> => {

        debug(`Add or update endpoint ${endpoint} in real time configuration`);

        let queryLines: string[] = [];

        let ps_aors = (() => {

            let id = endpoint;
            let max_contacts = 12;
            let qualify_frequency = 15000;
            let support_path = "no";

            queryLines = [
                ...queryLines,
                "INSERT INTO `ps_aors`",
                "(`id`,`max_contacts`,`qualify_frequency`, `support_path`)",
                "VALUES ( ?, ?, ?, ?)",
                "ON DUPLICATE KEY UPDATE",
                "`max_contacts`= VALUES(`max_contacts`),",
                "`qualify_frequency`= VALUES(`qualify_frequency`),",
                "`support_path`= VALUES(`support_path`)",
                ";"
            ];

            return [id, max_contacts, qualify_frequency, support_path];

        })();

        let ps_endpoints = (() => {

            let id = endpoint;
            let disallow = "all";
            let allow = "alaw,ulaw";
            let context = callContext;
            let message_context = messageContext;
            let subscribe_context = subscribeContext(endpoint);
            let aors = endpoint;
            let auth = endpoint;
            let force_rport = "yes";

            queryLines = [
                ...queryLines,
                "INSERT INTO `ps_endpoints`",
                "(`id`,`disallow`,`allow`,`context`,`message_context`,`subscribe_context`,`aors`,`auth`,`force_rport`)",
                "VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "ON DUPLICATE KEY UPDATE",
                "`disallow`= VALUES(`disallow`),",
                "`allow`= VALUES(`allow`),",
                "`context`= VALUES(`context`),",
                "`message_context`= VALUES(`message_context`),",
                "`subscribe_context`= VALUES(`subscribe_context`),",
                "`aors`= VALUES(`aors`),",
                "`auth`= VALUES(`auth`),",
                "`force_rport`= VALUES(`force_rport`)",
                ";",
            ];

            return [id, disallow, allow, context, message_context, subscribe_context, aors, auth, force_rport];

        })();

        let ps_auths = (() => {

            let id = endpoint;
            let auth_type = "userpass";
            let username = endpoint;
            let password = "password";

            queryLines = [
                ...queryLines,
                "INSERT INTO `ps_auths`",
                "(`id`, `auth_type`, `username`, `password`) VALUES (?, ?, ?, ?)",
                "ON DUPLICATE KEY UPDATE",
                "`auth_type`= VALUES(`auth_type`),",
                "`username`= VALUES(`username`),",
                "`password`= VALUES(`password`)",
                ";"
            ];

            let values = [id, auth_type, username, password];

            if (isDongleConnected) {

                let realm = `${Date.now()}`;

                queryLines = [
                    ...queryLines,
                    "UPDATE `ps_auths` SET `realm` = ? WHERE `id` = ?",
                    ";"
                ];

                values = [...values, realm, id];

            }

            return values;

        })();

        await query(queryLines.join("\n"), [...ps_aors, ...ps_endpoints, ...ps_auths]);

        callback();

    }
);
