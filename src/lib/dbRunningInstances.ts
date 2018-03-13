import { SyncEvent } from "ts-events-extended";
import { mysqlCustom as f } from "../semasim-gateway";
import * as c from "./_constants";
import * as md5 from "md5";
import * as networkTools from "../tools/networkTools";

/** exported only for tests */
export let query: f.Api["query"];
let esc: f.Api["esc"];
let buildInsertQuery: f.Api["buildInsertQuery"];

/** Must be called and awaited before use */
export async function launch(interfaceAddress?: string): Promise<void> {

    let api = await f.connectAndGetApi({
        ...c.dbAuth,
        "database": "semasim_running_instances",
        "localAddress": interfaceAddress ||
            networkTools.getInterfaceAddressInRange(c.semasim_lan)
    }, "HANDLE STRING ENCODING");

    query = api.query;
    esc = api.esc;
    buildInsertQuery = api.buildInsertQuery;

}

export type RunningInstance = {
    interfaceAddress: string;
    httpsPort: number;
    httpPort: number;
    sipUaPort: number;
    sipGwPort: number;
    interInstancesPort: number;
};

/** Only for test purpose */
export async function flush() {

    let sql = [
        "DELETE FROM instance;"
    ].join("\n");

    await query(sql);

}

export async function cleanup() {

    let date_now = Date.now();

    let res_events = await query("SHOW EVENTS");

    let sql = "";

    for (let _event of res_events) {

        let match = _event["Name"].match(/^cleanup_evt_(.+)$/);

        if (!match) {
            continue;
        }

        if (date_now > _event["Execute at"].getTime()) {

            let id_ = match[1];

            sql += [
                `DROP EVENT ${_event["Name"]};`,
                `DELETE FROM instance WHERE id_= ${esc(id_)};`,
                ""
            ].join("\n");

        }

    }

    if (!sql) {
        return;
    }

    await query(sql);

}

/** This function should be call ONCE by instance */
export async function setRunningInstance(
    runningInstance: RunningInstance
) {

    let sqlTouch = [
        "INSERT into touch (val)",
        "SELECT max(val) + 1",
        "FROM touch",
        "ON DUPLICATE KEY UPDATE val = VALUES(val)"
    ].join(" ");

    //TODO: enable event_scheduler elsewhere so we dont need all privileges
    let sql = [
        "SET GLOBAL event_scheduler = ON",
        ";",
        sqlTouch,
        ";",
        ""
    ].join("\n");

    let id_ = md5(
        [JSON.stringify(runningInstance), Date.now()].join("")
    );

    sql += buildInsertQuery("instance", {
        id_,
        "interface_address": runningInstance.interfaceAddress,
        "https_port": runningInstance.httpsPort,
        "http_port": runningInstance.httpPort,
        "sip_ua_port": runningInstance.sipUaPort,
        "sip_gw_port": runningInstance.sipGwPort,
        "inter_instances_port": runningInstance.interInstancesPort
    }, "THROW ERROR");

    let sqlEvtInterval = "INTERVAL 7 SECOND";

    sql += [
        "",
        `CREATE EVENT IF NOT EXISTS cleanup_evt_${id_}`,
        "   ON SCHEDULE",
        `       AT CURRENT_TIMESTAMP + ${sqlEvtInterval}`,
        "   DO",
        "   BEGIN",
        `       DELETE FROM instance WHERE id_ = ${esc(id_)};`,
        `       ${sqlTouch};`,
        "   END;",
        "",
    ].join("\n");

    await query(sql);

    setInterval(() => query([
        `ALTER EVENT cleanup_evt_${id_}`,
        "   ON SCHEDULE",
        `       AT CURRENT_TIMESTAMP + ${sqlEvtInterval}`
    ].join("\n")), 5000);

}


export function getEvtRunningInstances(): SyncEvent<RunningInstance[]> {

    if (getEvtRunningInstances.__evt) {
        return getEvtRunningInstances.__evt;
    }

    getEvtRunningInstances.__evt = new SyncEvent();

    let previousTouchValue = -1;

    (async () => {

        query(
            buildInsertQuery("touch", { "id_": "singleton", "val": 0 }, "IGNORE")
        );

        while (true) {

            let sql = [
                "SELECT @current_touch_value:= val AS current_touch_value",
                "FROM touch",
                "WHERE id_= 'singleton'",
                ";",
                "SELECT *",
                "FROM instance",
                `WHERE @current_touch_value <> ${esc(previousTouchValue)}`,
                ";"
            ].join("\n");

            let [[{ current_touch_value }], rows] = await query(sql);

            if (current_touch_value !== previousTouchValue) {

                getEvtRunningInstances.__evt!.post(
                    getEvtRunningInstances.__rowsToRunningInstances(
                        rows
                    )
                );

            }

            previousTouchValue = current_touch_value;

            await new Promise<void>(resolve => setTimeout(() => resolve(), 4000));

        }

    })();

    return getEvtRunningInstances();

}

export namespace getEvtRunningInstances {

    export let __evt: SyncEvent<RunningInstance[]> | undefined = undefined;

    export const __rowsToRunningInstances = (rows): RunningInstance[] =>
        rows.map(row => ({
            "interfaceAddress": row["interface_address"],
            "httpsPort": row["https_port"],
            "httpPort": row["http_port"],
            "sipUaPort": row["sip_ua_port"],
            "sipGwPort": row["sip_gw_port"],
            "interInstancesPort": row["inter_instances_port"]
        }))
        ;


    /** 
     * To call when a socket disconnect so we know 
     * if instance is down or if network error
     * */
    export function trigger() {

        setTimeout(
            async () =>
                __evt!.post(
                    __rowsToRunningInstances(
                        await query("SELECT * FROM instance")
                    )
                ),
            7000
        );

    }

}
