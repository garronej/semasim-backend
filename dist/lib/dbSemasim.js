"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const geoiplookup_1 = require("../tools/geoiplookup");
const f = require("../tools/mysqlCustom");
const ttTesting = require("transfer-tools/dist/lib/testing");
const uuidv3 = require("uuid/v3");
const chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
const logger = require("logger");
const deploy_1 = require("../deploy");
const debug = logger.debugFactory();
const LOG_QUERY_DURATION = false;
let buildInsertQuery;
/** Must be called and before use */
function launch() {
    const api = f.createPoolAndGetApi(Object.assign(Object.assign({}, deploy_1.deploy.dbAuth.value), { "database": "semasim" }), "HANDLE STRING ENCODING");
    exports.query = LOG_QUERY_DURATION ?
        async function (...args) {
            const start = Date.now();
            const out = await api.query.apply(api, args);
            const duration = Date.now() - start;
            //console.log(`${JSON.stringify(args[0]).substring(0, 90)}: ${duration}ms`);
            console.log(`duration: ${duration}ms\n\n\n`);
            return out;
        }
        :
            api.query;
    exports.esc = api.esc;
    buildInsertQuery = api.buildInsertQuery;
    exports.end = api.end;
}
exports.launch = launch;
/** For test purpose only */
async function flush() {
    await exports.query([
        "DELETE FROM user;",
        "DELETE FROM dongle;",
        "DELETE FROM gateway_location;"
    ].join("\n"));
}
exports.flush = flush;
var rmd160;
(function (rmd160) {
    async function hash(secret, salt) {
        const start = Date.now();
        const out = {
            "digest": crypto.createHash("rmd160")
                .update(`${secret}${salt}`)
                .digest("hex")
        };
        //NOTE: Protection against timing attack.
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * Math.min(50, Date.now() - start))));
        return out;
    }
    async function generateSaltAndHash(secret) {
        const salt = crypto.randomBytes(8).toString("hex");
        return Object.assign({ salt }, await hash(secret, salt));
    }
    rmd160.generateSaltAndHash = generateSaltAndHash;
    async function isValidSecret(secret, salt, expectedDigest) {
        return (await hash(secret, salt)).digest === expectedDigest;
    }
    rmd160.isValidSecret = isValidSecret;
})(rmd160 || (rmd160 = {}));
/**
 * User not yet registered but that already exist in the database
 * are created by the shareSim function
 * those user have no salt and no password and does not need to verify their email.
 * */
async function createUserAccount(email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey, ip) {
    if (LOG_QUERY_DURATION) {
        debug("createUserAccount");
    }
    const { salt, digest } = await rmd160.generateSaltAndHash(secret);
    let activationCode = ttTesting.genDigits(4);
    email = email.toLowerCase();
    const webUaInstanceId = `"<urn:uuid:${uuidv3(email, "5e9906d0-07cc-11e8-83d5-fbdd176f7bb9")}>"`;
    const sql = [
        `SELECT @update_record:=NULL;`,
        "INSERT INTO user",
        "   ( email, salt, digest, activation_code, toward_user_encrypt_key, sym_key_enc, web_ua_instance_id, creation_date, ip )",
        "VALUES",
        "   ( " + [
            email, salt, digest, activationCode,
            towardUserEncryptKeyStr, encryptedSymmetricKey,
            webUaInstanceId,
            Date.now(), ip
        ].map(value => exports.esc(value))
            .join(", ") + " )",
        "ON DUPLICATE KEY UPDATE",
        "   salt= IF(@update_record:= salt = '', VALUES(salt), salt),",
        "   activation_code= IF(@update_record, NULL, activation_code),",
        [
            "digest",
            "toward_user_encrypt_key",
            "sym_key_enc",
            "web_ua_instance_id",
            "creation_date",
            "ip"
        ].map(key => `   ${key}= IF(@update_record, VALUES(${key}), ${key})`).join(",\n"),
        ";",
        `SELECT @update_record AS update_record`,
        ";",
        addOrUpdateUa.getQuery({
            "instance": webUaInstanceId,
            "userEmail": email,
            "platform": "web",
            "pushToken": "",
            "messagesEnabled": true
        })
    ].join("\n");
    const res = await exports.query(sql, { email });
    const { insertId } = res[1];
    if (insertId === 0) {
        return undefined;
    }
    else {
        const user = insertId;
        if (res[2][0]["update_record"] !== null) {
            activationCode = null;
        }
        return { user, activationCode };
    }
}
exports.createUserAccount = createUserAccount;
/**
 * Return true if the account was validated
 * False may occur if the user try to validate again
 * an email that have been validated already.
 */
