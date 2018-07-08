import { SyncEvent } from "ts-events-extended";
import * as f from "../tools/mysqlCustom";
import * as i from "../bin/installer";
import * as networkTools from "../tools/networkTools";
import * as logger from "logger";

const debug= logger.debugFactory();


/** exported only for tests */
export let query: f.Api["query"];
let esc: f.Api["esc"];
let buildInsertQuery: f.Api["buildInsertQuery"];

export async function beforeExit(){

    debug("BeforeExit...");

    if( !beforeExit.end ){
        debug("Was not yet init")
        return;
    }

    if( !!beforeExit.timer_interval ){
        clearInterval(beforeExit.timer_interval);
    }

    for( const timer of beforeExit.timer_timeouts ){
        clearTimeout(timer);
    }

    if( !!beforeExit.ri ){

        try{

            await deleteRunningInstance(beforeExit.ri);

        }catch(error){

            debug(error);

            throw error;

        }

    }

    await beforeExit.end();

    debug("BeforeExit success");

}

export namespace beforeExit {

    export let end: f.Api["end"] | undefined = undefined;

    export let  timer_timeouts= new Set<NodeJS.Timer>();
    
    export let timer_interval: NodeJS.Timer | undefined = undefined;

    export let ri: RunningInstance.Id | undefined= undefined;

};

/** Must be called and awaited before use */
export function launch(): void {

    let localAddress: string | undefined;

    try{

        localAddress = networkTools.getInterfaceAddressInRange(i.semasim_lan)

    }catch{

        localAddress= undefined;

    }

    const api = f.createPoolAndGetApi({
        ...i.dbAuth,
        "database": "semasim_running_instances",
        localAddress
    }, undefined, 1);

    beforeExit.end= api.end;

    query = api.query;
    esc = api.esc;
    buildInsertQuery = api.buildInsertQuery;

}


export type RunningInstance = RunningInstance.Id & ({
    httpsPort: number;
    httpPort: number;
    sipUaPort: number;
    sipGwPort: number;
    interInstancesPort: number;
});

export namespace RunningInstance {

    export type Id = {
        interfaceAddress: string;
        daemon_number: number;
    };

    export namespace Id {

        const prefix = "cleanup_evt";

        const regExp = new RegExp(`^${prefix}__(.+)$`);

        export function buildEvtName(ri: Id): string {

            return [
                prefix,
                ri.interfaceAddress.replace(/\./g, "_"),
                `${ri.daemon_number}`
            ].join("__");

        }

        export function parseEvtName(name: string): Id | undefined {

            const match = name.match(regExp);

            if (!match) {
                return undefined;
            }

            const [a, b] = match[1].split("__");

            return {
                "interfaceAddress": a.replace(/_/g, "."),
                "daemon_number": parseInt(b)
            };

        }



    }


}

/** Only for test purpose */
export async function flush() {

    const sql = "DELETE FROM instance;";

    await query(sql);

}

export async function cleanup() {

    let date_now = Date.now();

    let res_events = await query("SHOW EVENTS");

    let sql = "";

    for (let _event of res_events) {

        const name = _event["Name"];

        const ri = RunningInstance.Id.parseEvtName(name);

        if (!ri) {
            continue;
        }

        if (date_now > _event["Execute at"].getTime()) {

            sql += deleteRunningInstance.buildSql(ri) + "\n";

        }

    }

    if (!sql) {
        return;
    }

    await query(sql);

}

export async function deleteRunningInstance(
    ri: RunningInstance.Id
) {

    await query([
        deleteRunningInstance.buildSql(ri),
        setRunningInstance.sqlTouchLock
    ].join("\n"));

}

export namespace deleteRunningInstance {

    export function buildSql(ri: RunningInstance.Id ){
        return [
        `DROP EVENT IF EXISTS ${RunningInstance.Id.buildEvtName(ri)};`,
        `DELETE FROM instance WHERE interface_address=${esc(ri.interfaceAddress)} AND daemon_number=${esc(ri.daemon_number)};`
        ].join("\n");
    }

}

