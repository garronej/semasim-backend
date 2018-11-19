import * as f from "../tools/mysqlCustom";
import * as crypto from "crypto";
import { deploy } from "../deploy";

/** exported only for tests */
export let query: f.Api["query"];
let esc: f.Api["esc"];
let buildInsertQuery: f.Api["buildInsertQuery"];


/** Must be called and awaited before use */
export function launch() {

    let api = f.createPoolAndGetApi({
        ...deploy.dbAuth.value!,
        "database": "semasim_turn"
    });

    query = api.query;
    esc = api.esc;
    buildInsertQuery = api.buildInsertQuery;

}

/** For test purpose only */
export async function flush() {
    await query("DELETE FROM turnusers_lt");
}

/**
 * @param instanceId format: `"<urn:uuid:f0c12631-a721-3da9-aa41-7122952b90ba>"`
 */
export async function renewAndGetCred(instanceId: string): Promise<{
    username: string;
    credential: string;
    revoke: () => Promise<void>
}> {

    const uuid = instanceId.match(/"<urn:uuid:([^>]+)>"$/)![1];

    const credential = crypto
        .randomBytes(16)
        .toString("hex")
        ;

    const hmackey = crypto
        .createHash("md5")
        .update(`${uuid}:semasim:${credential}`)
        .digest("hex")
        ;

    const sql = buildInsertQuery("turnusers_lt", {
        "realm": "semasim",
        "name": uuid,
        hmackey
    }, "UPDATE");

    await query(sql, { instanceId });

    return {
        "username": uuid,
        credential,
        "revoke": async () => {

            const sql = [
                `DELETE FROM turnusers_lt`,
                `WHERE name=${esc(uuid)} AND hmackey=${esc(hmackey)}`
            ].join("\n");

            await query(sql, { instanceId });

        }
    };

}

