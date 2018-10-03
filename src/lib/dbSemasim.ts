import * as RIPEMD160 from "ripemd160";
import * as crypto from "crypto";
import { Auth } from "./web/sessionManager";
import { geoiplookup } from "../tools/geoiplookup";
import { types as gwTypes } from "../semasim-gateway";
import * as f from "../tools/mysqlCustom";

import { types as dcTypes } from "chan-dongle-extended-client";
import { types as feTypes } from "../semasim-frontend";
import * as logger from "logger";

import * as i from "../bin/installer";

const debug = logger.debugFactory();

//TODO: For better lock each time providing user provide also email.

/** exported only for tests */
export let query: f.Api["query"];
export let esc: f.Api["esc"];
let buildInsertQuery: f.Api["buildInsertQuery"];

/** Must be called and before use */
export function launch(localAddress?: string): void {

    const api = f.createPoolAndGetApi({
        ...i.dbAuth,
        "database": "semasim",
        localAddress
    }, "HANDLE STRING ENCODING");

    query = api.query;
    esc = api.esc;
    buildInsertQuery = api.buildInsertQuery;

}

/** For test purpose only */
export async function flush() {
    await query([
        "DELETE FROM user;",
        "DELETE FROM dongle;",
        "DELETE FROM gateway_location;"
    ].join("\n"));
}

/** 
 * Return user.id_ or undefined 
 * 
 * User not yet registered are created by the shareSim function
 * those user have no salt and no password.
 * 
 * */
export async function createUserAccount(
    email: string,
    password: string
): Promise<number | undefined> {

    const salt = crypto.randomBytes(8).toString("hex");

    const hash = (new RIPEMD160()).update(`${password}${salt}`).digest("hex");

    email = email.toLowerCase();

    const sql = [
        "INSERT INTO user",
        "   ( email, salt, hash )",
        "VALUES",
        `   ( ${esc(email)}, ${esc(salt)}, ${esc(hash)})`,
        "ON DUPLICATE KEY UPDATE",
        "   salt= IF(@update_record:= salt = '', VALUES(salt), salt),",
        "   hash= IF(@update_record, VALUES(hash), hash)"
    ].join("\n");

    const { insertId } = await query(sql, { email });

    return (insertId !== 0) ? insertId : undefined;

}

/** Return user.id_ or undefined if auth failed */
export async function authenticateUser(
    email: string,
    password: string
): Promise<number | undefined> {

    email = email.toLowerCase();

    let rows = await query(
        `SELECT * FROM user WHERE email= ${esc(email)}`, { email }
    );

    if (!rows.length) {
        return undefined;
    }

    let [{ id_, salt, hash }] = rows;

    if (salt === "") {
        return undefined;
    }

    return ((new RIPEMD160()).update(`${password}${salt}`).digest("hex") === hash) ?
        id_ : undefined;

}

//TODO: Implement and when it's done enforce providing email for lock.
export async function deleteUser(
    auth: Auth
): Promise<boolean> {

    const sql= `DELETE FROM user WHERE id_ = ${esc(auth.user)}`;

    const { affectedRows } = await query(sql, { "email": auth.email });

    const isDeleted = affectedRows !== 0;

    return isDeleted;

}

//TODO: use in password recovery
export async function getUserHash(
    email: string
): Promise<string | undefined> {

    email = email.toLowerCase();

    const sql= `SELECT hash FROM user WHERE email= ${esc(email)}`;

    const rows = await query( sql, { email });

    if (!rows.length) {
        return undefined;
    }

    const [{ hash }] = rows;

    if (hash === "") {
        return undefined;
    } else {
        return hash;
    }

}

/** Only request that is make with two SQL queries */
export async function addGatewayLocation(ip: string) {

    const { insertId } = await query(
        buildInsertQuery("gateway_location", { ip }, "IGNORE"),
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
    auth: Auth,
    dongles: Iterable<dcTypes.Dongle>
): Promise<dcTypes.Dongle[]> {

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
    ].join("\n"), { "email": auth.email });

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

    let where_clause = storage.contacts.map(({ index }) => `mem_index <> ${esc(index)}`).join(" AND ");

    where_clause = !!where_clause ? `AND ${where_clause}` : "";

    sql += `DELETE FROM contact WHERE sim=@sim_ref AND mem_index IS NOT NULL ${where_clause}`;

    await query(sql, { imsi });

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

    export function parse(queryResults: any): gwTypes.Ua[] {

        const uasRegisteredToSim: gwTypes.Ua[] = [];

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
    auth: Auth,
    sim: dcTypes.Sim,
    friendlyName: string,
    password: string,
    dongle: feTypes.UserSim["dongle"],
    gatewayIp: string
): Promise<gwTypes.Ua[]> {

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
            "need_password_renewal": 0,
            "friendly_name": friendlyName,
            "is_online": 1
        }, "THROW ERROR"),
        "SELECT @sim_ref:= id_",
        "FROM sim",
        `WHERE imsi= ${esc(sim.imsi)}`,
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
        `WHERE user.id_= ${esc(auth.user)}`
    ].join("\n");

    const queryResults = await query(
        sql, 
        { "email": auth.email, "imsi": sim.imsi }
    );

    let userUas: gwTypes.Ua[] = [];

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

}