async function validateUserEmail(email, activationCode) {
    if (LOG_QUERY_DURATION) {
        debug("validateUserEmail");
    }
    email = email.toLowerCase();
    const sql = [
        `UPDATE user `,
        `SET activation_code=NULL`,
        `WHERE activation_code=${exports.esc(activationCode)}`
    ].join("\n");
    const { affectedRows } = await exports.query(sql, { email });
    return affectedRows === 1;
}
exports.validateUserEmail = validateUserEmail;
/** Return user.id_ or undefined if auth failed */
async function authenticateUser(email, secret) {
    if (LOG_QUERY_DURATION) {
        debug("authenticateUser");
    }
    email = email.toLowerCase();
    const sql = [
        `SELECT`,
        `   id_,`,
        `   salt,`,
        `   digest,`,
        `   last_attempt_date,`,
        `   forbidden_retry_delay,`,
        `   activation_code,`,
        `   toward_user_encrypt_key,`,
        `   sym_key_enc,`,
        `   web_ua_instance_id`,
        `FROM user WHERE email= ${exports.esc(email)}`
    ].join("\n");
    const rows = await exports.query(sql, { email });
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
    if (await rmd160.isValidSecret(secret, row["salt"], row["digest"])) {
        if (retryDelay !== undefined) {
            const sql = buildInsertQuery("user", {
                "id_": user,
                "forbidden_retry_delay": null,
                "last_attempt_date": null
            }, "UPDATE");
            await exports.query(sql, { email });
        }
        return {
            "status": "SUCCESS",
            "webUaAuthenticatedSessionDescriptorWithoutConnectSid": {
                user,
                "shared": {
                    email,
                    "encryptedSymmetricKey": row["sym_key_enc"],
                    "webUaInstanceId": row["web_ua_instance_id"]
                },
                "towardUserEncryptKeyStr": row["toward_user_encrypt_key"],
            }
        };
    }
    else {
        const newRetryDelay = Math.min(retryDelay !== undefined ? retryDelay * 2 : 1000, 60000);
        const sql = buildInsertQuery("user", {
            "id_": user,
            "forbidden_retry_delay": newRetryDelay,
            "last_attempt_date": Date.now()
        }, "UPDATE");
        await exports.query(sql, { email });
        return {
            "status": "WRONG PASSWORD",
            "retryDelay": newRetryDelay
        };
    }
}
exports.authenticateUser = authenticateUser;
/**Work for account that have been automatically created due to sharing request. */
async function setPasswordRenewalToken(email) {
    if (LOG_QUERY_DURATION) {
        debug("setPasswordRenewalToken");
    }
    email = email.toLowerCase();
    const token = crypto.randomBytes(16).toString("hex");
    const sql = [
        `UPDATE user`,
        `SET password_renewal_token=${exports.esc(token)}`,
        `WHERE email=${exports.esc(email)}`
    ].join("\n");
    const { affectedRows } = await exports.query(sql, { email });
    return (affectedRows === 1) ? token : undefined;
}
exports.setPasswordRenewalToken = setPasswordRenewalToken;
async function renewPassword(email, newSecret, newTowardUserEncryptKeyStr, newEncryptedSymmetricKey, token) {
    if (LOG_QUERY_DURATION) {
        debug("renewPassword");
    }
    const { digest, salt } = await rmd160.generateSaltAndHash(newSecret);
    const sql = [
        `SELECT @user_ref:=NULL;`,
        `SELECT @user_ref:=id_ as id_`,
        `FROM user`,
        `WHERE password_renewal_token=${exports.esc(token)} AND email=${exports.esc(email)}`,
        `;`,
        `UPDATE user`,
        `SET`,
        `salt=${exports.esc(salt)},`,
        `digest=${exports.esc(digest)},`,
        `toward_user_encrypt_key=${exports.esc(newTowardUserEncryptKeyStr)},`,
        `sym_key_enc=${exports.esc(newEncryptedSymmetricKey)},`,
        `last_attempt_date= NULL,`,
        `forbidden_retry_delay= NULL,`,
        `password_renewal_token= NULL`,
        `WHERE id_=@user_ref`,
        `;`
    ].join("\n");
    const res = await exports.query(sql, { email });
    return res[2].affectedRows === 1 ?
        {
            "wasTokenStillValid": true,
            "user": res[1][0]["id_"]
        } : {
        "wasTokenStillValid": false
    };
}
exports.renewPassword = renewPassword;
//TODO: Implement and when it's done enforce providing email for lock.
async function deleteUser(auth) {
    if (LOG_QUERY_DURATION) {
        debug("deleteUser");
    }
    const sql = `DELETE FROM user WHERE id_ = ${exports.esc(auth.user)}`;
    const { affectedRows } = await exports.query(sql, { "email": auth.shared.email });
    const isDeleted = affectedRows !== 0;
    return isDeleted;
}
exports.deleteUser = deleteUser;
/** Only request that is make with two SQL queries */
async function addGatewayLocation(ip) {
    if (LOG_QUERY_DURATION) {
        debug("addGatewayLocation");
    }
    const { insertId } = await exports.query(buildInsertQuery("gateway_location", { ip, "country_iso": null, "subdivisions": null, "city": null }, "IGNORE"), { ip });
    if (!insertId) {
        return;
    }
    try {
        const { countryIso, subdivisions, city } = await geoiplookup_1.geoiplookup(ip);
        const sql = buildInsertQuery("gateway_location", {
            ip,
            "country_iso": countryIso || null,
            "subdivisions": subdivisions || null,
            "city": city || null
        }, "UPDATE");
        await exports.query(sql, { ip });
    }
    catch (error) {
        debug(`Lookup id failed ${ip}`, error.message);
        return;
    }
}
exports.addGatewayLocation = addGatewayLocation;
/**
 *  returns locked dongles with unreadable SIM iccid,
 *  locked dongles with readable iccid registered by user
 *  active dongles not registered
 */
