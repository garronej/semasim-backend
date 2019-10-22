import * as crypto from "crypto";
import { AuthenticatedSessionDescriptorWithoutConnectSid, UserAuthentication } from "./web/sessionManager";
import { geoiplookup } from "../tools/geoiplookup";
import { types as gwTypes } from "../gateway";
import * as f from "../tools/mysqlCustom";
import * as ttTesting from "transfer-tools/dist/lib/testing";
const uuidv3 = require("uuid/v3");

import { types as dcTypes } from "chan-dongle-extended-client";
import { types as feTypes } from "../frontend";
import * as logger from "logger";
import { deploy } from "../deploy";

const debug = logger.debugFactory();

const LOG_QUERY_DURATION: boolean = false;

//TODO: For better lock each time providing user provide also email.

/** exported only for tests */
export let query: f.Api["query"];
export let esc: f.Api["esc"];
let buildInsertQuery: f.Api["buildInsertQuery"];
export let end: f.Api["end"];


/** Must be called and before use */
export function launch() {

    const api = f.createPoolAndGetApi({
        ...deploy.dbAuth.value!,
        "database": "semasim"
    }, "HANDLE STRING ENCODING");

    query = LOG_QUERY_DURATION ?
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

    esc = api.esc;
    buildInsertQuery = api.buildInsertQuery;

    end= api.end;

}

/** For test purpose only */
export async function flush() {
    await query([
        "DELETE FROM user;",
        "DELETE FROM dongle;",
        "DELETE FROM gateway_location;"
    ].join("\n"));
}

namespace rmd160 {

    async function hash(secret: string, salt: string): Promise<{ digest: string; }> {

        const start = Date.now();

        const out = {
            "digest": crypto.createHash("rmd160")
                .update(`${secret}${salt}`)
                .digest("hex")
        };

        //NOTE: Protection against timing attack.
        await new Promise(resolve => setTimeout(
            resolve,
            Math.floor(
                Math.random() * Math.min(50, Date.now() - start)
            )
        ));

        return out;

    }

    export async function generateSaltAndHash(secret: string): Promise<{ salt: string; digest: string; }> {

        const salt = crypto.randomBytes(8).toString("hex");

        return {
            salt,
            ...await hash(secret, salt)
        };

    }

    export async function isValidSecret(
        secret: string,
        salt: string,
        expectedDigest: string
    ): Promise<boolean> {

        return (await hash(secret, salt)).digest === expectedDigest;

    }

}

/** 
 * User not yet registered but that already exist in the database 
 * are created by the shareSim function
 * those user have no salt and no password and does not need to verify their email.
 * */
export async function createUserAccount(
    email: string,
    secret: string,
    towardUserEncryptKeyStr: string,
    encryptedSymmetricKey: string,
    ip: string
): Promise<{ user: number; activationCode: string | null; } | undefined> {

    if( LOG_QUERY_DURATION ){
        debug("createUserAccount");
    }

    const { salt, digest } = await rmd160.generateSaltAndHash(secret);

    let activationCode: string | null = ttTesting.genDigits(4);

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
        ].map(value => esc(value))
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

    const res = await query(sql, { email });

    const { insertId } = res[1];

    if (insertId === 0) {
        return undefined;
    } else {

        const user = insertId;

        if (res[2][0]["update_record"] !== null) {

            activationCode = null;

        }

        return { user, activationCode };

    }

}

/** 
 * Return true if the account was validated
 * False may occur if the user try to validate again
 * an email that have been validated already.
 */
export async function validateUserEmail(
    email: string,
    activationCode: string
): Promise<boolean> {

    if( LOG_QUERY_DURATION ){
        debug("validateUserEmail");
    }

    email = email.toLowerCase();

    const sql = [
        `UPDATE user `,
        `SET activation_code=NULL`,
        `WHERE activation_code=${esc(activationCode)}`
    ].join("\n");

    const { affectedRows } = await query(sql, { email });

    return affectedRows === 1;

}

