"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const f = require("../tools/mysqlCustom");
const crypto = require("crypto");
const deploy_1 = require("../deploy");
let esc;
let buildInsertQuery;
/** Must be called and awaited before use */
function launch() {
    let api = f.createPoolAndGetApi(Object.assign({}, deploy_1.deploy.dbAuth.value, { "database": "semasim_turn" }));
    exports.query = api.query;
    esc = api.esc;
    buildInsertQuery = api.buildInsertQuery;
}
exports.launch = launch;
/** For test purpose only */
async function flush() {
    await exports.query("DELETE FROM turnusers_lt");
}
exports.flush = flush;
/**
 * @param instanceId format: `"<urn:uuid:f0c12631-a721-3da9-aa41-7122952b90ba>"`
 */
async function renewAndGetCred(instanceId) {
    const uuid = instanceId.match(/"<urn:uuid:([^>]+)>"$/)[1];
    const credential = crypto
        .randomBytes(16)
        .toString("hex");
    const hmackey = crypto
        .createHash("md5")
        .update(`${uuid}:semasim:${credential}`)
        .digest("hex");
    const sql = buildInsertQuery("turnusers_lt", {
        "realm": "semasim",
        "name": uuid,
        hmackey
    }, "UPDATE");
    await exports.query(sql, { instanceId });
    return {
        "username": uuid,
        credential,
        "revoke": async () => {
            const sql = [
                `DELETE FROM turnusers_lt`,
                `WHERE name=${esc(uuid)} AND hmackey=${esc(hmackey)}`
            ].join("\n");
            await exports.query(sql, { instanceId });
        }
    };
}
exports.renewAndGetCred = renewAndGetCred;
