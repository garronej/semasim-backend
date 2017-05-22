
import { execQueue, ExecQueue } from "ts-exec-queue";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import * as mysql from "mysql";
import { SyncEvent } from "ts-events-extended";

export const callContext= (endpoint: string)=> `from-sip-call-${endpoint}`;
export const messageContext= "from-sip-message";

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

export const addOrUpdateEndpoint = execQueue({}, "DB_WRITE",
    async (endpoint: string, callback?: () => void) => {

        console.log("addOrUpdate", endpoint);

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
            let context = callContext(endpoint);
            let message_context = messageContext;
            let aors = endpoint;
            let auth = endpoint;
            let force_rport = "no";

            return [id, disallow, allow, context, message_context, aors, auth, force_rport];

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
                "(`id`,`max_contacts`,`qualify_frequency`) VALUES (?, ?, ?)",
                "ON DUPLICATE KEY UPDATE",
                "`max_contacts`= VALUES(`max_contacts`),",
                "`qualify_frequency`= VALUES(`qualify_frequency`)",
                ";",
                "INSERT INTO `ps_endpoints`",
                "(`id`,`disallow`,`allow`,`context`,`message_context`, `aors`, `auth`, `force_rport`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
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

    }
);















