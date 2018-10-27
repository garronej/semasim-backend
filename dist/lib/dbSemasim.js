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
const crypto = require("crypto");
const geoiplookup_1 = require("../tools/geoiplookup");
const f = require("../tools/mysqlCustom");
const chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
const logger = require("logger");
const deploy_1 = require("../deploy");
const debug = logger.debugFactory();
let buildInsertQuery;
/** Must be called and before use */
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        const api = f.createPoolAndGetApi(Object.assign({}, (yield deploy_1.deploy.getDbAuth()), { "database": "semasim" }), "HANDLE STRING ENCODING");
        exports.query = api.query;
        exports.esc = api.esc;
        buildInsertQuery = api.buildInsertQuery;
    });
}
exports.launch = launch;
/** For test purpose only */
function flush() {
    return __awaiter(this, void 0, void 0, function* () {
        yield exports.query([
            "DELETE FROM user;",
            "DELETE FROM dongle;",
            "DELETE FROM gateway_location;"
        ].join("\n"));
    });
}
exports.flush = flush;
/**
 * Return user.id_ or undefined
 *
 * User not yet registered are created by the shareSim function
 * those user have no salt and no password.
 *
 * */
function createUserAccount(email, password, ip) {
    return __awaiter(this, void 0, void 0, function* () {
        const salt = crypto.randomBytes(8).toString("hex");
        const digest = crypto.createHash("rmd160").update(`${password}${salt}`).digest("hex");
        //Four digits
        let activationCode = (new Array(4))
            .fill(0)
            .map(() => Math.random().toFixed(1)[2])
            .join("");
        email = email.toLowerCase();
        const sql = [
            `SELECT @update_record:=NULL;`,
            "INSERT INTO user",
            "   ( email, salt, digest, activation_code, creation_date, ip )",
            "VALUES",
            `   ( ${exports.esc(email)}, ${exports.esc(salt)}, ${exports.esc(digest)}, ${exports.esc(activationCode)}, ${exports.esc(Date.now())}, ${exports.esc(ip)})`,
            "ON DUPLICATE KEY UPDATE",
            "   salt= IF(@update_record:= salt = '', VALUES(salt), salt),",
            "   digest= IF(@update_record, VALUES(digest), digest),",
            "   activation_code= IF(@update_record, NULL, activation_code),",
            "   creation_date= IF(@update_record, VALUES(creation_date), creation_date),",
            "   ip= IF(@update_record, VALUES(ip), ip)",
            ";",
            `SELECT @update_record AS update_record`
        ].join("\n");
        //console.log(sql);
        const res = yield exports.query(sql, { email });
        //console.log(res);
        const { insertId } = res[1];
        if (insertId === 0) {
            return undefined;
        }
        else {
            const user = insertId;
            if (res.slice(-1)[0][0]["update_record"] !== null) {
                activationCode = null;
            }
            return { user, activationCode };
        }
    });
}
exports.createUserAccount = createUserAccount;
/**
 * Return true if the account was validated
 * False may occur if the user try to validate again
 * an email that have been validated already.
 */