export async function getUserSims(
    auth: Auth
): Promise<feTypes.UserSim[]> {

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
        `WHERE sim.user= ${esc(auth.user)}`,
        ";",
        "SELECT",
        "   sim.imsi,",
        "   contact.*",
        "FROM contact",
        "INNER JOIN sim ON sim.id_= contact.sim",
        `WHERE sim.user= ${esc(auth.user)}`,
        ";",
        "SELECT",
        "   sim.imsi,",
        "   user.email,",
        "   user_sim.friendly_name IS NOT NULL AS is_confirmed",
        "FROM sim",
        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
        "INNER JOIN user ON user.id_= user_sim.user",
        `WHERE sim.user= ${esc(auth.user)}`,
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
        `WHERE user_sim.user= ${esc(auth.user)}`,
        ";",
        "SELECT",
        "   sim.imsi,",
        "   contact.*",
        "FROM contact",
        "INNER JOIN sim ON sim.id_= contact.sim",
        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
        `WHERE user_sim.user= ${esc(auth.user)}`,
    ].join("\n");

    const [
        rowsSimOwned,
        rowsContactSimOwned,
        rowsSharedWith,
        rowsSimShared,
        rowsContactSimShared
    ] = await query(sql, { "email": auth.email });

    const sharedWithBySim: {
        [imsi: string]: feTypes.SimOwnership.Owned["sharedWith"]
    } = {};

    for (const row of rowsSharedWith) {

        let imsi = row["imsi"];

        if (!sharedWithBySim[imsi]) {
            sharedWithBySim[imsi] = {
                "confirmed": [],
                "notConfirmed": []
            };
        }

        sharedWithBySim[imsi][
            row["is_confirmed"] ? "confirmed" : "notConfirmed"
        ].push(row["email"]);

    }

    const storageContactsBySim: { [imsi: string]: dcTypes.Sim.Contact[]; } = {};
    const phonebookBySim: { [imsi: string]: feTypes.UserSim.Contact[]; } = {};

    for (const row of [...rowsContactSimOwned, ...rowsContactSimShared]) {

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

    for (const row of [...rowsSimOwned, ...rowsSimShared]) {

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
                        "sharedWith": sharedWithBySim[sim.imsi] || {
                            "confirmed": [],
                            "notConfirmed": []
                        }
                    }
                ];

            } else {

                let friendlyName: string | null = row["user_friendly_name"];

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

                } else {

                    return [
                        friendlyName,
                        { "status": "SHARED CONFIRMED", ownerEmail }
                    ];

                }

            }

        })();

        const userSim: feTypes.UserSim = {
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

}

//TODO: Deal without it.
export async function addOrUpdateUa(
    ua: gwTypes.Ua
) {

    const sql = [
        "INSERT INTO ua",
        "   (instance, user, platform, push_token, software)",
        "SELECT",
        [
            esc(ua.instance),
            "id_",
            esc(ua.platform),
            esc(ua.pushToken),
            esc(ua.software)
        ].join(", "),
        `FROM user WHERE email= ${esc(ua.userEmail)}`,
        "ON DUPLICATE KEY UPDATE",
        "   platform= VALUES(platform),",
        "   push_token= VALUES(push_token),",
        "   software= VALUES(software)"
    ].join("\n");

    await query(sql, { "email": ua.userEmail });

}