async function filterDongleWithRegistrableSim(auth, dongles) {
    if (LOG_QUERY_DURATION) {
        debug("filterDongleWithRegistrableSim");
    }
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
    let rows = await exports.query([
        "SELECT iccid, user",
        "FROM sim",
        "WHERE",
        dongleWithReadableIccid.map(({ sim }) => `iccid= ${exports.esc(sim.iccid)}`).join(" OR ")
    ].join("\n"), { "email": auth.shared.email });
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
}
exports.filterDongleWithRegistrableSim = filterDongleWithRegistrableSim;
async function updateSimStorage(imsi, storage) {
    if (LOG_QUERY_DURATION) {
        debug("updateSimStorage");
    }
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
    sql += `DELETE FROM contact WHERE sim=@sim_ref AND mem_index IS NOT NULL`;
    if (storage.contacts.length !== 0) {
        sql += ` AND mem_index NOT IN (${storage.contacts.map(({ index }) => `${index}`).join(", ")})`;
    }
    await exports.query(sql, { imsi });
}
exports.updateSimStorage = updateSimStorage;
//TODO: Test!
async function getUserUa(email) {
    if (LOG_QUERY_DURATION) {
        debug("getUserUa");
    }
    email = email.toLowerCase();
    const sql = [
        "SELECT ua.*, user.toward_user_encrypt_key",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        `WHERE user.email=${exports.esc(email)}`,
    ].join("\n");
    const uas = [];
    const rows = await exports.query(sql);
    for (const row of rows) {
        uas.push({
            "instance": row["instance"],
            "userEmail": email,
            "towardUserEncryptKeyStr": row["toward_user_encrypt_key"],
            "platform": row["platform"],
            "pushToken": row["push_token"],
            "messagesEnabled": f.bool.dec(row["messages_enabled"])
        });
    }
    return uas;
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
        "   ua.*, user.email, user.toward_user_encrypt_key",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        "INNER JOIN sim ON sim.user= user.id_",
        `WHERE sim.id_= @sim_ref`,
        ";",
        "SELECT ",
        "   ua.*, user.email, user.toward_user_encrypt_key",
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
                "towardUserEncryptKeyStr": row["toward_user_encrypt_key"],
                "platform": row["platform"],
                "pushToken": row["push_token"],
                "messagesEnabled": f.bool.dec(row["messages_enabled"])
            });
        }
        return uasRegisteredToSim;
    }
    retrieveUasRegisteredToSim.parse = parse;
})(retrieveUasRegisteredToSim || (retrieveUasRegisteredToSim = {}));
/** Return UAs registered to sim */
async function createOrUpdateSimContact(imsi, name, number_raw, storageInfos) {
    if (LOG_QUERY_DURATION) {
        debug("createOrUpdateSimContact");
    }
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
    const queryResults = await exports.query(sql, { imsi });
    return retrieveUasRegisteredToSim.parse(queryResults);
}
exports.createOrUpdateSimContact = createOrUpdateSimContact;
/** Return UAs registered to sim */
async function deleteSimContact(imsi, contactRef) {
    if (LOG_QUERY_DURATION) {
        debug("deleteSimContact");
    }
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
    const queryResults = await exports.query(sql, { imsi });
    return retrieveUasRegisteredToSim.parse(queryResults);
}
exports.deleteSimContact = deleteSimContact;
/** return user UAs */
async function registerSim(auth, sim, friendlyName, password, towardSimEncryptKeyStr, dongle, gatewayIp, isGsmConnectivityOk, cellSignalStrength) {
    if (LOG_QUERY_DURATION) {
        debug("registerSim");
    }
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
            "toward_sim_encrypt_key": towardSimEncryptKeyStr,
            "need_password_renewal": 0,
            "friendly_name": friendlyName,
            "is_online": 1,
            "is_gsm_connectivity_ok": f.bool.enc(isGsmConnectivityOk),
            "cell_signal_strength": cellSignalStrength
        }, "THROW ERROR"),
        "SELECT @sim_ref:= id_",
        "FROM sim",
        `WHERE imsi= ${exports.esc(sim.imsi)}`,
        ";"
    ].join("\n");
    sql += buildInsertQuery("contact", sim.storage.contacts.map(contact => ({
        "sim": { "@": "sim_ref" },
        "mem_index": contact.index,
        "number_raw": contact.number,
        "name_as_stored": contact.name,
        "name": contact.name
    })), "THROW ERROR");
    sql += [
        "SELECT ua.*, user.email, user.toward_user_encrypt_key",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        `WHERE user.id_= ${exports.esc(auth.user)}`
    ].join("\n");
    const queryResults = await exports.query(sql, { "email": auth.shared.email, "imsi": sim.imsi });
    const userUas = [];
    for (let row of queryResults.pop()) {
        userUas.push({
            "instance": row["instance"],
            "userEmail": row["email"],
            "towardUserEncryptKeyStr": row["toward_user_encrypt_key"],
            "platform": row["platform"],
            "pushToken": row["push_token"],
            "messagesEnabled": f.bool.dec(row["messages_enabled"])
        });
    }
    return userUas;
}
exports.registerSim = registerSim;
/** Return all the UAs registered to SIM */
async function createUpdateOrDeleteOngoingCall(ongoingCallId, imsi, number, from, isTerminated, uasInCall) {
    if (LOG_QUERY_DURATION) {
        debug("createUpdateOrDeleteOngoingCall");
    }
    let sql = [
        `SELECT @sim_ref:=NULL, @ongoing_call_ref:=NULL`,
        `;`,
        `SELECT @sim_ref:= id_ FROM sim WHERE imsi=${exports.esc(imsi)}`,
        `;`,
        `SELECT _ASSERT(@sim_ref IS NOT NULL, 'SIM is not registered')`,
        `;`,
        `DELETE FROM ongoing_call WHERE sim=@sim_ref`,
        `;`
    ].join("\n");
    if (!isTerminated) {
        sql += [
            buildInsertQuery("ongoing_call", {
                "ongoing_call_id": ongoingCallId,
                "sim": { "@": "sim_ref" },
                number,
                "is_from_sip": from === "SIP" ? 1 : 0
            }, "THROW ERROR"),
            `SELECT @ongoing_call_ref:=id_ FROM ongoing_call WHERE ongoing_call_id=${exports.esc(ongoingCallId)}`,
            `;`,
            ...uasInCall.map(ua => [
                `SELECT @ua_ref:=NULL`,
                `;`,
                `SELECT @ua_ref:=ua.id_`,
                `FROM ua`,
                `INNER JOIN user ON user.id_=ua.user`,
                `WHERE ua.instance=${exports.esc(ua.instance)} AND user.email=${exports.esc(ua.userEmail)}`,
                `;`,
                `SELECT _ASSERT(@ua_ref IS NOT NULL, 'UA does not exist')`,
                `;`,
                buildInsertQuery("ongoing_call_ua", {
                    "ongoing_call": { "@": "ongoing_call_ref" },
                    "ua": { "@": "ua_ref" }
                }, "THROW ERROR")
            ].join("\n"))
        ].join("\n");
    }
    sql += "\n" + retrieveUasRegisteredToSim.sql;
    const queryResults = await exports.query(sql, { imsi });
    return retrieveUasRegisteredToSim.parse(queryResults);
}
exports.createUpdateOrDeleteOngoingCall = createUpdateOrDeleteOngoingCall;
async function getUserSims(auth) {
    if (LOG_QUERY_DURATION) {
        debug("getUserSims");
    }
    const sql = [
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
        ";",
        `SELECT sim.imsi, user.email`,
        `FROM sim`,
        `INNER JOIN user_sim ON user_sim.sim=sim.id_`,
        `INNER JOIN user ON user.id_=user_sim.user`,
        `WHERE`,
        `    user_sim.user<>${exports.esc(auth.user)} AND`,
        `    user_sim.friendly_name IS NOT NULL AND`,
        `    sim.id_ IN (SELECT sim`,
        `                FROM user_sim`,
        `                WHERE user=${exports.esc(auth.user)} AND friendly_name IS NOT NULL)`,
        `;`,
        `SELECT`,
        `	 sim.imsi,`,
        `    ongoing_call.ongoing_call_id,`,
        `    ongoing_call.number,`,
        `    ongoing_call.is_from_sip,`,
        `    user.email,`,
        `    user.id_ AS user`,
        `FROM ongoing_call`,
        `INNER JOIN sim ON sim.id_ = ongoing_call.sim`,
        `INNER JOIN ongoing_call_ua ON ongoing_call_ua.ongoing_call = ongoing_call.id_`,
        `INNER JOIN ua ON ua.id_ = ongoing_call_ua.ua`,
        `INNER JOIN user ON user.id_ = ua.user`,
        `WHERE sim.id_ IN (SELECT sim.id_`,
        `                  FROM sim`,
        `                  INNER JOIN user_sim ON user_sim.sim=sim.id_`,
        `                  WHERE`,
        `                      sim.is_online=1 AND`,
        `                      sim.is_gsm_connectivity_ok=1 AND`,
        `                      ( user_sim.user=${exports.esc(auth.user)} OR sim.user=${exports.esc(auth.user)} ))`,
        `` //6 Ongoing calls for all the sim the user have access to ( owned and the sim that have been shared with him )
    ].join("\n");
    const queryResults = await exports.query(sql, { "email": auth.shared.email });
    const emailsOfUserSharingSimOwned = (() => {
        const rows = queryResults[2];
        const out = {};
        for (const row of rows) {
            const imsi = row["imsi"];
            if (!out[imsi]) {
                out[imsi] = {
                    "confirmed": [],
                    "notConfirmed": []
                };
            }
            out[imsi][row["is_confirmed"] === 1 ? "confirmed" : "notConfirmed"].push(row["email"]);
        }
        return out;
    })();
    const emailsOfUsersAlsoSharingSimNotOwned = (() => {
        const rows = queryResults[5];
        const out = {};
        for (const row of rows) {
            const imsi = row["imsi"];
            if (!out[imsi]) {
                out[imsi] = [];
            }
            out[imsi].push(row["email"]);
        }
        return out;
    })();
    const ongoingCalls = (() => {
        const rows = queryResults[6];
        const out = {};
        for (const row of rows) {
            const imsi = row["imsi"];
            if (!out[imsi]) {
                out[imsi] = {
                    "ongoingCallId": row["ongoing_call_id"],
                    "from": row["is_from_sip"] === 1 ? "SIP" : "DONGLE",
                    "isUserInCall": false,
                    "number": row["number"],
                    "otherUserInCallEmails": []
                };
            }
            const ongoingCall = out[imsi];
            if (row["user"] === auth.user) {
                ongoingCall.isUserInCall = true;
                continue;
            }
            ongoingCall.otherUserInCallEmails.push(row["email"]);
        }
        return out;
    })();
    const storageContactsBySim = {};
    const phonebookBySim = {};
    for (const row of [...queryResults[1], ...queryResults[4]]) {
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
    for (const row of [...queryResults[0], ...queryResults[3]]) {
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
                        "sharedWith": emailsOfUserSharingSimOwned[sim.imsi] || {
                            "confirmed": [],
                            "notConfirmed": []
                        }
                    }
                ];
            }
            else {
                let friendlyName = row["user_friendly_name"];
                const otherUserEmails = emailsOfUsersAlsoSharingSimNotOwned[sim.imsi] || [];
                if (friendlyName === null) {
                    //NOTE: Security hotFix, TODO: see if uppercase, if changed update in make sim proxy (tests)
                    row["password"] = "ffffffffffffffffffffffffffffffff";
                    return [
                        ownerFriendlyName,
                        {
                            "status": "SHARED NOT CONFIRMED",
                            ownerEmail,
                            "sharingRequestMessage": row["sharing_request_message"] || undefined,
                            otherUserEmails
                        }
                    ];
                }
                else {
                    return [
                        friendlyName,
                        {
                            "status": "SHARED CONFIRMED",
                            ownerEmail,
                            otherUserEmails
                        }
                    ];
                }
            }
        })();
        const userSim = {
            sim,
            friendlyName,
            "password": row["password"],
            "towardSimEncryptKeyStr": row["toward_sim_encrypt_key"],
            dongle,
            gatewayLocation,
            ownership,
            "phonebook": phonebookBySim[sim.imsi] || [],
            "reachableSimState": (() => {
                if (row["is_online"] === 0) {
                    return undefined;
                }
                const isGsmConnectivityOk = f.bool.dec(row["is_gsm_connectivity_ok"]);
                const cellSignalStrength = row["cell_signal_strength"];
                if (!isGsmConnectivityOk) {
                    return {
                        isGsmConnectivityOk,
                        cellSignalStrength
                    };
                }
                return {
                    isGsmConnectivityOk,
                    cellSignalStrength,
                    "ongoingCall": ongoingCalls[sim.imsi]
                };
            })()
        };
        userSims.push(userSim);
    }
    return userSims;
}
exports.getUserSims = getUserSims;
async function addOrUpdateUa(ua) {
    if (LOG_QUERY_DURATION) {
        debug("addOrUpdateUa");
    }
    const sql = addOrUpdateUa.getQuery(ua);
    await exports.query(sql, { "email": ua.userEmail });
}
exports.addOrUpdateUa = addOrUpdateUa;
(function (addOrUpdateUa) {
    function getQuery(ua) {
        return [
            "INSERT INTO ua",
            "   (instance, user, platform, push_token, messages_enabled)",
            "SELECT",
            [
                exports.esc(ua.instance),
                "id_",
                exports.esc(ua.platform),
                exports.esc(ua.pushToken),
                f.bool.enc(ua.messagesEnabled)
            ].join(", "),
            `FROM user WHERE email= ${exports.esc(ua.userEmail)}`,
            "ON DUPLICATE KEY UPDATE",
            [
                "platform",
                "push_token",
                "messages_enabled"
            ].map(key => `    ${key}= VALUES(${key})`).join(",\n")
        ].join("\n");
    }
    addOrUpdateUa.getQuery = getQuery;
})(addOrUpdateUa = exports.addOrUpdateUa || (exports.addOrUpdateUa = {}));
async function changeSimGsmConnectivityOrSignal(imsi, p) {
    if (LOG_QUERY_DURATION) {
        debug("changeSimGsmConnectivityOrSignal");
    }
    const sql = [
        `SELECT @sim_ref:=NULL;`,
        `SELECT @sim_ref:= id_ FROM sim WHERE imsi=${exports.esc(imsi)};`,
        "UPDATE sim",
        "SET",
        "isGsmConnectivityOk" in p ?
            `   is_gsm_connectivity_ok=${exports.esc(f.bool.enc(p.isGsmConnectivityOk))}` :
            `   cell_signal_strength=${exports.esc(p.cellSignalStrength)}`,
        "WHERE id_= @sim_ref",
        ";",
        retrieveUasRegisteredToSim.sql
    ].join("\n");
    const queryResults = await exports.query(sql, { imsi });
    queryResults.shift();
    if (queryResults[0].length === 0) {
        return { "isSimRegistered": false };
    }
    return {
        "isSimRegistered": true,
        "uasRegisteredToSim": retrieveUasRegisteredToSim.parse(queryResults)
    };
}
exports.changeSimGsmConnectivityOrSignal = changeSimGsmConnectivityOrSignal;
async function setSimOnline(imsi, password, replacementPassword, towardSimEncryptKeyStr, gatewayAddress, dongle, isGsmConnectivityOk, cellSignalStrength) {
    if (LOG_QUERY_DURATION) {
        debug("setSimOnline");
    }
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
        `   toward_sim_encrypt_key=${exports.esc(towardSimEncryptKeyStr)},`,
        "   dongle=@dongle_ref,",
        "   gateway_location=@gateway_location_ref,",
        "   need_password_renewal=0,",
        `   is_gsm_connectivity_ok=${exports.esc(f.bool.enc(isGsmConnectivityOk))},`,
        `   cell_signal_strength=${exports.esc(cellSignalStrength)}`,
        "WHERE id_= @sim_ref",
        ";",
        "DELETE FROM ongoing_call WHERE sim=@sim_ref",
        ";",
        retrieveUasRegisteredToSim.sql
    ].join("\n");
    const queryResults = await exports.query(sql, { imsi, "ip": gatewayAddress });
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
}
exports.setSimOnline = setSimOnline;
async function setAllSimOffline(imsis) {
    if (LOG_QUERY_DURATION) {
        debug("setAllSimOffline");
    }
    if (imsis !== undefined && imsis.length === 0) {
        return;
    }
    const sql = [
        `LOCK TABLES sim WRITE;`,
        `UPDATE sim`,
        `SET is_online=0`,
        //`WHERE ${!imsis ? `1` : imsis.map(imsi => `imsi=${esc(imsi)}`).join(" OR ")}`,
        `WHERE ${!imsis ? `1` : `imsi IN (${imsis.map(imsi => exports.esc(imsi)).join(", ")})`}`,
        `;`,
        `UNLOCK TABLES;`
    ].join("\n");
    await exports.query(sql);
}
exports.setAllSimOffline = setAllSimOffline;
//TODO: This function is only partially tested!!!
/** Return all ua registered to sim by by imsi */
async function setSimsOffline(imsis) {
    if (LOG_QUERY_DURATION) {
        debug("setSimsOffline");
    }
    if (imsis.length === 0) {
        return {};
    }
    let sql = [
        `UPDATE sim SET is_online= 0 WHERE imsi IN (${imsis.map(imsi => exports.esc(imsi)).join(", ")})`,
        `;`
    ].join("\n");
    for (const imsi of imsis) {
        sql += [
            `SELECT @sim_ref:=NULL`,
            `;`,
            `SELECT @sim_ref:=id_ FROM sim WHERE imsi= ${exports.esc(imsi)}`,
            `;`,
            retrieveUasRegisteredToSim.sql,
            `;`
        ].join("\n");
    }
    const queryResults = await exports.query(sql, { "imsi": imsis });
    const out = {};
    for (let i = imsis.length - 1; i >= 0; i--) {
        const imsi = imsis[i];
        out[imsi] = retrieveUasRegisteredToSim.parse(queryResults);
        queryResults.pop();
        queryResults.pop();
    }
    return out;
}
exports.setSimsOffline = setSimsOffline;
async function unregisterSim(auth, imsi) {
    if (LOG_QUERY_DURATION) {
        debug("unregisterSim");
    }
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
        "   ua.*, user.email, user.toward_user_encrypt_key",
        "FROM ua",
        "   INNER JOIN user ON user.id_= ua.user",
        "   INNER JOIN sim ON sim.user= user.id_",
        "WHERE sim.id_= @sim_ref AND @is_sim_owned",
        ";",
        "SELECT",
        "   ua.*, user.email, user.toward_user_encrypt_key",
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
    const queryResults = await exports.query(sql, { "email": auth.shared.email, imsi });
    queryResults.shift();
    const affectedUas = [];
    for (const row of [...queryResults[3], ...queryResults[4]]) {
        affectedUas.push({
            "instance": row["instance"],
            "userEmail": row["email"],
            "towardUserEncryptKeyStr": row["toward_user_encrypt_key"],
            "platform": row["platform"],
            "pushToken": row["push_token"],
            "messagesEnabled": f.bool.dec(row["messages_enabled"])
        });
    }
    return {
        affectedUas,
        "owner": {
            "user": queryResults[0][0]["sim_owner"],
            "shared": { "email": queryResults[2][0]["sim_owner_email"] }
        }
    };
}
exports.unregisterSim = unregisterSim;
/** assert emails not empty, return affected user email */
async function shareSim(auth, imsi, emails, sharingRequestMessage) {
    if (LOG_QUERY_DURATION) {
        debug("shareSim");
    }
    emails = emails
        .map(email => email.toLowerCase())
        .filter(email => email !== auth.shared.email);
    if (emails.length === 0) {
        throw new Error("assert email not empty and not sharing sim owned");
    }
    const sql = [
        "SELECT @sim_ref:=NULL;",
        "SELECT @sim_ref:= id_",
        "FROM sim",
        `WHERE imsi= ${exports.esc(imsi)} AND user= ${exports.esc(auth.user)}`,
        ";",
        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not own sim')",
        ";",
        "INSERT IGNORE INTO user",
        "   (email, salt, digest, toward_user_encrypt_key, sym_key_enc, creation_date, ip)",
        "VALUES",
        emails.map(email => `   ( ${exports.esc(email)}, '', '', '', '', 0, '')`).join(",\n"),
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
        "SELECT * from _user",
        ";",
        "DROP TABLE _user"
    ].join("\n");
    const queryResults = await exports.query(sql, { imsi, "email": [auth.shared.email, ...emails] });
    const userRows = queryResults[queryResults.length - 2];
    const affectedUsers = {
        "registered": [],
        "notRegistered": []
    };
    for (const row of userRows) {
        const auth = {
            "user": row["id_"],
            "shared": { "email": row["email"] }
        };
        if (row["is_registered"] === 1) {
            affectedUsers.registered.push(auth);
        }
        else {
            affectedUsers.notRegistered.push(auth.shared.email);
        }
    }
    return affectedUsers;
}
exports.shareSim = shareSim;
/** Return no longer registered UAs, assert email list not empty*/
async function stopSharingSim(auth, imsi, emails) {
    if (LOG_QUERY_DURATION) {
        debug("stopSharingSim");
    }
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
        "       user.toward_user_encrypt_key,",
        "       user_sim.friendly_name IS NOT NULL as is_confirmed",
        "   FROM user_sim",
        "   INNER JOIN user ON user.id_= user_sim.user",
        `   WHERE user_sim.sim= @sim_ref AND (${emails.map(email => `user.email= ${exports.esc(email)}`).join(" OR ")})`,
        ")",
        ";",
        "SELECT ua.*, _user_sim.email, _user_sim.toward_user_encrypt_key, @ua_found:= 1",
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
        "INNER JOIN _user_sim ON _user_sim.id_= user_sim.id_",
        ";",
        "DROP TABLE _user_sim"
    ].join("\n");
    const queryResults = await exports.query(sql, { imsi, "email": auth.shared.email });
    queryResults.shift();
    const uaRows = queryResults[4];
    const noLongerRegisteredUas = [];
    for (const row of uaRows) {
        noLongerRegisteredUas.push({
            "instance": row["instance"],
            "userEmail": row["email"],
            "towardUserEncryptKeyStr": row["toward_user_encrypt_key"],
            "platform": row["platform"],
            "pushToken": row["push_token"],
            "messagesEnabled": f.bool.dec(row["messages_enabled"])
        });
    }
    return noLongerRegisteredUas;
}
exports.stopSharingSim = stopSharingSim;
/** Return user UAs */
async function setSimFriendlyName(auth, imsi, friendlyName) {
    if (LOG_QUERY_DURATION) {
        debug("setSimFriendlyName");
    }
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
        "SELECT ua.*, user.email, user.toward_user_encrypt_key",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        `WHERE user= ${exports.esc(auth.user)}`
    ].join("\n");
    const queryResults = await exports.query(sql, { imsi, "email": auth.shared.email });
    const uaRows = queryResults.pop();
    const userUas = [];
    for (const row of uaRows) {
        userUas.push({
            "instance": row["instance"],
            "userEmail": row["email"],
            "towardUserEncryptKeyStr": row["toward_user_encrypt_key"],
            "platform": row["platform"],
            "pushToken": row["push_token"],
            "messagesEnabled": f.bool.dec(row["messages_enabled"])
        });
    }
    return userUas;
}
exports.setSimFriendlyName = setSimFriendlyName;
async function getSimOwner(imsi) {
    if (LOG_QUERY_DURATION) {
        debug("getSimOwner");
    }
    let rows = await exports.query([
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
            "shared": { "email": rows[0]["email"] }
        };
    }
}
exports.getSimOwner = getSimOwner;
