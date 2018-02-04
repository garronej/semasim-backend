import * as RIPEMD160 from 'ripemd160';
import * as crypto from "crypto";
import { DongleController as Dc } from "chan-dongle-extended-client";
import { types } from "../semasim-frontend";
import { Session } from "./web";
import { geoiplookup } from "../tools/geoiplookup";

import { mySqlFunctions as f, Contact } from "../semasim-gateway";

import { c } from "./_constants"

import * as _debug from "debug";
let debug = _debug("_db");

/** Exported only for tests */
export const { query, esc, buildInsertQuery } = f.getUtils(
    c.dbParamsBackend, "HANDLE STRING ENCODING"
);

/** For test purpose only */
export async function flush() {
    await query([
        "DELETE FROM user;",
        "DELETE FROM dongle;",
        "DELETE FROM gateway_location;"
    ].join("\n"));
}

/** Return user.id_ or undefined */
export async function createUserAccount(
    email: string,
    password: string
): Promise<number | undefined> {

    let salt = crypto.randomBytes(8).toString("hex");

    let hash = (new RIPEMD160()).update(`${password}${salt}`).digest("hex");

    email = email.toLowerCase();

    let sql = [
        "INSERT INTO user",
        "   ( email, salt, hash )",
        "VALUES",
        `   ( ${esc(email)}, ${esc(salt)}, ${esc(hash)})`,
        "ON DUPLICATE KEY UPDATE",
        "   salt= IF(@update_record:= salt = '', VALUES(salt), salt),",
        "   hash= IF(@update_record, VALUES(hash), hash)"
    ].join("\n");

    let { insertId } = await query(sql);

    return (insertId !== 0) ? insertId : undefined;

}

/** Return user.id_ or undefined if auth failed */
export async function authenticateUser(
    email: string,
    password: string
): Promise<number | undefined> {

    email = email.toLowerCase();

    let rows = await query(
        `SELECT * FROM user WHERE email= ${esc(email)}`
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

export async function deleteUser(
    user: number
): Promise<boolean> {

    let { affectedRows } = await query(
        `DELETE FROM user WHERE id_ = ${esc(user)}`
    );

    let isDeleted = affectedRows !== 0;

    return isDeleted;

}

export async function getUserHash(
    email: string
): Promise<string | undefined> {

    email = email.toLowerCase();

    let rows = await query(
        `SELECT hash FROM user WHERE email= ${esc(email)}`
    );

    if (!rows.length) {
        return undefined;
    }

    let [{ hash }] = rows;

    if (hash === "") {
        return undefined;
    } else {
        return hash;
    }

}

export async function addGatewayLocation(ip: string) {

    let { insertId } = await query(
        buildInsertQuery("gateway_location", { ip }, "IGNORE")
    );

    if (!insertId) return;

    try {

        let { countryIso, subdivisions, city } = await geoiplookup(ip);

        let sql = buildInsertQuery("gateway_location", {
            ip,
            "country_iso": countryIso || null,
            "subdivisions": subdivisions || null,
            "city": city || null
        }, "UPDATE");

        await query(sql);

    } catch (error) {

        debug(`Lookup id failed ${ip}`, error.message);

        return;

    }

}

/** returns locked dongles with unreadable SIM iccid,
 *  locked dongles with readable iccid registered by user
 *  active dongles not registered
 */
export async function filterDongleWithRegistrableSim(
    user: number,
    dongles: Dc.Dongle[]
): Promise<Dc.Dongle[]> {

    let registrableDongles: Dc.Dongle[] = [];
    let dongleWithReadableIccid: Dc.Dongle[] = []

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
    ].join("\n"));

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
                    return (registeredBy === user) && Dc.LockedDongle.match(dongle);
                }

            }
        )
    ];

    return registrableDongles;

}

