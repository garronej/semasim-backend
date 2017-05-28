
import { execQueue, ExecQueue } from "ts-exec-queue";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import * as mysql from "mysql";
import { SyncEvent } from "ts-events-extended";

export const callContext= "from-sip-call";
export const messageContext= "from-sip-message";
export const subscribeContext= (imei: string)=> `from-sip-subscribe-${imei}`;


import * as _debug from "debug";
let debug = _debug("_fromDongles/dbInterface");

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

        //console.log(r.sql);

    });

}

//const authId = "semasim-default-auth";

const cluster= {};

export const queryEndpoints= execQueue(cluster, "DB_ACCESS",
    async (callback?: (endpoints: string[])=> void): Promise<string[]> =>{

        let res= await query("SELECT `id` FROM `ps_endpoints`");

        let endpoints: string[]= res.map( ({ id })=> id );

        callback!(endpoints);
        return null as any;
    }
);

export const addOrUpdateEndpoint = execQueue(cluster, "DB_ACCESS",
    async (endpoint: string, callback?: () => void): Promise<void> => {

        debug(`Add or update endpoint ${endpoint} in real time configuration`);

        let ps_aors = (() => {

            let id = endpoint;
            let max_contacts = 12;
            let qualify_frequency = 15000;

            return [id, max_contacts, qualify_frequency];

        })();

        let ps_endpoints = (() => {

            let id = endpoint;
            let disallow = "all";
            let allow = "alaw,ulaw";
            let context = callContext;
            let message_context = messageContext;
            let subscribe_context= subscribeContext(endpoint);
            let aors = endpoint;
            let auth = endpoint;
            let force_rport = "no";

            return [id, disallow, allow, context, message_context, subscribe_context, aors, auth, force_rport];

        })();

        let ps_auths = (() => {

            let id = endpoint;
            let auth_type = "userpass";
            let username = endpoint;
            let password = "password";

            return [id, auth_type, username, password];

        })();

        await query(
            [
                "INSERT INTO `ps_aors`", 
                "(`id`,`max_contacts`,`qualify_frequency`)",
                "VALUES ( ?, ?, ?)",
                "ON DUPLICATE KEY UPDATE",
                "`max_contacts`= VALUES(`max_contacts`),",
                "`qualify_frequency`= VALUES(`qualify_frequency`)",
                ";",
                "INSERT INTO `ps_endpoints`",
                "(`id`,`disallow`,`allow`,`context`,`message_context`,`subscribe_context`,`aors`,`auth`,`force_rport`)",
                "VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "ON DUPLICATE KEY UPDATE",
                "`disallow`= VALUES(`disallow`),",
                "`allow`= VALUES(`allow`),",
                "`context`= VALUES(`context`),",
                "`message_context`= VALUES(`message_context`),",
                "`aors`= VALUES(`aors`),",
                "`auth`= VALUES(`auth`)",
                ";",
                "INSERT INTO `ps_auths`",
                "(`id`, `auth_type`, `username`, `password`) VALUES (?, ?, ?, ?)",
                "ON DUPLICATE KEY UPDATE",
                "`auth_type`= VALUES(`auth_type`), `username`= VALUES(`username`), `password`= VALUES(`password`)"
            ].join("\n"),
            [...ps_aors, ...ps_endpoints, ...ps_auths]
        );

        callback!();
        return null as any;

    }
);
