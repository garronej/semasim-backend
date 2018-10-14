import * as i from "../bin/installer";
import * as f from "../tools/mysqlCustom";
import * as crypto from "crypto";

/** exported only for tests */
export let query: f.Api["query"];
//let esc: f.Api["esc"];
let buildInsertQuery: f.Api["buildInsertQuery"];


/** Must be called and awaited before use */
export function launch(localAddress?: string): void {

    let api = f.createPoolAndGetApi({
        ...i.dbAuth,
        "database": "semasim_turn",
        localAddress
    });

    query = api.query;
    //esc = api.esc;
    buildInsertQuery = api.buildInsertQuery;

}

/** For test purpose only */
export async function flush() {
    await query("DELETE FROM turnusers_lt");
}

/**
 * @param instanceId format: `"<urn:uuid:f0c12631-a721-3da9-aa41-7122952b90ba>"`
 */
export async function renewAndGetCred(instanceId: string): Promise<{ username: string; credential: string; }> {

    //TODO: only handle full version with quotes.
    const uuid = instanceId.match(/"<urn:uuid:([^>]+)>"$/)![1];

    const credential = crypto.createHash("md5")
        .update(`${Math.random()}`)
        .digest("hex");

    const sql = buildInsertQuery("turnusers_lt", {
        "realm": "semasim",
        "name": uuid,
        "hmackey": crypto
            .createHash("md5")
            .update(`${uuid}:semasim:${credential}`)
            .digest("hex")
    }, "UPDATE");

    await query(sql, { instanceId });

    return { "username": uuid, credential };

}