function validateUserEmail(email, activationCode) {
    return __awaiter(this, void 0, void 0, function* () {
        email = email.toLowerCase();
        const sql = [
            `UPDATE user `,
            `SET activation_code=NULL`,
            `WHERE activation_code=${exports.esc(activationCode)}`
        ].join("\n");
        const { affectedRows } = yield exports.query(sql, { email });
        return affectedRows === 1;
    });
}
exports.validateUserEmail = validateUserEmail;
/** Return user.id_ or undefined if auth failed */
function authenticateUser(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        email = email.toLowerCase();
        const sql = [
            `SELECT`,
            `   id_,`,
            `   salt,`,
            `   digest,`,
            `   last_attempt_date,`,
            `   forbidden_retry_delay,`,
            `   activation_code`,
            `FROM user WHERE email= ${exports.esc(email)}`
        ].join("\n");
        const rows = yield exports.query(sql, { email });
        if (!rows.length || rows[0]["salt"] === "") {
            return { "status": "NO SUCH ACCOUNT" };
        }
        const [row] = rows;
        if (row["activation_code"] !== null) {
            return { "status": "NOT VALIDATED YET" };
        }
        let retryDelay = undefined;
        if (row["forbidden_retry_delay"] !== null) {
            retryDelay = row["forbidden_retry_delay"];
            const retryDelayLeft = row["last_attempt_date"] + retryDelay - Date.now();
            if (retryDelayLeft > 0) {
                return {
                    "status": "RETRY STILL FORBIDDEN",
                    retryDelayLeft
                };
            }
        }
        const user = row["id_"];
        if (crypto.createHash("rmd160").update(`${password}${row["salt"]}`).digest("hex") === row["digest"]) {
            if (retryDelay !== undefined) {
                const sql = buildInsertQuery("user", {
                    "id_": user,
                    "forbidden_retry_delay": null,
                    "last_attempt_date": null
                }, "UPDATE");
                yield exports.query(sql, { email });
            }
            return { "status": "SUCCESS", user };
        }
        else {
            const newRetryDelay = Math.min(retryDelay !== undefined ? retryDelay * 2 : 1000, 60000);
            const sql = buildInsertQuery("user", {
                "id_": user,
                "forbidden_retry_delay": newRetryDelay,
                "last_attempt_date": Date.now()
            }, "UPDATE");
            yield exports.query(sql, { email });
            return {
                "status": "WRONG PASSWORD",
                "retryDelay": newRetryDelay
            };
        }
    });
}
exports.authenticateUser = authenticateUser;
/**Work for account that have been automatically created due to sharing request. */
function setPasswordRenewalToken(email) {
    return __awaiter(this, void 0, void 0, function* () {
        email = email.toLowerCase();
        const token = crypto.randomBytes(16).toString("hex");
        const sql = [
            `UPDATE user`,
            `SET password_renewal_token=${exports.esc(token)}`,
            `WHERE email=${exports.esc(email)}`
        ].join("\n");
        const { affectedRows } = yield exports.query(sql, { email });
        return (affectedRows === 1) ? token : undefined;
    });
}
exports.setPasswordRenewalToken = setPasswordRenewalToken;
/** return true if token was still valid for email */
function renewPassword(email, token, newPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        const salt = crypto.randomBytes(8).toString("hex");
        const digest = crypto.createHash("rmd160").update(`${newPassword}${salt}`).digest("hex");
        const sql = [
            `UPDATE user`,
            `SET`,
            `salt=${exports.esc(salt)},`,
            `digest=${exports.esc(digest)},`,
            `last_attempt_date= NULL,`,
            `forbidden_retry_delay= NULL,`,
            `password_renewal_token= NULL`,
            `WHERE password_renewal_token=${exports.esc(token)} AND email=${exports.esc(email)}`
        ].join("\n");
        const { affectedRows } = yield exports.query(sql, { email });
        return affectedRows === 1;
    });
}
exports.renewPassword = renewPassword;
//TODO: Implement and when it's done enforce providing email for lock.
function deleteUser(auth) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = `DELETE FROM user WHERE id_ = ${exports.esc(auth.user)}`;
        const { affectedRows } = yield exports.query(sql, { "email": auth.email });
        const isDeleted = affectedRows !== 0;
        return isDeleted;
    });
}
exports.deleteUser = deleteUser;
/** Only request that is make with two SQL queries */
function addGatewayLocation(ip) {
    return __awaiter(this, void 0, void 0, function* () {
        const { insertId } = yield exports.query(buildInsertQuery("gateway_location", { ip }, "IGNORE"), { ip });
        if (!insertId) {
            return;
        }
        try {
            const { countryIso, subdivisions, city } = yield geoiplookup_1.geoiplookup(ip);
            const sql = buildInsertQuery("gateway_location", {
                ip,
                "country_iso": countryIso || null,
                "subdivisions": subdivisions || null,
                "city": city || null
            }, "UPDATE");
            yield exports.query(sql, { ip });
        }
        catch (error) {
            debug(`Lookup id failed ${ip}`, error.message);
            return;
        }
    });
}
exports.addGatewayLocation = addGatewayLocation;
/**
 *  returns locked dongles with unreadable SIM iccid,
 *  locked dongles with readable iccid registered by user
 *  active dongles not registered
 */
