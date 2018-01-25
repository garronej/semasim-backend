import * as RIPEMD160 from 'ripemd160';
import * as crypto from "crypto";
import { DongleController as Dc } from "chan-dongle-extended-client";
import { webApiDeclaration } from "../semasim-frontend";
import Types = webApiDeclaration.Types;
import { Session } from "./web";
import { geoiplookup } from "../tools/geoiplookup";

import { mySqlFunctions as f, Contact } from "../semasim-gateway";

import { c } from "./_constants"

import * as _debug from "debug";
let debug = _debug("_db");

/** Exported only for tests */
export const query = f.buildQueryFunction(c.dbParamsBackend);

/** For test purpose only */
export async function flush() {
    await query("DELETE FROM user;");
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
        `   ( ${f.esc(email)}, ${f.esc(salt)}, ${f.esc(hash)})`,
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
        `SELECT * FROM user WHERE email= ${f.esc(email)}`
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
        `DELETE FROM user WHERE id_ = ${f.esc(user)}`
    );

    let isDeleted = affectedRows !== 0;

    return isDeleted;

}

export async function getUserHash(
    email: string
): Promise<string | undefined> {

    email = email.toLowerCase();

    let rows = await query(
        `SELECT hash FROM user WHERE email= ${f.esc(email)}`
    );

    if (!rows.length) {
        return undefined;
    }

    let [{ hash }] = rows;

    if( hash === "" ){
        return undefined;
    } else {
        return hash;
    }

}

export async function getWebUaData(
    user: number
): Promise<Types.WebUaData | undefined> {

    let { web_ua_data } = await query(
        `SELECT web_ua_data FROM user WHERE id_= ${f.esc(user)}`
    );

    return web_ua_data ?
        JSON.parse((new Buffer(web_ua_data, "base64")).toString("utf8")) :
        undefined
        ;

}


export async function storeWebUaData(
    user: number,
    webUaData: Types.WebUaData
) {

    //UPDATE t1 SET col1 = col1 + 1;

    let web_user_data= (new Buffer(JSON.stringify(webUaData), "utf8")).toString("base64");

    await query(
        `UPDATE user SET web_user_data= ${f.esc(web_user_data)} WHERE id_= ${f.esc(user)}`
    );

}