/** Return user.id_ or undefined if auth failed */
export async function authenticateUser(
    email: string,
    secret: string
): Promise<{
    status: "SUCCESS";
    webUaAuthenticatedSessionDescriptorWithoutConnectSid: 
    Omit<AuthenticatedSessionDescriptorWithoutConnectSid, "shared"> & 
    { shared: Omit<AuthenticatedSessionDescriptorWithoutConnectSid["shared"], "uaInstanceId">  & { webUaInstanceId: string; } };
} | {
    status: "NO SUCH ACCOUNT";
} | {
    status: "WRONG PASSWORD";
    retryDelay: number;
} | {
    status: "RETRY STILL FORBIDDEN"
    retryDelayLeft: number;
} | {
    status: "NOT VALIDATED YET"
}> {

    if( LOG_QUERY_DURATION ){
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
        `FROM user WHERE email= ${esc(email)}`
    ].join("\n")

    const rows = await query(sql, { email });

    if (!rows.length || rows[0]["salt"] === "") {

        return { "status": "NO SUCH ACCOUNT" };

    }

    const [row] = rows;

    if (row["activation_code"] !== null) {

        return { "status": "NOT VALIDATED YET" };

    }

    let retryDelay: number | undefined = undefined;

    if (row["forbidden_retry_delay"] !== null) {

        retryDelay = row["forbidden_retry_delay"] as number;

        const retryDelayLeft = row["last_attempt_date"] + retryDelay - Date.now();

        if (retryDelayLeft > 0) {

            return {
                "status": "RETRY STILL FORBIDDEN",
                retryDelayLeft
            };

        }

    }

    const user: number = row["id_"];

    if (await rmd160.isValidSecret(secret, row["salt"], row["digest"])) {

        if (retryDelay !== undefined) {

            const sql = buildInsertQuery("user", {
                "id_": user,
                "forbidden_retry_delay": null,
                "last_attempt_date": null
            }, "UPDATE");

            await query(sql, { email });

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

    } else {

        const newRetryDelay = Math.min(
            retryDelay !== undefined ? retryDelay * 2 : 1000,
            60000
        );

        const sql = buildInsertQuery("user", {
            "id_": user,
            "forbidden_retry_delay": newRetryDelay,
            "last_attempt_date": Date.now()
        }, "UPDATE");

        await query(sql, { email });

        return {
            "status": "WRONG PASSWORD",
            "retryDelay": newRetryDelay
        };

    }

}

/**Work for account that have been automatically created due to sharing request. */
export async function setPasswordRenewalToken(email: string): Promise<string | undefined> {

    if( LOG_QUERY_DURATION ){
        debug("setPasswordRenewalToken");
    }

    email = email.toLowerCase();

    const token = crypto.randomBytes(16).toString("hex");

    const sql = [
        `UPDATE user`,
        `SET password_renewal_token=${esc(token)}`,
        `WHERE email=${esc(email)}`
    ].join("\n");

    const { affectedRows } = await query(sql, { email });

    return (affectedRows === 1) ? token : undefined;

}

export async function renewPassword(
    email: string,
    newSecret: string,
    newTowardUserEncryptKeyStr: string,
    newEncryptedSymmetricKey: string,
    token: string
): Promise<{ wasTokenStillValid: true; user: number; } | { wasTokenStillValid: false; }> {

    if( LOG_QUERY_DURATION ){
        debug("renewPassword");
    }

    const { digest, salt } = await rmd160.generateSaltAndHash(newSecret);

    const sql = [
        `SELECT @user_ref:=NULL;`,
        `SELECT @user_ref:=id_ as id_`,
        `FROM user`,
        `WHERE password_renewal_token=${esc(token)} AND email=${esc(email)}`,
        `;`,
        `UPDATE user`,
        `SET`,
        `salt=${esc(salt)},`,
        `digest=${esc(digest)},`,
        `toward_user_encrypt_key=${esc(newTowardUserEncryptKeyStr)},`,
        `sym_key_enc=${esc(newEncryptedSymmetricKey)},`,
        `last_attempt_date= NULL,`,
        `forbidden_retry_delay= NULL,`,
        `password_renewal_token= NULL`,
        `WHERE id_=@user_ref`,
        `;`
    ].join("\n");

    const res = await query(sql, { email });

    return res[2].affectedRows === 1 ?
        {
            "wasTokenStillValid": true,
            "user": res[1][0]["id_"]
        } : {
            "wasTokenStillValid": false
        };

}


//TODO: Implement and when it's done enforce providing email for lock.
export async function deleteUser(
    auth: UserAuthentication
): Promise<boolean> {

    if( LOG_QUERY_DURATION ){
        debug("deleteUser");
    }

    const sql = `DELETE FROM user WHERE id_ = ${esc(auth.user)}`;

    const { affectedRows } = await query(sql, { "email": auth.shared.email });

    const isDeleted = affectedRows !== 0;

    return isDeleted;

}

/** Only request that is make with two SQL queries */
export async function addGatewayLocation(ip: string) {

    if( LOG_QUERY_DURATION ){
        debug("addGatewayLocation");
    }

    const { insertId } = await query(
        buildInsertQuery("gateway_location", { ip, "country_iso": null, "subdivisions": null, "city": null }, "IGNORE"),
        { ip }
    );

    if (!insertId) {
        return;
    }

    try {

        const { countryIso, subdivisions, city } = await geoiplookup(ip);

        const sql = buildInsertQuery("gateway_location", {
            ip,
            "country_iso": countryIso || null,
            "subdivisions": subdivisions || null,
            "city": city || null
        }, "UPDATE");

        await query(sql, { ip });

    } catch (error) {

        debug(`Lookup id failed ${ip}`, error.message);

        return;

    }

}

/** 
 *  returns locked dongles with unreadable SIM iccid,
 *  locked dongles with readable iccid registered by user
 *  active dongles not registered
 */
export async function filterDongleWithRegistrableSim(
    auth: UserAuthentication,
    dongles: Iterable<dcTypes.Dongle>
): Promise<dcTypes.Dongle[]> {

    if( LOG_QUERY_DURATION ){
        debug("filterDongleWithRegistrableSim");
    }

    let registrableDongles: dcTypes.Dongle[] = [];
    const dongleWithReadableIccid: dcTypes.Dongle[] = []

    for (let dongle of dongles) {

        if (!dongle.sim.iccid) {
            registrableDongles.push(dongle);
        } else {
            dongleWithReadableIccid.push(dongle);
        }

    }

    if (!dongleWithReadableIccid.length) {
        return registrableDongles;
    }

    let rows = await query([
        "SELECT iccid, user",
        "FROM sim",
        "WHERE",
        dongleWithReadableIccid.map(({ sim }) => `iccid= ${esc(sim.iccid!)}`).join(" OR ")
    ].join("\n"), { "email": auth.shared.email });

    let userByIccid: { [iccid: string]: number } = {};

    for (let { iccid, user } of rows) {
        userByIccid[iccid] = user;
    }

    registrableDongles = [
        ...registrableDongles,
        ...dongleWithReadableIccid.filter(
            dongle => {

                let registeredBy = userByIccid[dongle.sim.iccid!];

                if (!registeredBy) {
                    return true;
                } else {
                    return (registeredBy === auth.user) && dcTypes.Dongle.Locked.match(dongle);
                }

            }
        )
    ];

    return registrableDongles;

}

export async function updateSimStorage(
    imsi: string, storage: dcTypes.Sim.Storage
): Promise<void> {

    if( LOG_QUERY_DURATION ){
        debug("updateSimStorage");
    }

    let sql = [
        "SELECT @sim_ref:=NULL;",
        `SELECT @sim_ref:=id_ FROM sim WHERE imsi=${esc(imsi)};`,
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
            `SELECT @new_name:=${esc(name)};`,
            [
                `SELECT @new_name:=name FROM contact WHERE`,
                `sim=@sim_ref AND mem_index IS NOT NULL AND mem_index=${esc(index)} AND name_as_stored=${esc(name)} AND number_raw=${esc(number)};`,
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

    if( storage.contacts.length !== 0 ){

        sql += ` AND mem_index NOT IN (${storage.contacts.map(({ index }) => `${index}`).join(", ")})`;

    }

    await query(sql, { imsi });

}

//TODO: Test!
export async function getUserUas(email: string): Promise<gwTypes.Ua[]> {

    if( LOG_QUERY_DURATION ){
        debug("getUserUa");
    }

    email = email.toLowerCase();

    const sql = [
        "SELECT ua.*, user.toward_user_encrypt_key",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        `WHERE user.email=${esc(email)}`,
    ].join("\n");

    const uas: gwTypes.Ua[] = [];

    const rows = await query(sql);

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

/** 
 * Asserts: 
 * 1) The sql query will will not be updated after.
 * 2) @sim_ref is set to the sim id_ if NULL parse returns empty array.
 * 
 * Note before making any changes check setSimOffline function that
 * use this in a totally implementation dependent fashion. ( ugly I know )
 *
 */
namespace retrieveUasRegisteredToSim {

    export const sql = [
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

    export function parse(queryResults: any): gwTypes.Ua[] {

        const uasRegisteredToSim: gwTypes.Ua[] = [];

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



}

/** Return UAs registered to sim */
export async function createOrUpdateSimContact(
    imsi: string,
    name: string,
    number_raw: string,
    storageInfos?: {
        mem_index: number;
        name_as_stored: string;
        new_storage_digest: string;
    }
): Promise<gwTypes.Ua[]> {

    if( LOG_QUERY_DURATION ){
        debug("createOrUpdateSimContact");
    }

    let sql = [
        "SELECT @sim_ref:=NULL, @contact_ref:=NULL;",
        `SELECT @sim_ref:=id_ FROM sim WHERE imsi=${esc(imsi)};`,
        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'SIM should be registered');",
        ""
    ].join("\n");

    if (!!storageInfos) {

        const { mem_index, name_as_stored, new_storage_digest } = storageInfos;

        sql += [
            "SELECT @contact_ref:=id_",
            "FROM contact",
            `WHERE sim=@sim_ref AND mem_index=${esc(mem_index)}`,
            ";",
            "UPDATE sim",
            `SET storage_left=storage_left-1`,
            "WHERE id_=@sim_ref AND @contact_ref IS NULL",
            ";",
            "UPDATE sim",
            `SET storage_digest=${esc(new_storage_digest)}`,
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

    } else {

        sql += [
            "SELECT @contact_ref:= id_",
            "FROM contact",
            `WHERE sim=@sim_ref AND mem_index IS NULL AND number_raw=${esc(number_raw)}`,
            ";",
            "UPDATE contact",
            `SET name=${esc(name)}`,
            "WHERE @contact_ref IS NOT NULL AND id_=@contact_ref",
            ";",
            "INSERT INTO contact (sim, number_raw, name)",
            `SELECT @sim_ref, ${esc(number_raw)}, ${esc(name)}`,
            "FROM DUAL WHERE @contact_ref IS NULL",
            ";"
        ].join("\n");

    }

    sql += retrieveUasRegisteredToSim.sql;

    const queryResults = await query(sql, { imsi });

    return retrieveUasRegisteredToSim.parse(queryResults);

}

/** Return UAs registered to sim */
export async function deleteSimContact(
    imsi: string,
    contactRef: { mem_index: number; new_storage_digest: string; } | { number_raw: string; }
): Promise<gwTypes.Ua[]> {

    if( LOG_QUERY_DURATION ){
        debug("deleteSimContact");
    }

    let sql = [
        "SELECT @sim_ref:=NULL;",
        `SELECT @sim_ref:=id_ FROM sim WHERE imsi=${esc(imsi)};`,
        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'SIM should be registered');",
        ""
    ].join("\n");

    if ("mem_index" in contactRef) {

        const { mem_index, new_storage_digest } = contactRef;

        sql += [
            `DELETE FROM contact WHERE sim=@sim_ref AND mem_index=${esc(mem_index)};`,
            `UPDATE sim SET storage_left=storage_left+1, storage_digest=${esc(new_storage_digest)} WHERE id_=@sim_ref;`,
        ].join("\n");

    } else {

        const { number_raw } = contactRef;

        sql += `DELETE FROM contact WHERE sim=@sim_ref AND number_raw=${esc(number_raw)};`;

    }

    sql += retrieveUasRegisteredToSim.sql;

    const queryResults = await query(sql, { imsi });

    return retrieveUasRegisteredToSim.parse(queryResults);

}

/** return user UAs */
export async function registerSim(
    auth: UserAuthentication,
    sim: dcTypes.Sim,
    friendlyName: string,
    password: string,
    towardSimEncryptKeyStr: string,
    dongle: feTypes.UserSim["dongle"],
    gatewayIp: string,
    isGsmConnectivityOk: boolean,
    cellSignalStrength: dcTypes.Dongle.Usable.CellSignalStrength
): Promise<gwTypes.Ua[]> {

    if( LOG_QUERY_DURATION ){
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
        `WHERE imei= ${esc(dongle.imei)}`,
        ";",
        "SELECT @gateway_location_ref:= id_",
        "FROM gateway_location",
        `WHERE ip= ${esc(gatewayIp)}`,
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
        `WHERE imsi= ${esc(sim.imsi)}`,
        ";"
    ].join("\n");

    sql += buildInsertQuery(
        "contact",
        sim.storage.contacts.map(contact => ({
            "sim": { "@": "sim_ref" },
            "mem_index": contact.index,
            "number_raw": contact.number,
            "name_as_stored": contact.name,
            "name": contact.name
        })),
        "THROW ERROR"
    );

    sql += [
        "SELECT ua.*, user.email, user.toward_user_encrypt_key",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        `WHERE user.id_= ${esc(auth.user)}`
    ].join("\n");

    const queryResults = await query(
        sql,
        { "email": auth.shared.email, "imsi": sim.imsi }
    );

    const userUas: gwTypes.Ua[] = [];

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

/** Return all the UAs registered to SIM */
export async function createUpdateOrDeleteOngoingCall(
    ongoingCallId: string,
    imsi: string,
    number: string,
    from: "DONGLE" | "SIP",
    isTerminated: boolean,
    uasInCall: gwTypes.UaRef[]
): Promise<gwTypes.Ua[]> {

    if( LOG_QUERY_DURATION ){
        debug("createUpdateOrDeleteOngoingCall");
    }


    let sql = [
        `SELECT @sim_ref:=NULL, @ongoing_call_ref:=NULL`,
        `;`,
        `SELECT @sim_ref:= id_ FROM sim WHERE imsi=${esc(imsi)}`,
        `;`,
        `SELECT _ASSERT(@sim_ref IS NOT NULL, 'SIM is not registered')`,
        `;`,
        `DELETE FROM ongoing_call WHERE sim=@sim_ref`,
        `;`
    ].join("\n");

    if( !isTerminated )  {

        sql += [
            buildInsertQuery("ongoing_call", {
                "ongoing_call_id": ongoingCallId,
                "sim": { "@": "sim_ref" },
                number,
                "is_from_sip": from === "SIP" ? 1 : 0
            }, "THROW ERROR"),
            `SELECT @ongoing_call_ref:=id_ FROM ongoing_call WHERE ongoing_call_id=${esc(ongoingCallId)}`,
            `;`,
            ...uasInCall.map(ua => [
                `SELECT @ua_ref:=NULL`,
                `;`,
                `SELECT @ua_ref:=ua.id_`,
                `FROM ua`,
                `INNER JOIN user ON user.id_=ua.user`,
                `WHERE ua.instance=${esc(ua.instance)} AND user.email=${esc(ua.userEmail)}`,
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

    const queryResults = await query(sql, { imsi });

    return retrieveUasRegisteredToSim.parse(queryResults);

}


export async function getUserSims(
    auth: UserAuthentication
): Promise<feTypes.UserSim[]> {

    if( LOG_QUERY_DURATION ){
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
        `WHERE sim.user= ${esc(auth.user)}`,
        ";", //0 SIM owned by the user
        "SELECT",
        "   sim.imsi,",
        "   contact.*",
        "FROM contact",
        "INNER JOIN sim ON sim.id_= contact.sim",
        `WHERE sim.user= ${esc(auth.user)}`,
        ";", //1 Contacts of the SIM owned by the user
        "SELECT",
        "   sim.imsi,",
        "   user.email,",
        "   user_sim.friendly_name IS NOT NULL AS is_confirmed",
        "FROM sim",
        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
        "INNER JOIN user ON user.id_= user_sim.user",
        `WHERE sim.user= ${esc(auth.user)}`,
        ";", //2 Emails of users with who the user making the request share the sim that he owns.
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
        `WHERE user_sim.user= ${esc(auth.user)}`,
        ";", //3 Sims that have been shared with the user. ( sim he does not own )
        "SELECT",
        "   sim.imsi,",
        "   contact.*",
        "FROM contact",
        "INNER JOIN sim ON sim.id_= contact.sim",
        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
        `WHERE user_sim.user= ${esc(auth.user)}`,
        ";", //4 Contact of the sims that have been shared with the user
        `SELECT sim.imsi, user.email`,
        `FROM sim`,
        `INNER JOIN user_sim ON user_sim.sim=sim.id_`,
        `INNER JOIN user ON user.id_=user_sim.user`,
        `WHERE`,
        `    user_sim.user<>${esc(auth.user)} AND`,
        `    user_sim.friendly_name IS NOT NULL AND`,
        `    sim.id_ IN (SELECT sim`,
        `                FROM user_sim`,
        `                WHERE user=${esc(auth.user)} AND friendly_name IS NOT NULL)`,
        `;`, //5 Email of other user also sharing the SIM that have been shared with the user ( excluding the SIM owner )
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
        `                      ( user_sim.user=${esc(auth.user)} OR sim.user=${esc(auth.user)} ))`,
        ``//6 Ongoing calls for all the sim the user have access to ( owned and the sim that have been shared with him )
    ].join("\n");

    const queryResults = await query(sql, { "email": auth.shared.email });

    const emailsOfUserSharingSimOwned = (() => {

        const rows = queryResults[2];

        const out: {
            [imsi: string]: feTypes.SimOwnership.Owned["sharedWith"]
        } = {};

        for (const row of rows) {

            const imsi = row["imsi"];

            if (!out[imsi]) {
                out[imsi] = {
                    "confirmed": [],
                    "notConfirmed": []
                };
            }

            out[imsi][
                row["is_confirmed"] === 1 ? "confirmed" : "notConfirmed"
            ].push(row["email"]);

        }

        return out;

    })();

    const emailsOfUsersAlsoSharingSimNotOwned = (() => {

        const rows = queryResults[5];

        const out: {
            [imsi: string]: feTypes.SimOwnership.Shared["otherUserEmails"]
        } = {};

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

        const out: {
            [imsi: string]: feTypes.OngoingCall;
        } = {};

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

    const storageContactsBySim: { [imsi: string]: dcTypes.Sim.Contact[]; } = {};
    const phonebookBySim: { [imsi: string]: feTypes.UserSim.Contact[]; } = {};

    for (const row of [...queryResults[1], ...queryResults[4]]) {

        let imsi = row["imsi"];

        const mem_index: number | undefined =
            row["mem_index"] !== null ? row["mem_index"] : undefined;

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



    const userSims: feTypes.UserSim[] = [];

    for (const row of [...queryResults[0], ...queryResults[3]]) {

        const sim: dcTypes.Sim = {
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

        const dongle: feTypes.UserSim["dongle"] = {
            "imei": row["imei"],
            "isVoiceEnabled": f.bool.dec(row["is_voice_enabled"]),
            "manufacturer": row["manufacturer"],
            "model": row["model"],
            "firmwareVersion": row["firmware_version"]
        };

        const gatewayLocation: feTypes.UserSim.GatewayLocation = {
            "ip": row["ip"],
            "countryIso": row["gw_country_iso"] || undefined,
            "subdivisions": row["subdivisions"] || undefined,
            "city": row["city"] || undefined
        };

        const [friendlyName, ownership] = ((): [string, feTypes.SimOwnership] => {

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

            } else {

                let friendlyName: string | null = row["user_friendly_name"];

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

                } else {

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

        const userSim: feTypes.UserSim = {
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


export async function addOrUpdateUa(
    ua: Omit<gwTypes.Ua, "towardUserEncryptKeyStr">
) {

    if( LOG_QUERY_DURATION ){
        debug("addOrUpdateUa");
    }

    const sql = addOrUpdateUa.getQuery(ua);

    await query(sql, { "email": ua.userEmail });

}

export namespace addOrUpdateUa {

    export function getQuery(
        ua: Omit<gwTypes.Ua, "towardUserEncryptKeyStr">
    ): string {
        return [
            "INSERT INTO ua",
            "   (instance, user, platform, push_token, messages_enabled)",
            "SELECT",
            [
                esc(ua.instance),
                "id_",
                esc(ua.platform),
                esc(ua.pushToken),
                f.bool.enc(ua.messagesEnabled)
            ].join(", "),
            `FROM user WHERE email= ${esc(ua.userEmail)}`,
            "ON DUPLICATE KEY UPDATE",
            [
                "platform",
                "push_token",
                "messages_enabled"
            ].map(key => `    ${key}= VALUES(${key})`).join(",\n")
        ].join("\n");
    }

}

export async function changeSimGsmConnectivityOrSignal(
    imsi: string,
    p:
        { isGsmConnectivityOk: boolean; } |
        { cellSignalStrength: dcTypes.Dongle.Usable.CellSignalStrength; }
): Promise<{
    isSimRegistered: false;
} | {
    isSimRegistered: true;
    uasRegisteredToSim: gwTypes.Ua[];
}> {

    if( LOG_QUERY_DURATION ){
        debug("changeSimGsmConnectivityOrSignal");
    }

    const sql = [
        `SELECT @sim_ref:=NULL;`,
        `SELECT @sim_ref:= id_ FROM sim WHERE imsi=${esc(imsi)};`,
        "UPDATE sim",
        "SET",
        "isGsmConnectivityOk" in p ?
            `   is_gsm_connectivity_ok=${esc(f.bool.enc(p.isGsmConnectivityOk))}` :
            `   cell_signal_strength=${esc(p.cellSignalStrength)}`,
        "WHERE id_= @sim_ref",
        ";",
        retrieveUasRegisteredToSim.sql
    ].join("\n");

    const queryResults = await query(sql, { imsi });

    queryResults.shift();

    if (queryResults[0].length === 0) {
        return { "isSimRegistered": false };
    }

    return {
        "isSimRegistered": true,
        "uasRegisteredToSim": retrieveUasRegisteredToSim.parse(queryResults)
    };

}

export async function setSimOnline(
    imsi: string,
    password: string,
    replacementPassword: string,
    towardSimEncryptKeyStr: string,
    gatewayAddress: string,
    dongle: feTypes.UserSim["dongle"],
    isGsmConnectivityOk: boolean,
    cellSignalStrength: dcTypes.Dongle.Usable.CellSignalStrength
): Promise<{
    isSimRegistered: false;
} | {
    isSimRegistered: true;
    storageDigest: string;
    passwordStatus: "UNCHANGED" | "WAS DIFFERENT" | "PASSWORD REPLACED";
    gatewayLocation: feTypes.UserSim.GatewayLocation;
    uasRegisteredToSim: gwTypes.Ua[];
}> {

    if( LOG_QUERY_DURATION ){
        debug("setSimOnline");
    }

    const sql = [
        `SELECT @sim_ref:=NULL, @password_status:=NULL, @dongle_ref:=NULL, @gateway_location_ref:=NULL;`,
        `SELECT`,
        `@sim_ref:= id_,`,
        `storage_digest,`,
        `@password_status:=IF(need_password_renewal,'PASSWORD REPLACED',IF(password=${esc(password)},'UNCHANGED','WAS DIFFERENT')) AS password_status`,
        "FROM sim",
        `WHERE imsi=${esc(imsi)}`,
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
        `WHERE ip=${esc(gatewayAddress)}`,
        ";",
        "UPDATE sim",
        "SET",
        "   is_online=1,",
        `   password=IF(@password_status='PASSWORD REPLACED',${esc(replacementPassword)},${esc(password)}),`,
        `   toward_sim_encrypt_key=${esc(towardSimEncryptKeyStr)},`,
        "   dongle=@dongle_ref,",
        "   gateway_location=@gateway_location_ref,",
        "   need_password_renewal=0,",
        `   is_gsm_connectivity_ok=${esc(f.bool.enc(isGsmConnectivityOk))},`,
        `   cell_signal_strength=${esc(cellSignalStrength)}`,
        "WHERE id_= @sim_ref",
        ";",
        "DELETE FROM ongoing_call WHERE sim=@sim_ref",
        ";",
        retrieveUasRegisteredToSim.sql
    ].join("\n");

    const queryResults = await query(
        sql,
        { imsi, "ip": gatewayAddress }
    );

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

export async function setAllSimOffline(
    imsis?: string[]
): Promise<void> {

    if( LOG_QUERY_DURATION ){
        debug("setAllSimOffline");
    }

    if( imsis !== undefined && imsis.length === 0 ){
        return;
    }

    const sql = [
        `LOCK TABLES sim WRITE;`,
        `UPDATE sim`,
        `SET is_online=0`,
        //`WHERE ${!imsis ? `1` : imsis.map(imsi => `imsi=${esc(imsi)}`).join(" OR ")}`,
        `WHERE ${!imsis ? `1` : `imsi IN (${imsis.map(imsi => esc(imsi)).join(", ")})`}`,
        `;`,
        `UNLOCK TABLES;`
    ].join("\n");

    await query(sql);

}


//TODO: This function is only partially tested!!!
/** Return all ua registered to sim by by imsi */
export async function setSimsOffline(
    imsis: string[]
): Promise<{ [imsi: string]: gwTypes.Ua[]; }> {

    if( LOG_QUERY_DURATION ){
        debug("setSimsOffline");
    }

    if (imsis.length === 0) {
        return {};
    }

    let sql= [
    `UPDATE sim SET is_online= 0 WHERE imsi IN (${imsis.map(imsi => esc(imsi)).join(", ")})`,
    `;`
    ].join("\n");

    for (const imsi of imsis) {

        sql += [
            `SELECT @sim_ref:=NULL`,
            `;`,
            `SELECT @sim_ref:=id_ FROM sim WHERE imsi= ${esc(imsi)}`,
            `;`,
            retrieveUasRegisteredToSim.sql,
            `;`
        ].join("\n");

    }

    const queryResults = await query(sql, { "imsi": imsis });

    const out: { [imsi: string]: gwTypes.Ua[]; } = {};

    for (let i = imsis.length - 1; i >= 0; i--) {

        const imsi = imsis[i];

        out[imsi] = retrieveUasRegisteredToSim.parse(queryResults);

        queryResults.pop();
        queryResults.pop();

    }

    return out;

}

export async function unregisterSim(
    auth: UserAuthentication,
    imsi: string
): Promise<{ affectedUas: gwTypes.Ua[]; owner: UserAuthentication; }> {

    if( LOG_QUERY_DURATION ){
        debug("unregisterSim");
    }

    const sql = [
        `SELECT @sim_ref:=NULL, @is_sim_owned:=NULL, @sim_owner:=NULL;`,
        `SELECT @sim_ref:= sim.id_, @is_sim_owned:=sim.user=${esc(auth.user)}, @sim_owner:=sim.user AS sim_owner`,
        "FROM sim",
        "LEFT JOIN user_sim ON user_sim.sim= sim.id_",
        "WHERE",
        `sim.imsi= ${esc(imsi)} AND ( sim.user= ${esc(auth.user)} OR user_sim.user= ${esc(auth.user)})`,
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
        `   AND ( @is_sim_owned OR user.id_= ${esc(auth.user)})`,
        ";",
        "DELETE FROM sim WHERE id_= @sim_ref AND @is_sim_owned",
        ";",
        "DELETE FROM user_sim",
        `WHERE sim= @sim_ref AND user= ${esc(auth.user)} AND NOT @is_sim_owned`
    ].join("\n");

    const queryResults = await query(sql, { "email": auth.shared.email, imsi });

    queryResults.shift();

    const affectedUas: gwTypes.Ua[] = [];

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

/** assert emails not empty, return affected user email */
export async function shareSim(
    auth: UserAuthentication,
    imsi: string,
    emails: string[],
    sharingRequestMessage: string | undefined
): Promise<{
    registered: UserAuthentication[];
    notRegistered: string[]; /** list of emails */
}> {

    if( LOG_QUERY_DURATION ){
        debug("shareSim");
    }

    emails = emails
        .map(email => email.toLowerCase())
        .filter(email => email !== auth.shared.email)
        ;

    if (emails.length === 0) {
        throw new Error("assert email not empty and not sharing sim owned");
    }

    const sql = [
        "SELECT @sim_ref:=NULL;",
        "SELECT @sim_ref:= id_",
        "FROM sim",
        `WHERE imsi= ${esc(imsi)} AND user= ${esc(auth.user)}`,
        ";",
        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not own sim')",
        ";",
        "INSERT IGNORE INTO user",
        "   (email, salt, digest, toward_user_encrypt_key, sym_key_enc, creation_date, ip)",
        "VALUES",
        emails.map(email => `   ( ${esc(email)}, '', '', '', '', 0, '')`).join(",\n"),
        ";",
        "DROP TABLE IF EXISTS _user",
        ";",
        "CREATE TEMPORARY TABLE _user AS (",
        "   SELECT user.id_, user.email, user.salt<> '' AS is_registered",
        "   FROM user",
        "   LEFT JOIN user_sim ON user_sim.user= user.id_",
        `   WHERE ${emails.map(email => `user.email= ${esc(email)}`).join(" OR ")}`,
        "   GROUP BY user.id_",
        "   HAVING COUNT(user_sim.id_)=0 OR SUM(user_sim.sim= @sim_ref)=0",
        ")",
        ";",
        "INSERT INTO user_sim",
        "   (user, sim, friendly_name, sharing_request_message)",
        "SELECT",
        `   id_, @sim_ref, NULL, ${esc(sharingRequestMessage || null)}`,
        "FROM _user",
        ";",
        "SELECT * from _user",
        ";",
        "DROP TABLE _user"
    ].join("\n");

    const queryResults = await query(
        sql,
        { imsi, "email": [auth.shared.email, ...emails] }
    );

    const userRows = queryResults[queryResults.length - 2];

    const affectedUsers = {
        "registered": [] as UserAuthentication[],
        "notRegistered": [] as string[]
    };

    for (const row of userRows) {

        const auth: UserAuthentication = {
            "user": row["id_"],
            "shared": { "email": row["email"] }
        };

        if (row["is_registered"] === 1) {
            affectedUsers.registered.push(auth);
        } else {
            affectedUsers.notRegistered.push(auth.shared.email);
        }

    }

    return affectedUsers;

}

/** Return no longer registered UAs, assert email list not empty*/
export async function stopSharingSim(
    auth: UserAuthentication,
    imsi: string,
    emails: string[]
): Promise<gwTypes.Ua[]> {

    if( LOG_QUERY_DURATION ){
        debug("stopSharingSim");
    }

    emails = emails.map(email => email.toLowerCase());

    //TODO: See if JOIN work on temporary table
    const sql = [
        "SELECT @sim_ref:=NULL, @ua_found:=NULL;",
        "SELECT @sim_ref:= id_",
        "FROM sim",
        `WHERE imsi= ${esc(imsi)} AND user= ${esc(auth.user)}`,
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
        `   WHERE user_sim.sim= @sim_ref AND (${emails.map(email => `user.email= ${esc(email)}`).join(" OR ")})`,
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

    const queryResults = await query(
        sql,
        { imsi, "email": auth.shared.email }
    );

    queryResults.shift();

    const uaRows = queryResults[4];

    const noLongerRegisteredUas: gwTypes.Ua[] = [];

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

/** Return user UAs */
export async function setSimFriendlyName(
    auth: UserAuthentication,
    imsi: string,
    friendlyName: string
): Promise<gwTypes.Ua[]> {

    if( LOG_QUERY_DURATION ){
        debug("setSimFriendlyName");
    }

    const sql = [
        `SELECT @sim_ref:=NULL, @is_sim_owned:=NULL;`,
        `SELECT @sim_ref:= sim.id_, @is_sim_owned:= sim.user= ${esc(auth.user)}`,
        "FROM sim",
        "LEFT JOIN user_sim ON user_sim.sim= sim.id_",
        `WHERE sim.imsi= ${esc(imsi)} AND ( sim.user= ${esc(auth.user)} OR user_sim.user= ${esc(auth.user)})`,
        "GROUP BY sim.id_",
        ";",
        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not have access to this SIM')",
        ";",
        "UPDATE sim",
        `SET friendly_name= ${esc(friendlyName)}`,
        "WHERE id_= @sim_ref AND @is_sim_owned",
        ";",
        "UPDATE user_sim",
        `SET friendly_name= ${esc(friendlyName)}, sharing_request_message= NULL`,
        `WHERE sim= @sim_ref AND user= ${esc(auth.user)} AND NOT @is_sim_owned`,
        ";",
        "SELECT ua.*, user.email, user.toward_user_encrypt_key",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        `WHERE user= ${esc(auth.user)}`
    ].join("\n");

    const queryResults = await query(
        sql,
        { imsi, "email": auth.shared.email }
    );

    const uaRows = queryResults.pop();

    const userUas: gwTypes.Ua[] = [];

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

export async function getSimOwner(
    imsi: string
): Promise<undefined | UserAuthentication> {

    if( LOG_QUERY_DURATION ){
        debug("getSimOwner");
    }

    let rows = await query([
        "SELECT user.*",
        "FROM user",
        "INNER JOIN sim ON sim.user= user.id_",
        `WHERE sim.imsi= ${esc(imsi)}`
    ].join("\n"), { imsi });

    if (!rows.length) {
        return undefined;
    } else {
        return {
            "user": rows[0]["id_"],
            "shared": { "email": rows[0]["email"] }
        }
    }

}