//TODO: test!
export async function setSimOnline(
    imsi: string,
    password: string,
    replacementPassword: string,
    gatewayAddress: string,
    dongle: feTypes.UserSim["dongle"]
): Promise<{
    isSimRegistered: false;
} | {
    isSimRegistered: true;
    storageDigest: string;
    passwordStatus: "UNCHANGED" | "WAS DIFFERENT" | "PASSWORD REPLACED";
    gatewayLocation: feTypes.UserSim.GatewayLocation;
    uasRegisteredToSim: gwTypes.Ua[];
}> {

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
        "   dongle=@dongle_ref,",
        "   gateway_location=@gateway_location_ref,",
        "   need_password_renewal=0",
        "WHERE id_= @sim_ref",
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

//TODO: This function is only partially tested.
/** Return userSims by imsi */
export async function setSimsOffline(
    imsis: string[],
    doNotFetchUas: false | "DO NOT FETCH UAS" = false
): Promise<{ [imsi: string]: gwTypes.Ua[]; }> {

    if (imsis.length === 0) {
        return {};
    }

    let sql = [
        `UPDATE sim SET is_online= 0 WHERE`,
        imsis.map(imsi => `imsi= ${esc(imsi)}`).join(" OR "),
        ";",
        ""
    ].join("\n");

    if (!doNotFetchUas) {

        sql += `SELECT @sim_ref:=NULL;`;

        for (const imsi of imsis) {

            sql += [
                ``,
                `SELECT @sim_ref:=id_ FROM sim WHERE imsi= ${esc(imsi)};`,
                retrieveUasRegisteredToSim.sql + ";",
                ``
            ].join("\n");

        }

    }

    const queryResults = await query(sql, { "imsi": imsis });

    if (!!doNotFetchUas) {
        return {};
    }

    const out: { [imsi: string]: gwTypes.Ua[]; } = {};

    for (let i = imsis.length - 1; i >= 0; i--) {

        const imsi = imsis[i];

        out[imsi] = retrieveUasRegisteredToSim.parse(queryResults);

    }

    return out;

}

export async function unregisterSim(
    auth: Auth,
    imsi: string
): Promise<{ affectedUas: gwTypes.Ua[]; owner: Auth; }> {

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
        `   AND ( @is_sim_owned OR user.id_= ${esc(auth.user)})`,
        ";",
        "DELETE FROM sim WHERE id_= @sim_ref AND @is_sim_owned",
        ";",
        "DELETE FROM user_sim",
        `WHERE sim= @sim_ref AND user= ${esc(auth.user)} AND NOT @is_sim_owned`
    ].join("\n");

    const queryResults = await query(sql, { "email": auth.email, imsi });

    queryResults.shift();

    const affectedUas: gwTypes.Ua[] = [];

    for (const row of [ ...queryResults[3], ...queryResults[4]]) {

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

}

//TODO: test changed
/** assert emails not empty, return affected user email */
export async function shareSim(
    auth: Auth,
    imsi: string,
    emails: string[],
    sharingRequestMessage: string | undefined
): Promise<{
    registered: Auth[];
    notRegistered: string[]; /** list of emails */
}> {

    emails = emails
        .map(email => email.toLowerCase())
        .filter(email => email !== auth.email)
        ;

    const sql = [
        "SELECT @sim_ref:=NULL;",
        "SELECT @sim_ref:= id_",
        "FROM sim",
        `WHERE imsi= ${esc(imsi)} AND user= ${esc(auth.user)}`,
        ";",
        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not own sim')",
        ";",
        "INSERT IGNORE INTO user",
        "   (email, salt, hash)",
        "VALUES",
        emails.map(email => `   ( ${esc(email)}, '', '')`).join(",\n"),
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
        "SELECT * from _user"
    ].join("\n");

    const queryResults = await query(
        sql,
        { imsi, "email": [auth.email, ...emails] }
    );

    const userRows = queryResults.pop();

    const affectedUsers = {
        "registered": [] as Auth[],
        "notRegistered": [] as string[]
    };

    for (const row of userRows) {

        const auth: Auth = {
            "user": row["id_"],
            "email": row["email"]
        };

        if (row["is_registered"] === 1) {
            affectedUsers.registered.push(auth);
        } else {
            affectedUsers.notRegistered.push(auth.email);
        }

    }

    return affectedUsers;

}

/** Return no longer registered UAs, assert email list not empty*/
export async function stopSharingSim(
    auth: Auth,
    imsi: string,
    emails: string[]
): Promise<gwTypes.Ua[]> {

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
        "       user_sim.friendly_name IS NOT NULL as is_confirmed",
        "   FROM user_sim",
        "   INNER JOIN user ON user.id_= user_sim.user",
        `   WHERE user_sim.sim= @sim_ref AND (${emails.map(email => `user.email= ${esc(email)}`).join(" OR ")})`,
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

    const queryResults = await query(
        sql,
        { imsi, "email": auth.email }
    );

    queryResults.shift();

    const uaRows = queryResults[4];

    const noLongerRegisteredUas: gwTypes.Ua[] = [];

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

}

/** Return user UAs */
export async function setSimFriendlyName(
    auth: Auth,
    imsi: string,
    friendlyName: string
): Promise<gwTypes.Ua[]> {

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
        "SELECT ua.*, user.email",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        `WHERE user= ${esc(auth.user)}`
    ].join("\n");

    const queryResults = await query(
        sql,
        { imsi, "email": auth.email }
    );

    const uaRows = queryResults.pop();

    const userUas: gwTypes.Ua[] = [];

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

}

export async function getSimOwner(
    imsi: string
): Promise<undefined | Auth> {

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
            "email": rows[0]["email"]
        }
    }

}