export async function addIp(ip: string) {

    let { insertId } = await query(
        f.buildInsertQuery(
            "geoip", { ip }, "IGNORE"
        )
    );

    if (!insertId) return;

    try {

        let { country, subdivisions, city } = await geoiplookup(ip);

        await query(
            f.buildInsertQuery(
                "geoip",
                { ip, country, subdivisions, city },
                "UPDATE"
            )
        );

    } catch (error) {

        debug("addIp error", error);

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
        dongleWithReadableIccid.map(({ sim }) => `iccid= ${f.esc(sim.iccid!)}`).join(" OR ")
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
    sim: Dc.ActiveDongle["sim"],
    password: string,
    user: number,
    friendlyName: string,
    isVoiceEnabled: boolean | undefined
): Promise<Contact.UaSim.Ua[]> {

    let sql = f.buildInsertQuery("sim", {
        "imsi": sim.imsi,
        "iccid": sim.iccid,
        "number": sim.storage.number || null,
        "base64_service_provider_from_imsi": f.b64.enc(sim.serviceProvider.fromImsi),
        "base64_service_provider_from_network": f.b64.enc(sim.serviceProvider.fromNetwork),
        "contact_name_max_length": sim.storage.infos.contactNameMaxLength,
        "number_max_length": sim.storage.infos.numberMaxLength,
        "storage_left": sim.storage.infos.storageLeft,
        "storage_digest": sim.storage.digest,
        user,
        password,
        "need_password_renewal": 0,
        "base64_friendly_name": f.b64.enc(friendlyName),
        "is_voice_enabled": f.booleanOrUndefinedToSmallIntOrNull(isVoiceEnabled),
        "is_online": 1
    }, "THROW ERROR");

    sql += [
        "SELECT @sim_ref:= id_",
        "FROM sim",
        `WHERE imsi= ${f.esc(sim.imsi)}`,
        ";",
        ""
    ].join("\n");

    for (let contact of sim.storage.contacts) {

        sql += f.buildInsertQuery("contact", {
            "sim": { "@": "sim_ref" },
            "mem_index": contact.index,
            "number_as_stored": contact.number.asStored,
            "number_local_format": contact.number.localFormat,
            "base64_name_as_stored": f.b64.enc(contact.name.asStored),
            "base64_name_full": f.b64.enc(contact.name.full)
        }, "THROW ERROR");

    }

    sql += [
        "SELECT ua.*, user.email",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        `WHERE user.id_= ${f.esc(user)}`
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
): Promise<Types.UserSim[]> {

    let sql = [
        "SELECT",
        "   sim.*",
        "FROM sim",
        `WHERE sim.user= ${f.esc(user)}`,
        ";",
        "SELECT",
        "   sim.imsi,",
        "   contact.*",
        "FROM contact",
        "INNER JOIN sim ON sim.id_= contact.sim",
        `WHERE sim.user= ${f.esc(user)}`,
        ";",
        "SELECT",
        "   sim.imsi,",
        "   user.email,",
        "   user_sim.base64_friendly_name IS NOT NULL AS is_confirmed",
        "FROM sim",
        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
        "INNER JOIN user ON user.id_= user_sim.user",
        `WHERE sim.user= ${f.esc(user)}`,
        ";",
        "SELECT",
        "   sim.*,",
        "   user_sim.base64_friendly_name AS base64_user_friendly_name,",
        "   user_sim.base64_sharing_request_message,",
        "   user.email",
        "FROM sim",
        "INNER JOIN user ON user.id_= sim.user",
        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
        `WHERE user_sim.user= ${f.esc(user)}`,
        ";",
        "SELECT",
        "   sim.imsi,",
        "   contact.*",
        "FROM contact",
        "INNER JOIN sim ON sim.id_= contact.sim",
        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
        `WHERE user_sim.user= ${f.esc(user)}`,
    ].join("\n");

    let [
        rowsSimOwned,
        rowsContactSimOwned,
        rowsSharedWith,
        rowsSimShared,
        rowsContactSimShared
    ] = await query(sql);

    let sharedWithBySim: {
        [imsi: string]: Types.SimOwnership.Owned["sharedWith"]
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
                "asStored": f.b64.dec(row["base64_name_as_stored"])!,
                "full": f.b64.dec(row["base64_name_full"])!
            },
            "number": {
                "asStored": row["number_as_stored"],
                "localFormat": row["number_local_format"]
            }
        });

    }

    let userSims: Types.UserSim[] = [];

    for (let row of [...rowsSimOwned, ...rowsSimShared]) {

        let sim: Dc.ActiveDongle["sim"] = {
            "iccid": row["iccid"],
            "imsi": row["imsi"],
            "serviceProvider": {
                "fromImsi": f.b64.dec(row["base64_service_provider_from_imsi"]),
                "fromNetwork": f.b64.dec(row["base64_service_provider_from_network"])
            },
            "storage": {
                "number": (row["number"] === null) ? undefined : row["number"],
                "infos": {
                    "contactNameMaxLength": parseInt(row["contact_name_max_length"]),
                    "numberMaxLength": parseInt(row["number_max_length"]),
                    "storageLeft": parseInt(row["storage_left"]),
                },
                "contacts": contactsBySim[row["imsi"]] || [],
                "digest": row["storage_digest"]
            }
        };

        let [friendlyName, ownership] = ((): [string, Types.SimOwnership] => {

            let ownerEmail = row["email"];

            let ownerFriendlyName = f.b64.dec(row["base64_friendly_name"])!;

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

                let friendlyName = f.b64.dec(row["base64_user_friendly_name"]);

                if (friendlyName === undefined) {

                    //TODO: Security hotFix
                    row["password"] = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";

                    return [
                        ownerFriendlyName,
                        {
                            "status": "SHARED NOT CONFIRMED",
                            ownerEmail,
                            "sharingRequestMessage": f.b64.dec(row["base64_sharing_request_message"])
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

        let userSim: Types.UserSim = {
            sim,
            friendlyName,
            ownership,
            "password": row["password"],
            "isVoiceEnabled": f.smallIntOrNullToBooleanOrUndefined(row["is_voice_enabled"]),
            "isOnline": row["is_online"] === 1
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
            f.esc(ua.instance),
            "id_",
            f.esc(ua.platform),
            f.esc(ua.pushToken),
            f.esc(ua.software)
        ].join(", "),
        `FROM user WHERE email= ${f.esc(ua.userEmail)}`,
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
    isVoiceEnabled: boolean | undefined
): Promise<{
    isSimRegistered: false;
} | {
    isSimRegistered: true;
    storageDigest: string;
    passwordStatus: "UNCHANGED" | "RENEWED" | "NEED RENEWAL";
    uasRegisteredToSim: Contact.UaSim.Ua[];
}> {

    let is_voice_enabled = f.booleanOrUndefinedToSmallIntOrNull(isVoiceEnabled);

    //TODO: see if valid SET query
    let queryResults = await query([
        "SELECT",
        "@sim_ref:= id_,",
        `storage_digest,`,
        [
            "@password_status:= ",
            `IF(password= ${f.esc(password)}, `,
            "IF(need_password_renewal, 'NEED RENEWAL', 'UNCHANGED'), ",
            "'RENEWED') AS password_status"
        ].join(""),
        "FROM sim",
        `WHERE imsi= ${f.esc(imsi)}`,
        ";",
        "UPDATE sim",
        "SET",
        "   is_online= 1,",
        `   password= ${f.esc(password)},`,
        "   need_password_renewal= (@password_status= 'NEED RENEWAL'),",
        `   is_voice_enabled= ${f.esc(is_voice_enabled)}`,
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
        `WHERE sim.id_= @sim_ref AND user_sim.base64_friendly_name IS NOT NULL`
    ].join("\n"));

    if (queryResults[0].length === 0) {
        return { "isSimRegistered": false };
    } else {

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

}

export async function setSimOffline(
    imsi: string
) {
    await query(
        `UPDATE sim SET is_online= 0 WHERE imsi= ${f.esc(imsi)}`
    );
}

/** Return UAs that no longer use sim */
export async function unregisterSim(
    user: number,
    imsi: string
): Promise<Contact.UaSim.Ua[]> {

    //TODO: here do not include ua that did not accept sharing request
    //TODO: test is carriage return allowed in WHERE
    let queryResults = await query([
        `SELECT @sim_ref:= sim.id_, @is_sim_owned:= sim.user= ${f.esc(user)}`,
        "FROM sim",
        "LEFT JOIN user_sim ON user_sim.sim= sim.id_",
        "WHERE",
        `sim.imsi= ${f.esc(imsi)} AND ( sim.user= ${f.esc(user)} OR user_sim.user= ${f.esc(user)})`,
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
        "   AND user_sim.base64_friendly_name IS NOT NULL",
        `   AND ( @is_sim_owned OR user.id_= ${f.esc(user)})`,
        ";",
        "DELETE FROM sim WHERE id_= @sim_ref AND @is_sim_owned",
        ";",
        "DELETE FROM user_sim",
        `WHERE sim= @sim_ref AND user= ${f.esc(user)} AND NOT @is_sim_owned`
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

//TODO: useless to return UA as sharing request must be accepted first
/** Return assert emails not empty */
export async function shareSim(
    auth: Session.Auth,
    imsi: string,
    emails: string[],
    sharingRequestMessage: string | undefined
): Promise<Types.AffectedUsers> {

    emails = emails
        .map(email => email.toLowerCase())
        .filter(email => email !== auth.email)
        ;

    let sql = [
        "SELECT @sim_ref:= id_",
        "FROM sim",
        `WHERE imsi= ${f.esc(imsi)} AND user= ${f.esc(auth.user)}`,
        ";",
        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not own sim')",
        ";",
        "INSERT IGNORE INTO user",
        "   (email, salt, hash)",
        "VALUES",
        emails.map(email => `   ( ${f.esc(email)}, '', '')`).join(",\n"),
        ";",
        "DROP TABLE IF EXISTS _user",
        ";",
        "CREATE TEMPORARY TABLE _user AS (",
        "   SELECT user.id_, user.email, user.salt<> '' AS is_registered",
        "   FROM user",
        "   LEFT JOIN user_sim ON user_sim.user= user.id_",
        `   WHERE ${emails.map(email => `user.email= ${f.esc(email)}`).join(" OR ")}`,
        "   GROUP BY user.id_",
        "   HAVING COUNT(user_sim.id_)=0 OR SUM(user_sim.sim= @sim_ref)=0",
        ")",
        ";",
        "INSERT INTO user_sim",
        "   (user, sim, base64_friendly_name, base64_sharing_request_message)",
        "SELECT",
        `   id_, @sim_ref, NULL, ${f.esc(f.b64.enc(sharingRequestMessage))}`,
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
        `WHERE imsi= ${f.esc(imsi)} AND user= ${f.esc(user)}`,
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
        "       user_sim.base64_friendly_name IS NOT NULL as is_confirmed",
        "   FROM user_sim",
        "   INNER JOIN user ON user.id_= user_sim.user",
        `   WHERE user_sim.sim= @sim_ref AND (${emails.map(email => `user.email= ${f.esc(email)}`).join(" OR ")})`,
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

    let b64FriendlyName = f.b64.enc(friendlyName);

    let sql = [
        `SELECT @sim_ref:= sim.id_, @is_sim_owned:= sim.user= ${f.esc(user)}`,
        "FROM sim",
        "LEFT JOIN user_sim ON user_sim.sim= sim.id_",
        `WHERE sim.imsi= ${f.esc(imsi)} AND ( sim.user= ${f.esc(user)} OR user_sim.user= ${f.esc(user)})`,
        "GROUP BY sim.id_",
        ";",
        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not have access to this SIM')",
        ";",
        "UPDATE sim",
        `SET base64_friendly_name= ${f.esc(b64FriendlyName)}`,
        "WHERE id_= @sim_ref AND @is_sim_owned",
        ";",
        "UPDATE user_sim",
        `SET base64_friendly_name= ${f.esc(b64FriendlyName)}, base64_sharing_request_message= NULL`,
        `WHERE sim= @sim_ref AND user= ${f.esc(user)} AND NOT @is_sim_owned`,
        ";",
        "SELECT ua.*, user.email",
        "FROM ua",
        "INNER JOIN user ON user.id_= ua.user",
        `WHERE user= ${f.esc(user)}`
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
        `WHERE sim.imsi= ${f.esc(imsi)}`
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