/** return user UAs */
export async function registerSim(
    user: number,
    sim: Dc.ActiveDongle["sim"],
    friendlyName: string,
    password: string,
    dongle: types.UserSim["dongle"],
    gatewayIp: string
): Promise<Contact.UaSim.Ua[]> {

    let sql = buildInsertQuery("dongle", {
        "imei": dongle.imei,
        "is_voice_enabled": f.bool.enc(dongle.isVoiceEnabled),
        "manufacturer": dongle.manufacturer,
        "model": dongle.model,
        "firmware_version": dongle.firmwareVersion
    }, "UPDATE");

    sql += [
        "SELECT @dongle_ref:= id_",
        "FROM dongle",
        `WHERE imei= ${esc(dongle.imei)}`,
        ";",
        "SELECT @gateway_location_ref:= id_",
        "FROM gateway_location",
        `WHERE ip= ${esc(gatewayIp)}`,
        ";",
        ""
    ].join("\n");

    sql += buildInsertQuery("sim", {
        "imsi": sim.imsi,
        "country_name": sim.country ? sim.country.name : null,
        "country_iso": sim.country ? sim.country.iso : null,
        "country_code": sim.country ? sim.country.code : null,
        "iccid": sim.iccid,
        "dongle": { "@": "dongle_ref" },
        "gateway_location": { "@": "gateway_location_ref" },
        "number_as_stored": sim.storage.number ? sim.storage.number.asStored : null,
        "number_local_format": sim.storage.number ? sim.storage.number.localFormat : null,
        "service_provider_from_imsi": sim.serviceProvider.fromImsi || null,
        "service_provider_from_network": sim.serviceProvider.fromNetwork || null,
        "contact_name_max_length": sim.storage.infos.contactNameMaxLength,
        "number_max_length": sim.storage.infos.numberMaxLength,
        "storage_left": sim.storage.infos.storageLeft,
        "storage_digest": sim.storage.digest,
        user,
        password,
        "need_password_renewal": 0,
        "friendly_name": friendlyName,
        "is_online": 1
    }, "THROW ERROR");

    sql += [
        "SELECT @sim_ref:= id_",
        "FROM sim",
        `WHERE imsi= ${esc(sim.imsi)}`,
        ";",
        ""
    ].join("\n");

    for (let contact of sim.storage.contacts) {

        sql += buildInsertQuery("contact", {
            "sim": { "@": "sim_ref" },
            "mem_index": contact.index,
            "number_as_stored": contact.number.asStored,
            "number_local_format": contact.number.localFormat,
            "name_as_stored": contact.name.asStored,
            "name_full": contact.name.full
        }, "THROW ERROR");

    }

    sql += [
        "SELECT ua.*, user.email",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        `WHERE user.id_= ${esc(user)}`
    ].join("\n");

    let queryResults = await query(sql);

    let userUas: Contact.UaSim.Ua[] = [];

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
    user: number
): Promise<types.UserSim[]> {

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
        `WHERE sim.user= ${esc(user)}`,
        ";",
        "SELECT",
        "   sim.imsi,",
        "   contact.*",
        "FROM contact",
        "INNER JOIN sim ON sim.id_= contact.sim",
        `WHERE sim.user= ${esc(user)}`,
        ";",
        "SELECT",
        "   sim.imsi,",
        "   user.email,",
        "   user_sim.friendly_name IS NOT NULL AS is_confirmed",
        "FROM sim",
        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
        "INNER JOIN user ON user.id_= user_sim.user",
        `WHERE sim.user= ${esc(user)}`,
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
        `WHERE user_sim.user= ${esc(user)}`,
        ";",
        "SELECT",
        "   sim.imsi,",
        "   contact.*",
        "FROM contact",
        "INNER JOIN sim ON sim.id_= contact.sim",
        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
        `WHERE user_sim.user= ${esc(user)}`,
    ].join("\n");

    let [
        rowsSimOwned,
        rowsContactSimOwned,
        rowsSharedWith,
        rowsSimShared,
        rowsContactSimShared
    ] = await query(sql);

    let sharedWithBySim: {
        [imsi: string]: types.SimOwnership.Owned["sharedWith"]
    } = {};

    for (let row of rowsSharedWith) {

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

    let contactsBySim: { [imsi: string]: Dc.Contact[]; } = {};

    for (let row of [...rowsContactSimOwned, ...rowsContactSimShared]) {

        let imsi = row["imsi"];

        if (!contactsBySim[imsi]) {
            contactsBySim[imsi] = [];
        }

        contactsBySim[imsi].push({
            "index": parseInt(row["mem_index"]),
            "name": {
                "asStored": row["name_as_stored"],
                "full": row["name_full"]
            },
            "number": {
                "asStored": row["number_as_stored"],
                "localFormat": row["number_local_format"]
            }
        });

    }

    let userSims: types.UserSim[] = [];

    for (let row of [...rowsSimOwned, ...rowsSimShared]) {

        let sim: Dc.ActiveDongle["sim"] = {
            "iccid": row["iccid"],
            "imsi": row["imsi"],
            "country": row["country_name"] ? ({
                "name": row["country_name"],
                "iso": row["country_iso"],
                "code": parseInt(row["country_code"])
            }) : undefined,
            "serviceProvider": {
                "fromImsi": row["service_provider_from_imsi"] || undefined,
                "fromNetwork": row["service_provider_from_network"] || undefined
            },
            "storage": {
                "number": row["number_as_stored"] ? ({
                    "asStored": row["number_as_stored"],
                    "localFormat": row["number_local_format"]
                }) : undefined,
                "infos": {
                    "contactNameMaxLength": parseInt(row["contact_name_max_length"]),
                    "numberMaxLength": parseInt(row["number_max_length"]),
                    "storageLeft": parseInt(row["storage_left"]),
                },
                "contacts": contactsBySim[row["imsi"]] || [],
                "digest": row["storage_digest"]
            }
        };

        let dongle: types.UserSim["dongle"] = {
            "imei": row["imei"],
            "isVoiceEnabled": f.bool.dec(row["is_voice_enabled"]),
            "manufacturer": row["manufacturer"],
            "model": row["model"],
            "firmwareVersion": row["firmware_version"]
        };

        let gatewayLocation: types.UserSim.GatewayLocation = {
            "ip": row["ip"],
            "countryIso": row["gw_country_iso"] || undefined,
            "subdivisions": row["subdivisions"] || undefined,
            "city": row["city"] || undefined
        };

        let [friendlyName, ownership] = ((): [string, types.SimOwnership] => {

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

                    //NOTE: Security hotFix
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

        let userSim: types.UserSim = {
            sim,
            friendlyName,
            "password": row["password"],
            dongle,
            gatewayLocation,
            "isOnline": row["is_online"] === 1,
            ownership
        };

        userSims.push(userSim);

    }

    return userSims;

}

export async function addOrUpdateUa(
    ua: Contact.UaSim.Ua
) {

    let sql = [
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

    await query(sql);

}

export async function setSimOnline(
    imsi: string,
    password: string,
    gatewayIp: string,
    dongle: types.UserSim["dongle"]
): Promise<{
    isSimRegistered: false;
} | {
    isSimRegistered: true;
    storageDigest: string;
    passwordStatus: "UNCHANGED" | "RENEWED" | "NEED RENEWAL";
    uasRegisteredToSim: Contact.UaSim.Ua[];
}> {

    let sql = [
        "SELECT",
        "@sim_ref:= id_,",
        `storage_digest,`,
        [
            "@password_status:= ",
            `IF(password= ${esc(password)}, `,
            "IF(need_password_renewal, 'NEED RENEWAL', 'UNCHANGED'), ",
            "'RENEWED') AS password_status"
        ].join(""),
        "FROM sim",
        `WHERE imsi= ${esc(imsi)}`,
        ";",
        ""
    ].join("\n");

    sql += buildInsertQuery("dongle", {
        "imei": dongle.imei,
        "is_voice_enabled": f.bool.enc(dongle.isVoiceEnabled),
        "manufacturer": dongle.manufacturer,
        "model": dongle.model,
        "firmware_version": dongle.firmwareVersion
    }, "UPDATE");

    sql += [
        "SELECT @dongle_ref:= id_",
        "FROM dongle",
        `WHERE imei= ${dongle.imei}`,
        ";",
        "SELECT @gateway_location_ref:= id_",
        "FROM gateway_location",
        `WHERE ip= ${esc(gatewayIp)}`,
        ";",
        "UPDATE sim",
        "SET",
        "   is_online= 1,",
        `   password= ${esc(password)},`,
        "   dongle= @dongle_ref,",
        "   gateway_location= @gateway_location_ref,",
        "   need_password_renewal= (@password_status= 'NEED RENEWAL')",
        "WHERE id_= @sim_ref",
        ";",
        "SELECT",
        "   ua.*, user.email",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        "INNER JOIN sim ON sim.user= user.id_",
        `WHERE sim.id_= @sim_ref`,
        ";",
        "SELECT",
        "   ua.*, user.email",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        "INNER JOIN user_sim ON user_sim.user= user.id_",
        "INNER JOIN sim ON sim.id_= user_sim.sim",
        `WHERE sim.id_= @sim_ref AND user_sim.friendly_name IS NOT NULL`
    ].join("\n");

    let queryResults = await query(sql);

    if (queryResults[0].length === 0) {
        return { "isSimRegistered": false };
    }

    let uasRegisteredToSim: Contact.UaSim.Ua[] = [];

    for (let row of [...queryResults.pop(), ...queryResults.pop()]) {

        uasRegisteredToSim.push({
            "instance": row["instance"],
            "userEmail": row["email"],
            "platform": row["platform"],
            "pushToken": row["push_token"],
            "software": row["software"]
        });

    }

    return {
        "isSimRegistered": true,
        "passwordStatus": queryResults[0][0]["password_status"],
        "storageDigest": queryResults[0][0]["storage_digest"],
        uasRegisteredToSim
    };

}

export async function setSimOffline(
    imsi: string
) {
    await query(
        `UPDATE sim SET is_online= 0 WHERE imsi= ${esc(imsi)}`
    );
}

/** Return UAs that no longer use sim */
export async function unregisterSim(
    user: number,
    imsi: string
): Promise<Contact.UaSim.Ua[]> {

    let queryResults = await query([
        `SELECT @sim_ref:= sim.id_, @is_sim_owned:= sim.user= ${esc(user)}`,
        "FROM sim",
        "LEFT JOIN user_sim ON user_sim.sim= sim.id_",
        "WHERE",
        `sim.imsi= ${esc(imsi)} AND ( sim.user= ${esc(user)} OR user_sim.user= ${esc(user)})`,
        "GROUP BY sim.id_",
        ";",
        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not have access to this SIM')",
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
        `   AND ( @is_sim_owned OR user.id_= ${esc(user)})`,
        ";",
        "DELETE FROM sim WHERE id_= @sim_ref AND @is_sim_owned",
        ";",
        "DELETE FROM user_sim",
        `WHERE sim= @sim_ref AND user= ${esc(user)} AND NOT @is_sim_owned`
    ].join("\n"));

    let affectedUas: Contact.UaSim.Ua[] = [];

    for (let row of [ ...queryResults[2], ...queryResults[3]]) {

        affectedUas.push({
            "instance": row["instance"],
            "userEmail": row["email"],
            "platform": row["platform"],
            "pushToken": row["push_token"],
            "software": row["software"]
        });

    }

    return affectedUas;

}

/** Return assert emails not empty */
export async function shareSim(
    auth: Session.Auth,
    imsi: string,
    emails: string[],
    sharingRequestMessage: string | undefined
): Promise<types.AffectedUsers> {

    emails = emails
        .map(email => email.toLowerCase())
        .filter(email => email !== auth.email)
        ;

    let sql = [
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

    let queryResults = await query(sql);

    let userRows = queryResults.pop();

    let affectedUsers = {
        "registered": [] as string[],
        "notRegistered": [] as string[]
    };

    for (let row of userRows) {

        let email = row["email"];

        if (row["is_registered"] === 1) {
            affectedUsers.registered.push(email);
        } else {
            affectedUsers.notRegistered.push(email);
        }

    }

    return affectedUsers;

}

/** Return no longer registered UAs, assert email list not empty*/
export async function stopSharingSim(
    user: number,
    imsi: string,
    emails: string[]
): Promise<Contact.UaSim.Ua[]> {

    emails = emails.map(email => email.toLowerCase());

    //TODO: See if JOIN work on temporary table
    let sql = [
        "SELECT @sim_ref:= id_",
        "FROM sim",
        `WHERE imsi= ${esc(imsi)} AND user= ${esc(user)}`,
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

    let queryResults = await query(sql);

    let uaRows = queryResults[4];

    let noLongerRegisteredUas: Contact.UaSim.Ua[] = [];

    for (let row of uaRows) {

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
    user: number,
    imsi: string,
    friendlyName: string
): Promise<Contact.UaSim.Ua[]> {

    let sql = [
        `SELECT @sim_ref:= sim.id_, @is_sim_owned:= sim.user= ${esc(user)}`,
        "FROM sim",
        "LEFT JOIN user_sim ON user_sim.sim= sim.id_",
        `WHERE sim.imsi= ${esc(imsi)} AND ( sim.user= ${esc(user)} OR user_sim.user= ${esc(user)})`,
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
        `WHERE sim= @sim_ref AND user= ${esc(user)} AND NOT @is_sim_owned`,
        ";",
        "SELECT ua.*, user.email",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        `WHERE user= ${esc(user)}`
    ].join("\n");

    let queryResults = await query(sql);

    let uaRows = queryResults.pop();

    let userUas: Contact.UaSim.Ua[] = [];

    for (let row of uaRows) {

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
): Promise<undefined | Session.Auth> {

    let rows = await query([
        "SELECT user.*",
        "FROM user",
        "INNER JOIN sim ON sim.user= user.id_",
        `WHERE sim.imsi= ${esc(imsi)}`
    ].join("\n"));

    if (!rows.length) {
        return undefined;
    } else {
        return {
            "user": rows[0]["id_"],
            "email": rows[0]["email"]
        }
    }

}