/** This function should be call ONCE by instance */
export async function setRunningInstance(
    ri: RunningInstance
) {

    beforeExit.ri = ri;

    //TODO: enable event_scheduler elsewhere so we dont need all privileges
    let sql = [
        "SET GLOBAL event_scheduler = ON",
        ";",
        setRunningInstance.sqlTouchLock,
        ""
    ].join("\n");

    sql += buildInsertQuery("instance", {
        "interface_address": ri.interfaceAddress,
        "daemon_number": ri.daemon_number,
        "https_port": ri.httpsPort,
        "http_port": ri.httpPort,
        "sip_ua_port": ri.sipUaPort,
        "sip_gw_port": ri.sipGwPort,
        "inter_instances_port": ri.interInstancesPort
    }, "UPDATE");

    const sqlEvtInterval = "INTERVAL 7 SECOND";

    const evt_name = RunningInstance.Id.buildEvtName(ri);

    sql += [
        "",
        `CREATE EVENT IF NOT EXISTS ${evt_name}`,
        "   ON SCHEDULE",
        `       AT CURRENT_TIMESTAMP + ${sqlEvtInterval}`,
        "   DO",
        "   BEGIN",
        `       DELETE FROM instance`,
        `       WHERE interface_address=${esc(ri.interfaceAddress)}`,
        `       AND daemon_number=${esc(ri.daemon_number)}`,
        `       ;`,
        `       ${setRunningInstance.sqlTouch}`,
        "   END;",
        "",
    ].join("\n");

    await query(sql);

    beforeExit.timer_interval = setInterval(() => query([
        `ALTER EVENT ${evt_name}`,
        "   ON SCHEDULE",
        `       AT CURRENT_TIMESTAMP + ${sqlEvtInterval}`
    ].join("\n")), 5000);

}

export namespace setRunningInstance {

    export const sqlTouch = "UPDATE touch SET val=val+1;";

    export const sqlTouchLock = [
        "LOCK TABLES touch WRITE;",
        sqlTouch,
        "UNLOCK TABLES;"
    ].join("\n");


    /*
        export const sqlTouch = [
            "LOCK TABLE touch WRITE;\n",
            "INSERT INTO touch (val)",
            "SELECT max(val) + 1",
            "FROM touch",
            "ON DUPLICATE KEY UPDATE val = VALUES(val)",
            ";",
            "UNLOCK TABLES;\n"
        ].join(" ");
        */

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

            const sql = [
                "SELECT @current_touch_value:= val AS current_touch_value",
                "FROM touch",
                "WHERE id_= 'singleton'",
                ";",
                "SELECT *",
                "FROM instance",
                `WHERE @current_touch_value <> ${esc(previousTouchValue)}`,
                ";"
            ].join("\n");

            const [[{ current_touch_value }], rows] = await query(sql);

            if (current_touch_value !== previousTouchValue) {

                getEvtRunningInstances.__evt!.post(
                    getEvtRunningInstances.__rowsToRunningInstances(
                        rows
                    )
                );

            }

            previousTouchValue = current_touch_value;

            await new Promise<void>(
                resolve => {

                    const timer = setTimeout(() => {

                        beforeExit.timer_timeouts.delete(timer);

                        resolve();

                    }, 4000);

                    beforeExit.timer_timeouts.add(timer);

                }
            );

        }

    })();

    return getEvtRunningInstances();

}

export namespace getEvtRunningInstances {

    export let __evt: SyncEvent<RunningInstance[]> | undefined = undefined;

    export const __rowsToRunningInstances = (rows): RunningInstance[] =>
        rows.map(row => ({
            "interfaceAddress": row["interface_address"],
            "daemon_number": row["daemon_number"],
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

        const timer = setTimeout(
            async () => {

                beforeExit.timer_timeouts.delete(timer);

                __evt!.post(
                    __rowsToRunningInstances(
                        await query("SELECT * FROM instance")
                    )
                );

            },
            7000
        );

        beforeExit.timer_timeouts.add(timer);

    }

}
