import * as mysql from "mysql";
import * as RIPEMD160  from 'ripemd160';
import * as crypto from "crypto";
import { DongleController as Dc } from "chan-dongle-extended-client";

import { mySqlFunctions as f } from "../semasim-gateway";

import { c } from "./_constants"

import * as _debug from "debug";
let debug = _debug("_db");

let connection: mysql.IConnection | undefined = undefined;

export const query= f.buildQueryFunction(c.dbParamsBackend);

/** For test purpose only */
export async function flush() {

    await query([
        "DELETE FROM sim;",
        "DELETE FROM dongle;",
        "DELETE FROM user;"
    ].join("\n"));

}

/** Return user.id_ or undefined */
export async function addUser(
    email: string, 
    password: string
): Promise<number | undefined> {

    let salt= await new Promise<string>(
        resolve => crypto.randomBytes(8, (_, buffer) =>
            resolve(buffer.toString("hex"))
        )
    );

    let hash= (new RIPEMD160()).update(`${password}${salt}`).digest("hex");

    let [ sql, values ]= f.buildInsertQuery("user", { 
        "email": email.toLowerCase(),
        salt, hash 
    });

    try{ 

        let { insertId } = await query(sql, values);

        return insertId;

    }catch{

        return undefined;

    }

}

/** Return user.id_ or undefined if auth failed */
export async function authenticateUser(
    email: string, 
    password: string
): Promise<number | undefined> {

    let sql= [
        "SELECT id_, salt, hash",
        "FROM user",
        "WHERE email=?"
    ].join("\n");

    let values= [ email.toLowerCase() ];

    let rows= await query( sql, values );

    if( !rows.length ) return undefined;

    let [ { id_, salt, hash } ] = rows;

    return ((new RIPEMD160()).update(`${password}${salt}`).digest("hex") === hash)?id_:undefined;

}

export async function addEndpoint(
    dongle: Dc.ActiveDongle,
    user: number
) {

    let sql= "";
    let values: (string | number | null)[]= [];

    let dongle_ref= "A";

    (()=>{

        let [ sql_, values_ ]= f.buildInsertOrUpdateQuery("dongle", {
            "imei": dongle.imei,
            "is_voice_enabled": f.booleanOrUndefinedToSmallIntOrNull(dongle.isVoiceEnabled)
        });

        sql+= sql_ + [
            `SELECT @${dongle_ref}:= id_`,
            "FROM dongle",
            "WHERE imei= ?",
            ";",
            ""
        ].join("\n");

        values= [ ...values, ...values_, dongle.imei ];

    })();

    let sim_ref= "B";

    (()=>{

        let sim = dongle.sim;

        let [sql_, values_] = f.buildInsertOrUpdateQuery("sim", {
            "iccid": sim.iccid,
            "imsi": sim.imsi,
            "service_provider": sim.serviceProvider || null,
            "number": sim.number || null,
            "contact_name_max_length": sim.phonebook.infos.contactNameMaxLength,
            "number_max_length": sim.phonebook.infos.numberMaxLength,
            "storage_left": sim.phonebook.infos.storageLeft
        });

        sql += sql_ + [
            `SELECT @${sim_ref}:= id_`,
            "FROM sim",
            "WHERE sim.iccid= ?",
            ";",
            ""
        ].join("\n");  

        values = [...values, ...values_, sim.iccid];

    })();

    (()=>{

        //TODO: transaction if user delete...
        let [ sql_, values_ ]= f.buildInsertOrUpdateQuery("endpoint", {
            "dongle": { "@": dongle_ref },
            "sim": { "@": sim_ref },
            "user": user
        });


        sql += sql_;

        values = [...values, ...values_];


    })();

    for (let contact of dongle.sim.phonebook.contacts) {

        let [sql_, values_] = f.buildInsertOrUpdateQuery("contact", {
            "sim": { "@": sim_ref },
            "number": contact.number,
            "base64_name": (new Buffer(contact.name, "utf8")).toString("base64"),
            "mem_index": contact.index
        });

        sql += sql_;

        values = [...values, ...values_];

    }

    await query(sql, values);

}

export async function getEndpoints(
    user: number
): Promise<Dc.ActiveDongle[]> {

    let sql = [
        "SELECT",
        "endpoint.id_,",
        "dongle.imei,",
        "dongle.is_voice_enabled,",
        "sim.iccid,",
        "sim.imsi,",
        "sim.service_provider,",
        "sim.number AS sim_number,",
        "sim.contact_name_max_length,",
        "sim.number_max_length,",
        "sim.storage_left,",
        "contact.number,",
        "contact.base64_name,",
        "contact.mem_index",
        "FROM endpoint",
        "INNER JOIN dongle ON dongle.id_= endpoint.dongle",
        "INNER JOIN sim ON sim.id_= endpoint.sim",
        "INNER JOIN user ON user.id_= endpoint.user",
        "LEFT JOIN contact ON contact.sim= sim.id_",
        "WHERE user.id_= ?",
        "ORDER BY endpoint.id_"
    ].join("\n");

    let values = [user];

    let rows = await query(sql, values);

    let dongles: Dc.ActiveDongle[] = [];

    for (let i = 0; i < rows.length;) {

        let row = rows[i];

        let dongle: Dc.ActiveDongle = {
            "imei": row["imei"],
            "isVoiceEnabled": f.smallIntOrNullToBooleanOrUndefined(row["is_voice_enabled"]),
            "sim": {
                "iccid": row["iccid"],
                "imsi": row["imsi"],
                "number": row["sim_number"] || undefined,
                "serviceProvider": row["service_provider"] || undefined,
                "phonebook": {
                    "infos": {
                        "contactNameMaxLength": row["contact_name_max_length"],
                        "numberMaxLength": row["number_max_length"],
                        "storageLeft": row["storage_left"]
                    },
                    "contacts": []
                }
            }
        };

        dongles.push(dongle);

        if (row["mem_index"] === null) {

            i++;
            continue;

        }

        let contacts = dongle.sim.phonebook.contacts;

        let endpointId_ = row["id_"];

        for (; i < rows.length && rows[i]["id_"] === endpointId_; i++) {

            let row = rows[i];

            contacts.push({
                "index": row["mem_index"],
                "name": (new Buffer(row["base64_name"], "base64")).toString("utf8"),
                "number": row["number"]
            });

        }

    }

    return dongles;

}


export async function deleteUser(user: number): Promise<boolean> {

    let { affectedRows } = await query("DELETE FROM user WHERE id = ?", [user]);

    let isDeleted = affectedRows !== 0;

    console.log({ isDeleted });

    return isDeleted;

}


export async function deleteEndpoint(
    imei: string,
    user: number
): Promise<boolean> {

    let sql= [
        "DELETE endpoint.*",
        "FROM endpoint",
        "INNER JOIN dongle ON dongle.id_= endpoint.dongle",
        "WHERE dongle.imei= ? AND endpoint.user= ?"
    ].join("\n");

    let values= [ imei, user ];

    let { affectedRows } = await query(sql, values);

    let isDeleted = affectedRows ? true : false;

    return isDeleted;

}
