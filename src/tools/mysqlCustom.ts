import * as mysql from "mysql";
import * as AsyncLock from "async-lock";

export type TSql = string | number | null;

export type Lock= { [key: string]: (string | number) | (string | number )[]; };

export type InsertObj= Record<string, TSql | { "@": string; }>;

export type Api= {
    query( sql: string, lockFor?: Lock ): Promise<any>;
    esc(value: TSql): string;
    buildInsertQuery<T extends InsertObj>(
        table: string,
        objOrObjArray: T | T[],
        onDuplicateKeyAction: "IGNORE" | "UPDATE" | "THROW ERROR"
    ): string;
    end(): Promise<void>;
};

export function createPoolAndGetApi(
    connectionConfig: mysql.ConnectionConfig,
    handleStringEncoding: undefined | "HANDLE STRING ENCODING" = undefined,
    connectionLimit= 50
): Api {

    const pool= mysql.createPool({
        ...connectionConfig,
        "multipleStatements": true,
        connectionLimit
    });

    const end = () => new Promise<void>(
        (resolve, reject) => pool.end(
            error => !error ? resolve() : reject(error)
        )
    );

    const esc: Api["esc"] =
        value => {

            if (handleStringEncoding && typeof value === "string") {

                value = Buffer.from(value, "utf8").toString("binary");

            }

            return mysql.escape(value);

        };

    const buildInsertQuery: Api["buildInsertQuery"] =
        (table, objOrObjArray, onDuplicateKeyAction) => {

            const objArray: InsertObj[]= objOrObjArray instanceof Array ? objOrObjArray : [ objOrObjArray ];

            const keys = Object.keys(objArray[0])
                .filter(key => objArray[0][key] !== undefined);

            const backtickKeys = keys.map(key => "`" + key + "`");

            if( objArray.length === 0 ){
                return "";
            }

            let sqlLinesArray = [
                `INSERT ${(onDuplicateKeyAction === "IGNORE") ? "IGNORE " : ""}INTO \`${table}\` ( ${backtickKeys.join(", ")} )`,
                `VALUES`,
                objArray.map(obj =>
                    (`    ( ${keys.map(key => (obj[key] instanceof Object) ? ("@`" + obj[key]!["@"] + "`") : esc(obj[key] as TSql)).join(", ")})`)
                ).join(",\n")
            ];

            if (onDuplicateKeyAction === "UPDATE") {
                sqlLinesArray = [
                    ...sqlLinesArray,
                    "ON DUPLICATE KEY UPDATE",
                    backtickKeys.map(backtickKey => `${backtickKey} = VALUES(${backtickKey})`).join(", ")
                ];
            }

            sqlLinesArray[sqlLinesArray.length] = ";\n";

            return sqlLinesArray.join("\n");

        };

    const query: Api["query"] = (() => {

        const queryTransaction = (sql: string) => new Promise((resolve, reject) => {

            if (isSelectOnly(sql) || 1 === 1) {
                //if (isSelectOnly(sql)) {

                pool.query(sql, (error, results) => {

                    if (error) {

                        reject(error);
                        return;

                    }

                    if (!!handleStringEncoding) {

                        decodeResults(results);

                    }

                    resolve(results);

                }
                );

            } else {

                pool.getConnection((error, connection) => {

                    if (!!error) {
                        throw error;
                    }

                    connection.query("START TRANSACTION", error => {

                        if (!!error) {

                            connection.release();

                            throw error;

                        }

                        connection.query(sql, (queryError, results) => {

                            if (!!queryError) {

                                connection.query("ROLLBACK", error => {

                                    connection.release();

                                    if (!!error) {
                                        throw error;
                                    }

                                    reject(queryError);

                                });

                                return;

                            }

                            connection.query("COMMIT", error => {

                                connection.release();

                                if (!!error) {

                                    throw error;

                                }

                                if (!!handleStringEncoding) {

                                    decodeResults(results);

                                }

                                resolve(results)

                            });


                        });


                    });

                })

            }

        });

        const asyncLock = new AsyncLock();

        return (sql: string, lockFor: Lock) => {

            if (lockFor === undefined) {

                return queryTransaction(sql);

            } else {

                return asyncLock.acquire(
                    buildKeys(lockFor),
                    () => queryTransaction(sql)
                );

            }

        };

    })();

    query([
        "DROP FUNCTION IF EXISTS _ASSERT;",
        "CREATE FUNCTION _ASSERT(bool INTEGER, message VARCHAR(256))",
        "   RETURNS INTEGER DETERMINISTIC",
        "BEGIN",
        "    IF bool IS NULL OR bool = 0 THEN",
        "        SIGNAL SQLSTATE 'ERR0R' SET MESSAGE_TEXT = message;",
        "    END IF;",
        "    RETURN bool;",
        "END;"
    ].join("\n")).catch(() => {});

    return { query, esc, buildInsertQuery, end };

}



function decodeResults(results: any): void {

    if (!(results instanceof Array) || !results.length) {
        return;
    }

    const decodeOkPacketsStrings = (rows: any[]) => {

        for (let row of rows) {

            for (let key in row) {

                if (typeof row[key] === "string") {

                    row[key] = Buffer.from(row[key], "binary").toString("utf8");

                }

            }

        }

    };


    if (Object.getPrototypeOf(results[0]).constructor.name === "RowDataPacket") {

        decodeOkPacketsStrings(results);

    } else {

        for (let result of results) {

            if (result instanceof Array) {

                decodeOkPacketsStrings(result);

            }

        }

    }


}

function buildKeys(lockFor: Lock): string[] {

    const keys: string[] = [];

    const push = (key: string, value: string | number) => keys.push(`${key}=${value}`);

    for (const key in lockFor) {

        const value = lockFor[key];

        if (value instanceof Array) {

            const values = value;

            for (const value of values) {

                push(key, value);

            }

        } else {

            push(key, value);

        }


    }

    return keys;

};

function isSelectOnly(sql: string): boolean {

    return !sql.split(";")
        .map(sql => sql.replace(/^[\n]+/, "").replace(/[\n]+$/, ""))
        .filter(sql => !!sql)
        .find(sql => !sql.match(/^SELECT/))
        ;


}


export namespace bool {

    export function enc(b: boolean): 0 | 1;
    export function enc(b: undefined): null;
    export function enc(b: boolean | undefined): 0 | 1 | null;
    export function enc(b: boolean | undefined): 0 | 1 | null {
        return (b === undefined) ? null : (b ? 1 : 0);
    }

    export function dec(t: 0 | 1): boolean;
    export function dec(t: null): undefined;
    export function dec(t: 0 | 1 | null): boolean | undefined;
    export function dec(t: 0 | 1 | null): boolean | undefined {
        return (t === null) ? undefined : (t === 1);
    }

}