function filterDongleWithRegistrableSim(auth, dongles) {
    return __awaiter(this, void 0, void 0, function* () {
        let registrableDongles = [];
        const dongleWithReadableIccid = [];
        for (let dongle of dongles) {
            if (!dongle.sim.iccid) {
                registrableDongles.push(dongle);
            }
            else {
                dongleWithReadableIccid.push(dongle);
            }
        }
        if (!dongleWithReadableIccid.length) {
            return registrableDongles;
        }
        let rows = yield exports.query([
            "SELECT iccid, user",
            "FROM sim",
            "WHERE",
            dongleWithReadableIccid.map(({ sim }) => `iccid= ${exports.esc(sim.iccid)}`).join(" OR ")
        ].join("\n"), { "email": auth.email });
        let userByIccid = {};
        for (let { iccid, user } of rows) {
            userByIccid[iccid] = user;
        }
        registrableDongles = [
            ...registrableDongles,
            ...dongleWithReadableIccid.filter(dongle => {
                let registeredBy = userByIccid[dongle.sim.iccid];
                if (!registeredBy) {
                    return true;
                }
                else {
                    return (registeredBy === auth.user) && chan_dongle_extended_client_1.types.Dongle.Locked.match(dongle);
                }
            })
        ];
        return registrableDongles;
    });
}
exports.filterDongleWithRegistrableSim = filterDongleWithRegistrableSim;
function updateSimStorage(imsi, storage) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = [
            "SELECT @sim_ref:=NULL;",
            `SELECT @sim_ref:=id_ FROM sim WHERE imsi=${exports.esc(imsi)};`,
            "SELECT _ASSERT(@sim_ref IS NOT NULL, 'SIM should be registered');",
            buildInsertQuery("sim", {
                "id_": { "@": "sim_ref" },
                "number_as_stored": storage.number || null,
                "storage_left": storage.infos.storageLeft,
                "storage_digest": storage.digest
            }, "UPDATE")
        ].join("\n");
        for (const { index, name, number } of storage.contacts) {
            sql += [
                `SELECT @new_name:=${exports.esc(name)};`,
                [
                    `SELECT @new_name:=name FROM contact WHERE`,
                    `sim=@sim_ref AND mem_index IS NOT NULL AND mem_index=${exports.esc(index)} AND name_as_stored=${exports.esc(name)} AND number_raw=${exports.esc(number)};`,
                ].join(" "),
                buildInsertQuery("contact", {
                    "sim": { "@": "sim_ref" },
                    "mem_index": index,
                    "name_as_stored": name,
                    "number_raw": number,
                    "name": { "@": "new_name" }
                }, "UPDATE")
            ].join("\n");
        }
        let where_clause = storage.contacts.map(({ index }) => `mem_index <> ${exports.esc(index)}`).join(" AND ");
        where_clause = !!where_clause ? `AND ${where_clause}` : "";
        sql += `DELETE FROM contact WHERE sim=@sim_ref AND mem_index IS NOT NULL ${where_clause}`;
        yield exports.query(sql, { imsi });
    });
}
exports.updateSimStorage = updateSimStorage;
//TODO: Test!
function getUserUa(email) {
    return __awaiter(this, void 0, void 0, function* () {
        email = email.toLowerCase();
        const sql = [
            "SELECT ua.*",
            "FROM ua",
            "INNER JOIN user ON user.id_= ua.user",
            `WHERE user.email=${exports.esc(email)}`,
        ].join("\n");
        const uas = [];
        const rows = yield exports.query(sql);
        for (const row of rows) {
            uas.push({
                "instance": row["instance"],
                "userEmail": email,
                "platform": row["platform"],
                "pushToken": row["push_token"],
                "software": row["software"]
            });
        }
        return uas;
    });
}
exports.getUserUa = getUserUa;
/**
 * Asserts:
 * 1) The sql query will will not be updated after.
 * 2) @sim_ref is set to the sim id_ if NULL parse returns empty array.
 *
 * Note before making any changes check setSimOffline function that
 * use this in a totally implementation dependent fashion. ( ugly I know )
 *
 */
