import * as mysql from "mysql";
import * as md5 from "md5";
import { mySqlFunctions as _ } from "../semasim-gateway";

import { c } from "./_constants"

import * as _debug from "debug";
let debug = _debug("_db");

export namespace semasim_backend {

    let connection: mysql.IConnection | undefined = undefined;

    function query(
        sql: string,
        values?: (string | number | null)[]
    ): Promise<any> {

        if (!connection) {

            connection = mysql.createConnection({
                ...c.dbParamsBackend,
                "multipleStatements": true
            });

        }

        return _.queryOnConnection(connection, sql, values);

    }

    export interface EndpointConfig {
        dongle_imei: string;
        sim_iccid: string;
        sim_service_provider: string | null;
        sim_number: string | null;
    }

    function computePasswordMd5(email: string, password: string): string {
        return md5(`>${email.toLowerCase()}<>${password}<`);
    }

    export async function addUser(email: string, password: string): Promise<number> {

        debug("=>addUser");

        let password_md5= computePasswordMd5(email, password);

        let [sql, values] = _.buildInsertQuery("user", { email, password_md5 });

        try {

            let { insertId }= await query(sql, values);

            console.log("user added");

            return insertId;

        } catch (error) {

            console.log("user exist");

            return 0;

        }

    }

    export async function deleteUser(user_id: number): Promise<boolean> {

        debug("=>deleteUser");

        let { affectedRows }= await query("DELETE FROM user WHERE `id` = ?", [user_id]);

        let isDeleted= affectedRows !== 0;

        console.log({ isDeleted });

        return isDeleted;

    }

    export async function getUserIdIfGranted(
        email: string, 
        password: string
    ): Promise<number> {

        debug("=>getUserIdIfGranted");

        try {

            let [{ id, password_md5 }] = await query("SELECT `id`, `password_md5` from `user` WHERE `email`= ?", [email]);

            if( password_md5 === computePasswordMd5(email, password) ) return id;
            else{

                debug("Wrong pass");

                return 0;

            }

        } catch (error) {

            debug("user not found");

            return 0;

        }


    }


    //TODO: test if an other user add same device
    export async function addEndpointConfig(
        user_id: number,
        { dongle_imei, sim_iccid, sim_service_provider, sim_number }: EndpointConfig
    ): Promise<boolean> {

        debug("=>addEndpointConfig");

        try {

            let [sql, values] = _.buildInsertOrUpdateQuery("endpoint_config", {
                user_id,
                dongle_imei,
                sim_iccid,
                sim_service_provider,
                sim_number
            });

            await query(sql, values);

            return true;

        } catch (error) {

            debug("User does not exist");

            return false;

        }

    }

    export async function deleteEndpointConfig(
        user_id: number,
        imei: string
    ): Promise<boolean> {

        debug("=>deleteEndpointConfig");

        let { affectedRows } = await query(
            "DELETE FROM endpoint_config WHERE `user_id`=? AND `dongle_imei`=?", [ user_id, imei]
        );

        let isDeleted = affectedRows ? true : false;

        return isDeleted;

    }

    export function getUserEndpointConfigs(
        user_id: number
    ): Promise<EndpointConfig[]> {

        debug("=>getUserConfigs");

        return query([
            "SELECT `dongle_imei`, `sim_iccid`, `sim_service_provider`, `sim_number`",
            "FROM endpoint_config",
            "WHERE `user_id`= ?"
        ].join("\n"), [user_id]);

    }

}