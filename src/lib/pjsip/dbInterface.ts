
import { execQueue, ExecQueue } from "ts-exec-queue";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import * as mysql from "mysql";
import { SyncEvent } from "ts-events-extended";

export const callContext= "from-sip-call";
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

const authId = "semasim-default-auth";

let isDbInit = false;

async function initDb() {

    await query(
        [
            "INSERT INTO `ps_auths`",
            "(`id`, `auth_type`, `username`, `password`) VALUES (?, ?, ?, ?)",
            "ON DUPLICATE KEY UPDATE",
            "`auth_type`= VALUES(`auth_type`), `username`= VALUES(`username`), `password`= VALUES(`password`)"
        ].join("\n"),
        [
            authId, "userpass", "admin", "admin"
        ]
    );

    isDbInit = true;

}

const dbWriteCluster = {};

export const addEndpoint = execQueue(dbWriteCluster, "DB_WRITE",
    async (imei: string, callback?: () => void) => {

        console.log("addEndpoint", imei);

        if (!isDbInit) await initDb();

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
                "`auth`= VALUES(`auth`)"
            ].join("\n"),
            [
                imei, 12, 5,
                imei, "all", "alaw,ulaw", callContext, messageContext, imei, authId, "no"
            ]
        );

        callback!();

    }
);