var retrieveUasRegisteredToSim;
(function (retrieveUasRegisteredToSim) {
    retrieveUasRegisteredToSim.sql = [
        "",
        "SELECT",
        "   ua.*, user.email",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        "INNER JOIN sim ON sim.user= user.id_",
        `WHERE sim.id_= @sim_ref`,
        ";",
        "SELECT ",
        "   ua.*, user.email",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        "INNER JOIN user_sim ON user_sim.user= user.id_",
        "INNER JOIN sim ON sim.id_= user_sim.sim",
        "WHERE sim.id_= @sim_ref AND user_sim.friendly_name IS NOT NULL"
    ].join("\n");
    function parse(queryResults) {
        const uasRegisteredToSim = [];
        for (let row of [...queryResults.pop(), ...queryResults.pop()]) {
            uasRegisteredToSim.push({
                "instance": row["instance"],
                "userEmail": row["email"],
                "platform": row["platform"],
                "pushToken": row["push_token"],
                "software": row["software"]
            });
        }
        return uasRegisteredToSim;
    }
    retrieveUasRegisteredToSim.parse = parse;
})(retrieveUasRegisteredToSim || (retrieveUasRegisteredToSim = {}));
/** Return UAs registered to sim */
function createOrUpdateSimContact(imsi, name, number_raw, storageInfos) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = [
            "SELECT @sim_ref:=NULL, @contact_ref:=NULL;",
            `SELECT @sim_ref:=id_ FROM sim WHERE imsi=${exports.esc(imsi)};`,
            "SELECT _ASSERT(@sim_ref IS NOT NULL, 'SIM should be registered');",
            ""
        ].join("\n");
        if (!!storageInfos) {
            const { mem_index, name_as_stored, new_storage_digest } = storageInfos;
            sql += [
                "SELECT @contact_ref:=id_",
                "FROM contact",
                `WHERE sim=@sim_ref AND mem_index=${exports.esc(mem_index)}`,
                ";",
                "UPDATE sim",
                `SET storage_left=storage_left-1`,
                "WHERE id_=@sim_ref AND @contact_ref IS NULL",
                ";",
                "UPDATE sim",
                `SET storage_digest=${exports.esc(new_storage_digest)}`,
                "WHERE id_=@sim_ref",
                ";",
                buildInsertQuery("contact", {
                    "sim": { "@": "sim_ref" },
                    mem_index,
                    name_as_stored,
                    number_raw,
                    name
                }, "UPDATE")
            ].join("\n");
        }
        else {
            sql += [
                "SELECT @contact_ref:= id_",
                "FROM contact",
                `WHERE sim=@sim_ref AND mem_index IS NULL AND number_raw=${exports.esc(number_raw)}`,
                ";",
                "UPDATE contact",
                `SET name=${exports.esc(name)}`,
                "WHERE @contact_ref IS NOT NULL AND id_=@contact_ref",
                ";",
                "INSERT INTO contact (sim, number_raw, name)",
                `SELECT @sim_ref, ${exports.esc(number_raw)}, ${exports.esc(name)}`,
                "FROM DUAL WHERE @contact_ref IS NULL",
                ";"
            ].join("\n");
        }
        sql += retrieveUasRegisteredToSim.sql;
        const queryResults = yield exports.query(sql, { imsi });
        return retrieveUasRegisteredToSim.parse(queryResults);
    });
}
exports.createOrUpdateSimContact = createOrUpdateSimContact;
/** Return UAs registered to sim */
function deleteSimContact(imsi, contactRef) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = [
            "SELECT @sim_ref:=NULL;",
            `SELECT @sim_ref:=id_ FROM sim WHERE imsi=${exports.esc(imsi)};`,
            "SELECT _ASSERT(@sim_ref IS NOT NULL, 'SIM should be registered');",
            ""
        ].join("\n");
        if ("mem_index" in contactRef) {
            const { mem_index, new_storage_digest } = contactRef;
            sql += [
                `DELETE FROM contact WHERE sim=@sim_ref AND mem_index=${exports.esc(mem_index)};`,
                `UPDATE sim SET storage_left=storage_left+1, storage_digest=${exports.esc(new_storage_digest)} WHERE id_=@sim_ref;`,
            ].join("\n");
        }
        else {
            const { number_raw } = contactRef;
            sql += `DELETE FROM contact WHERE sim=@sim_ref AND number_raw=${exports.esc(number_raw)};`;
        }
        sql += retrieveUasRegisteredToSim.sql;
        const queryResults = yield exports.query(sql, { imsi });
        return retrieveUasRegisteredToSim.parse(queryResults);
    });
}
exports.deleteSimContact = deleteSimContact;
/** return user UAs */
function registerSim(auth, sim, friendlyName, password, dongle, gatewayIp) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = [
            "SELECT @dongle_ref:=NULL, @gateway_location_ref:=NULL, @sim_ref:=NULL;",
            buildInsertQuery("dongle", {
                "imei": dongle.imei,
                "is_voice_enabled": f.bool.enc(dongle.isVoiceEnabled),
                "manufacturer": dongle.manufacturer,
                "model": dongle.model,
                "firmware_version": dongle.firmwareVersion
            }, "UPDATE"),
            "SELECT @dongle_ref:= id_",
            "FROM dongle",
            `WHERE imei= ${exports.esc(dongle.imei)}`,
            ";",
            "SELECT @gateway_location_ref:= id_",
            "FROM gateway_location",
            `WHERE ip= ${exports.esc(gatewayIp)}`,
            ";",
            buildInsertQuery("sim", {
                "imsi": sim.imsi,
                "country_name": sim.country ? sim.country.name : null,
                "country_iso": sim.country ? sim.country.iso : null,
                "country_code": sim.country ? sim.country.code : null,
                "iccid": sim.iccid,
                "dongle": { "@": "dongle_ref" },
                "gateway_location": { "@": "gateway_location_ref" },
                "number_as_stored": !!sim.storage.number ? sim.storage.number : null,
                "service_provider_from_imsi": sim.serviceProvider.fromImsi || null,
                "service_provider_from_network": sim.serviceProvider.fromNetwork || null,
                "contact_name_max_length": sim.storage.infos.contactNameMaxLength,
                "number_max_length": sim.storage.infos.numberMaxLength,
                "storage_left": sim.storage.infos.storageLeft,
                "storage_digest": sim.storage.digest,
                "user": auth.user,
                password,
                "need_password_renewal": 0,
                "friendly_name": friendlyName,
                "is_online": 1
            }, "THROW ERROR"),
            "SELECT @sim_ref:= id_",
            "FROM sim",
            `WHERE imsi= ${exports.esc(sim.imsi)}`,
            ";"
        ].join("\n");
        for (let contact of sim.storage.contacts) {
            sql += buildInsertQuery("contact", {
                "sim": { "@": "sim_ref" },
                "mem_index": contact.index,
                "number_raw": contact.number,
                "name_as_stored": contact.name,
                "name": contact.name
            }, "THROW ERROR");
        }
        sql += [
            "SELECT ua.*, user.email",
            "FROM ua",
            "INNER JOIN user ON user.id_= ua.user",
            `WHERE user.id_= ${exports.esc(auth.user)}`
        ].join("\n");
        const queryResults = yield exports.query(sql, { "email": auth.email, "imsi": sim.imsi });
        const userUas = [];
        for (let row of queryResults.pop()) {
            userUas.push({
                "instance": row["instance"],
                "userEmail": row["email"],
                "platform": row["platform"],
                "pushToken": row["push_token"],
                "software": row["software"]
            });
        }
        return userUas;
    });
}
exports.registerSim = registerSim;
function getUserSims(auth) {
    return __awaiter(this, void 0, void 0, function* () {
        let sql = [
            "SELECT",
            "   sim.*,",
            "   dongle.*,",
            "   gateway_location.ip,",
            "   gateway_location.country_iso AS gw_country_iso,",
            "   gateway_location.subdivisions,",
            "   gateway_location.city",
            "FROM sim",
            "INNER JOIN dongle ON dongle.id_= sim.dongle",
            "INNER JOIN gateway_location ON gateway_location.id_= sim.gateway_location",
            `WHERE sim.user= ${exports.esc(auth.user)}`,
            ";",
            "SELECT",
            "   sim.imsi,",
            "   contact.*",
            "FROM contact",
            "INNER JOIN sim ON sim.id_= contact.sim",
            `WHERE sim.user= ${exports.esc(auth.user)}`,
            ";",
            "SELECT",
            "   sim.imsi,",
            "   user.email,",
            "   user_sim.friendly_name IS NOT NULL AS is_confirmed",
            "FROM sim",
            "INNER JOIN user_sim ON user_sim.sim= sim.id_",
            "INNER JOIN user ON user.id_= user_sim.user",
            `WHERE sim.user= ${exports.esc(auth.user)}`,
            ";",
            "SELECT",
            "   sim.*,",
            "   dongle.*,",
            "   gateway_location.ip,",
            "   gateway_location.country_iso AS gw_country_iso,",
            "   gateway_location.subdivisions,",
            "   gateway_location.city,",
            "   user_sim.friendly_name AS user_friendly_name,",
            "   user_sim.sharing_request_message,",
            "   user.email",
            "FROM sim",
            "INNER JOIN dongle ON dongle.id_= sim.dongle",
            "INNER JOIN gateway_location ON gateway_location.id_= sim.gateway_location",
            "INNER JOIN user ON user.id_= sim.user",
            "INNER JOIN user_sim ON user_sim.sim= sim.id_",
            `WHERE user_sim.user= ${exports.esc(auth.user)}`,
            ";",
            "SELECT",
            "   sim.imsi,",
            "   contact.*",
            "FROM contact",
            "INNER JOIN sim ON sim.id_= contact.sim",
            "INNER JOIN user_sim ON user_sim.sim= sim.id_",
            `WHERE user_sim.user= ${exports.esc(auth.user)}`,
        ].join("\n");
        const [rowsSimOwned, rowsContactSimOwned, rowsSharedWith, rowsSimShared, rowsContactSimShared] = yield exports.query(sql, { "email": auth.email });
        const sharedWithBySim = {};
        for (const row of rowsSharedWith) {
            let imsi = row["imsi"];
            if (!sharedWithBySim[imsi]) {
                sharedWithBySim[imsi] = {
                    "confirmed": [],
                    "notConfirmed": []
                };
            }
            sharedWithBySim[imsi][row["is_confirmed"] ? "confirmed" : "notConfirmed"].push(row["email"]);
        }
        const storageContactsBySim = {};
        const phonebookBySim = {};
        for (const row of [...rowsContactSimOwned, ...rowsContactSimShared]) {
            let imsi = row["imsi"];
            const mem_index = row["mem_index"] !== null ? row["mem_index"] : undefined;
            if (mem_index !== undefined) {
                if (!storageContactsBySim[imsi]) {
                    storageContactsBySim[imsi] = [];
                }
                storageContactsBySim[imsi].push({
                    "index": mem_index,
                    "name": row["name_as_stored"],
                    "number": row["number_raw"]
                });
            }
            if (!phonebookBySim[imsi]) {
                phonebookBySim[imsi] = [];
            }
            phonebookBySim[imsi].push({
                mem_index,
                "name": row["name"],
                "number_raw": row["number_raw"]
            });
        }
        const userSims = [];
        for (const row of [...rowsSimOwned, ...rowsSimShared]) {
            const sim = {
                "iccid": row["iccid"],
                "imsi": row["imsi"],
                "country": row["country_name"] ? ({
                    "name": row["country_name"],
                    "iso": row["country_iso"],
                    "code": row["country_code"]
                }) : undefined,
                "serviceProvider": {
                    "fromImsi": row["service_provider_from_imsi"] || undefined,
                    "fromNetwork": row["service_provider_from_network"] || undefined
                },
                "storage": {
                    "number": row["number_as_stored"] || undefined,
                    "infos": {
                        "contactNameMaxLength": row["contact_name_max_length"],
                        "numberMaxLength": row["number_max_length"],
                        "storageLeft": row["storage_left"],
                    },
                    "contacts": storageContactsBySim[row["imsi"]] || [],
                    "digest": row["storage_digest"]
                }
            };
            const dongle = {
                "imei": row["imei"],
                "isVoiceEnabled": f.bool.dec(row["is_voice_enabled"]),
                "manufacturer": row["manufacturer"],
                "model": row["model"],
                "firmwareVersion": row["firmware_version"]
            };
            const gatewayLocation = {
                "ip": row["ip"],
                "countryIso": row["gw_country_iso"] || undefined,
                "subdivisions": row["subdivisions"] || undefined,
                "city": row["city"] || undefined
            };
            const [friendlyName, ownership] = (() => {
                let ownerEmail = row["email"];
                let ownerFriendlyName = row["friendly_name"];
                if (ownerEmail === undefined) {
                    return [
                        ownerFriendlyName,
                        {
                            "status": "OWNED",
                            "sharedWith": sharedWithBySim[sim.imsi] || {
                                "confirmed": [],
                                "notConfirmed": []
                            }
                        }
                    ];
                }
                else {
                    let friendlyName = row["user_friendly_name"];
                    if (friendlyName === null) {
                        //NOTE: Security hotFix, TODO: see if uppercase, if changed update in make sim proxy (tests)
                        row["password"] = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
                        return [
                            ownerFriendlyName,
                            {
                                "status": "SHARED NOT CONFIRMED",
                                ownerEmail,
                                "sharingRequestMessage": row["sharing_request_message"] || undefined
                            }
                        ];
                    }
                    else {
                        return [
                            friendlyName,
                            { "status": "SHARED CONFIRMED", ownerEmail }
                        ];
                    }
                }
            })();
            const userSim = {
                sim,
                friendlyName,
                "password": row["password"],
                dongle,
                gatewayLocation,
                "isOnline": row["is_online"] === 1,
                ownership,
                "phonebook": phonebookBySim[sim.imsi] || []
            };
            userSims.push(userSim);
        }
        return userSims;
    });
}
exports.getUserSims = getUserSims;
//TODO: Deal without it.
function addOrUpdateUa(ua) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = [
            "INSERT INTO ua",
            "   (instance, user, platform, push_token, software)",
            "SELECT",
            [
                exports.esc(ua.instance),
                "id_",
                exports.esc(ua.platform),
                exports.esc(ua.pushToken),
                exports.esc(ua.software)
            ].join(", "),
            `FROM user WHERE email= ${exports.esc(ua.userEmail)}`,
            "ON DUPLICATE KEY UPDATE",
            "   platform= VALUES(platform),",
            "   push_token= VALUES(push_token),",
            "   software= VALUES(software)"
        ].join("\n");
        yield exports.query(sql, { "email": ua.userEmail });
    });
}
exports.addOrUpdateUa = addOrUpdateUa;
//TODO: test!
function setSimOnline(imsi, password, replacementPassword, gatewayAddress, dongle) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = [
            `SELECT @sim_ref:=NULL, @password_status:=NULL, @dongle_ref:=NULL, @gateway_location_ref:=NULL;`,
            `SELECT`,
            `@sim_ref:= id_,`,
            `storage_digest,`,
            `@password_status:=IF(need_password_renewal,'PASSWORD REPLACED',IF(password=${exports.esc(password)},'UNCHANGED','WAS DIFFERENT')) AS password_status`,
            "FROM sim",
            `WHERE imsi=${exports.esc(imsi)}`,
            ";",
            buildInsertQuery("dongle", {
                "imei": dongle.imei,
                "is_voice_enabled": f.bool.enc(dongle.isVoiceEnabled),
                "manufacturer": dongle.manufacturer,
                "model": dongle.model,
                "firmware_version": dongle.firmwareVersion
            }, "UPDATE"),
            "SELECT @dongle_ref:=id_",
            "FROM dongle",
            `WHERE imei= ${dongle.imei}`,
            ";",
            "SELECT @gateway_location_ref:=id_, country_iso, subdivisions, city",
            "FROM gateway_location",
            `WHERE ip=${exports.esc(gatewayAddress)}`,
            ";",
            "UPDATE sim",
            "SET",
            "   is_online=1,",
            `   password=IF(@password_status='PASSWORD REPLACED',${exports.esc(replacementPassword)},${exports.esc(password)}),`,
            "   dongle=@dongle_ref,",
            "   gateway_location=@gateway_location_ref,",
            "   need_password_renewal=0",
            "WHERE id_= @sim_ref",
            ";",
            retrieveUasRegisteredToSim.sql
        ].join("\n");
        const queryResults = yield exports.query(sql, { imsi, "ip": gatewayAddress });
        queryResults.shift();
        if (queryResults[0].length === 0) {
            return { "isSimRegistered": false };
        }
        return {
            "isSimRegistered": true,
            "passwordStatus": queryResults[0][0]["password_status"],
            "storageDigest": queryResults[0][0]["storage_digest"],
            "gatewayLocation": {
                "ip": gatewayAddress,
                "countryIso": queryResults[3][0]["country_iso"] || undefined,
                "subdivisions": queryResults[3][0]["subdivisions"] || undefined,
                "city": queryResults[3][0]["city"] || undefined
            },
            "uasRegisteredToSim": retrieveUasRegisteredToSim.parse(queryResults)
        };
    });
}
exports.setSimOnline = setSimOnline;
function setAllSimOffline(imsis) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = [
            `LOCK TABLES sim WRITE;`,
            `UPDATE sim`,
            `SET is_online=0`,
            `WHERE ${!imsis ? `1` : imsis.map(imsi => `imsi=${exports.esc(imsi)}`).join(" OR ")}`,
            `;`,
            `UNLOCK TABLES;`
        ].join("\n");
        yield exports.query(sql);
    });
}
exports.setAllSimOffline = setAllSimOffline;
//TODO: This function is only partially tested.
/** Return userSims by imsi */
function setSimsOffline(imsis) {
    return __awaiter(this, void 0, void 0, function* () {
        if (imsis.length === 0) {
            return {};
        }
        let sql = [
            `UPDATE sim SET is_online= 0 WHERE`,
            imsis.map(imsi => `imsi= ${exports.esc(imsi)}`).join(" OR "),
            ";",
            ""
        ].join("\n");
        sql += `SELECT @sim_ref:=NULL;`;
        for (const imsi of imsis) {
            sql += [
                ``,
                `SELECT @sim_ref:=id_ FROM sim WHERE imsi= ${exports.esc(imsi)};`,
                retrieveUasRegisteredToSim.sql + ";",
                ``
            ].join("\n");
        }
        const queryResults = yield exports.query(sql, { "imsi": imsis });
        const out = {};
        for (let i = imsis.length - 1; i >= 0; i--) {
            const imsi = imsis[i];
            out[imsi] = retrieveUasRegisteredToSim.parse(queryResults);
        }
        return out;
    });
}
exports.setSimsOffline = setSimsOffline;
function unregisterSim(auth, imsi) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = [
            `SELECT @sim_ref:=NULL, @is_sim_owned:=NULL, @sim_owner:=NULL;`,
            `SELECT @sim_ref:= sim.id_, @is_sim_owned:=sim.user=${exports.esc(auth.user)}, @sim_owner:=sim.user AS sim_owner`,
            "FROM sim",
            "LEFT JOIN user_sim ON user_sim.sim= sim.id_",
            "WHERE",
            `sim.imsi= ${exports.esc(imsi)} AND ( sim.user= ${exports.esc(auth.user)} OR user_sim.user= ${exports.esc(auth.user)})`,
            "GROUP BY sim.id_",
            ";",
            "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not have access to this SIM')",
            ";",
            "SELECT email AS sim_owner_email FROM user WHERE id_=@sim_owner",
            ";",
            "SELECT",
            "   ua.*, user.email",
            "FROM ua",
            "   INNER JOIN user ON user.id_= ua.user",
            "   INNER JOIN sim ON sim.user= user.id_",
            "WHERE sim.id_= @sim_ref AND @is_sim_owned",
            ";",
            "SELECT",
            "   ua.*, user.email",
            "FROM ua",
            "INNER JOIN user ON user.id_= ua.user",
            "INNER JOIN user_sim ON user_sim.user= user.id_",
            "WHERE",
            "   user_sim.sim= @sim_ref",
            "   AND user_sim.friendly_name IS NOT NULL",
            `   AND ( @is_sim_owned OR user.id_= ${exports.esc(auth.user)})`,
            ";",
            "DELETE FROM sim WHERE id_= @sim_ref AND @is_sim_owned",
            ";",
            "DELETE FROM user_sim",
            `WHERE sim= @sim_ref AND user= ${exports.esc(auth.user)} AND NOT @is_sim_owned`
        ].join("\n");
        const queryResults = yield exports.query(sql, { "email": auth.email, imsi });
        queryResults.shift();
        const affectedUas = [];
        for (const row of [...queryResults[3], ...queryResults[4]]) {
            affectedUas.push({
                "instance": row["instance"],
                "userEmail": row["email"],
                "platform": row["platform"],
                "pushToken": row["push_token"],
                "software": row["software"]
            });
        }
        return {
            affectedUas,
            "owner": {
                "user": queryResults[0][0]["sim_owner"],
                "email": queryResults[2][0]["sim_owner_email"]
            }
        };
    });
}
exports.unregisterSim = unregisterSim;
//TODO: test changed
/** assert emails not empty, return affected user email */
function shareSim(auth, imsi, emails, sharingRequestMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        emails = emails
            .map(email => email.toLowerCase())
            .filter(email => email !== auth.email);
        const sql = [
            "SELECT @sim_ref:=NULL;",
            "SELECT @sim_ref:= id_",
            "FROM sim",
            `WHERE imsi= ${exports.esc(imsi)} AND user= ${exports.esc(auth.user)}`,
            ";",
            "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not own sim')",
            ";",
            "INSERT IGNORE INTO user",
            "   (email, salt, digest, creation_date, ip)",
            "VALUES",
            emails.map(email => `   ( ${exports.esc(email)}, '', '', 0, '')`).join(",\n"),
            ";",
            "DROP TABLE IF EXISTS _user",
            ";",
            "CREATE TEMPORARY TABLE _user AS (",
            "   SELECT user.id_, user.email, user.salt<> '' AS is_registered",
            "   FROM user",
            "   LEFT JOIN user_sim ON user_sim.user= user.id_",
            `   WHERE ${emails.map(email => `user.email= ${exports.esc(email)}`).join(" OR ")}`,
            "   GROUP BY user.id_",
            "   HAVING COUNT(user_sim.id_)=0 OR SUM(user_sim.sim= @sim_ref)=0",
            ")",
            ";",
            "INSERT INTO user_sim",
            "   (user, sim, friendly_name, sharing_request_message)",
            "SELECT",
            `   id_, @sim_ref, NULL, ${exports.esc(sharingRequestMessage || null)}`,
            "FROM _user",
            ";",
            "SELECT * from _user"
        ].join("\n");
        const queryResults = yield exports.query(sql, { imsi, "email": [auth.email, ...emails] });
        const userRows = queryResults.pop();
        const affectedUsers = {
            "registered": [],
            "notRegistered": []
        };
        for (const row of userRows) {
            const auth = {
                "user": row["id_"],
                "email": row["email"]
            };
            if (row["is_registered"] === 1) {
                affectedUsers.registered.push(auth);
            }
            else {
                affectedUsers.notRegistered.push(auth.email);
            }
        }
        return affectedUsers;
    });
}
exports.shareSim = shareSim;
/** Return no longer registered UAs, assert email list not empty*/
function stopSharingSim(auth, imsi, emails) {
    return __awaiter(this, void 0, void 0, function* () {
        emails = emails.map(email => email.toLowerCase());
        //TODO: See if JOIN work on temporary table
        const sql = [
            "SELECT @sim_ref:=NULL, @ua_found:=NULL;",
            "SELECT @sim_ref:= id_",
            "FROM sim",
            `WHERE imsi= ${exports.esc(imsi)} AND user= ${exports.esc(auth.user)}`,
            ";",
            "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not own SIM')",
            ";",
            "DROP TABLE IF EXISTS _user_sim",
            ";",
            "CREATE TEMPORARY TABLE _user_sim AS (",
            "   SELECT",
            "       user_sim.id_,",
            "       user_sim.user,",
            "       user.email,",
            "       user_sim.friendly_name IS NOT NULL as is_confirmed",
            "   FROM user_sim",
            "   INNER JOIN user ON user.id_= user_sim.user",
            `   WHERE user_sim.sim= @sim_ref AND (${emails.map(email => `user.email= ${exports.esc(email)}`).join(" OR ")})`,
            ")",
            ";",
            "SELECT ua.*, _user_sim.email, @ua_found:= 1",
            "FROM ua",
            "INNER JOIN _user_sim ON _user_sim.user= ua.user",
            "WHERE _user_sim.is_confirmed",
            ";",
            "UPDATE sim",
            "SET need_password_renewal= 1",
            "WHERE id_= @sim_ref AND @ua_found",
            ";",
            "DELETE user_sim.*",
            "FROM user_sim",
            "INNER JOIN _user_sim ON _user_sim.id_= user_sim.id_"
        ].join("\n");
        const queryResults = yield exports.query(sql, { imsi, "email": auth.email });
        queryResults.shift();
        const uaRows = queryResults[4];
        const noLongerRegisteredUas = [];
        for (const row of uaRows) {
            noLongerRegisteredUas.push({
                "instance": row["instance"],
                "userEmail": row["email"],
                "platform": row["platform"],
                "pushToken": row["push_token"],
                "software": row["software"]
            });
        }
        return noLongerRegisteredUas;
    });
}
exports.stopSharingSim = stopSharingSim;
/** Return user UAs */
function setSimFriendlyName(auth, imsi, friendlyName) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = [
            `SELECT @sim_ref:=NULL, @is_sim_owned:=NULL;`,
            `SELECT @sim_ref:= sim.id_, @is_sim_owned:= sim.user= ${exports.esc(auth.user)}`,
            "FROM sim",
            "LEFT JOIN user_sim ON user_sim.sim= sim.id_",
            `WHERE sim.imsi= ${exports.esc(imsi)} AND ( sim.user= ${exports.esc(auth.user)} OR user_sim.user= ${exports.esc(auth.user)})`,
            "GROUP BY sim.id_",
            ";",
            "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not have access to this SIM')",
            ";",
            "UPDATE sim",
            `SET friendly_name= ${exports.esc(friendlyName)}`,
            "WHERE id_= @sim_ref AND @is_sim_owned",
            ";",
            "UPDATE user_sim",
            `SET friendly_name= ${exports.esc(friendlyName)}, sharing_request_message= NULL`,
            `WHERE sim= @sim_ref AND user= ${exports.esc(auth.user)} AND NOT @is_sim_owned`,
            ";",
            "SELECT ua.*, user.email",
            "FROM ua",
            "INNER JOIN user ON user.id_= ua.user",
            `WHERE user= ${exports.esc(auth.user)}`
        ].join("\n");
        const queryResults = yield exports.query(sql, { imsi, "email": auth.email });
        const uaRows = queryResults.pop();
        const userUas = [];
        for (const row of uaRows) {
            userUas.push({
                "instance": row["instance"],
                "userEmail": row["email"],
                "platform": row["platform"],
                "pushToken": row["push_token"],
                "software": row["software"]
            });
        }
        return userUas;
    });
}
exports.setSimFriendlyName = setSimFriendlyName;
function getSimOwner(imsi) {
    return __awaiter(this, void 0, void 0, function* () {
        let rows = yield exports.query([
            "SELECT user.*",
            "FROM user",
            "INNER JOIN sim ON sim.user= user.id_",
            `WHERE sim.imsi= ${exports.esc(imsi)}`
        ].join("\n"), { imsi });
        if (!rows.length) {
            return undefined;
        }
        else {
            return {
                "user": rows[0]["id_"],
                "email": rows[0]["email"]
            };
        }
    });
}
exports.getSimOwner = getSimOwner;
