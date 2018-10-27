"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const f = require("../tools/mysqlCustom");
const crypto = require("crypto");
const deploy_1 = require("../deploy");
let esc;
let buildInsertQuery;
/** Must be called and awaited before use */
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        let api = f.createPoolAndGetApi(Object.assign({}, (yield deploy_1.deploy.getDbAuth()), { "database": "semasim_turn" }));
        exports.query = api.query;
        esc = api.esc;
        buildInsertQuery = api.buildInsertQuery;
    });
}
exports.launch = launch;
/** For test purpose only */
function flush() {
    return __awaiter(this, void 0, void 0, function* () {
        yield exports.query("DELETE FROM turnusers_lt");
    });
}
exports.flush = flush;
/**
 * @param instanceId format: `"<urn:uuid:f0c12631-a721-3da9-aa41-7122952b90ba>"`
 */
function renewAndGetCred(instanceId) {
    return __awaiter(this, void 0, void 0, function* () {
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
        yield exports.query(sql, { instanceId });
        return {
            "username": uuid,
            credential,
            "revoke": () => __awaiter(this, void 0, void 0, function* () {
                const sql = [
                    `DELETE FROM turnusers_lt`,
                    `WHERE name=${esc(uuid)} AND hmackey=${esc(hmackey)}`
                ].join("\n");
                yield exports.query(sql, { instanceId });
            })
        };
    });
}
exports.renewAndGetCred = renewAndGetCred;
