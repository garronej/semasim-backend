"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("mysql");
const AsyncLock = require("async-lock");
function createPoolAndGetApi(connectionConfig, handleStringEncoding = undefined, connectionLimit = 50) {
    const pool = mysql.createPool(Object.assign(Object.assign({}, connectionConfig), { "multipleStatements": true, connectionLimit }));
    const end = () => new Promise((resolve, reject) => pool.end(error => !error ? resolve() : reject(error)));
    const esc = value => {
        if (handleStringEncoding && typeof value === "string") {
            value = Buffer.from(value, "utf8").toString("binary");
        }
        return mysql.escape(value);
    };
    const buildInsertQuery = (table, objOrObjArray, onDuplicateKeyAction) => {
        const objArray = objOrObjArray instanceof Array ? objOrObjArray : [objOrObjArray];
        const keys = Object.keys(objArray[0])
            .filter(key => objArray[0][key] !== undefined);
        const backtickKeys = keys.map(key => "`" + key + "`");
        if (objArray.length === 0) {
            return "";
        }
        let sqlLinesArray = [
            `INSERT ${(onDuplicateKeyAction === "IGNORE") ? "IGNORE " : ""}INTO \`${table}\` ( ${backtickKeys.join(", ")} )`,
            `VALUES`,
            objArray.map(obj => (`    ( ${keys.map(key => (obj[key] instanceof Object) ? ("@`" + obj[key]["@"] + "`") : esc(obj[key])).join(", ")})`)).join(",\n")
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
    const query = (() => {
        const queryTransaction = (sql) => new Promise((resolve, reject) => {
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
                });
            }
            else {
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
                                resolve(results);
                            });
                        });
                    });
                });
            }
        });
        const asyncLock = new AsyncLock();
        return (sql, lockFor) => {
            if (lockFor === undefined) {
                return queryTransaction(sql);
            }
            else {
                return asyncLock.acquire(buildKeys(lockFor), () => queryTransaction(sql));
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
    ].join("\n")).catch(() => { });
    return { query, esc, buildInsertQuery, end };
}
exports.createPoolAndGetApi = createPoolAndGetApi;
function decodeResults(results) {
    if (!(results instanceof Array) || !results.length) {
        return;
    }
    const decodeOkPacketsStrings = (rows) => {
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
    }
    else {
        for (let result of results) {
            if (result instanceof Array) {
                decodeOkPacketsStrings(result);
            }
        }
    }
}
function buildKeys(lockFor) {
    const keys = [];
    const push = (key, value) => keys.push(`${key}=${value}`);
    for (const key in lockFor) {
        const value = lockFor[key];
        if (value instanceof Array) {
            const values = value;
            for (const value of values) {
                push(key, value);
            }
        }
        else {
            push(key, value);
        }
    }
    return keys;
}
;
function isSelectOnly(sql) {
    return !sql.split(";")
        .map(sql => sql.replace(/^[\n]+/, "").replace(/[\n]+$/, ""))
        .filter(sql => !!sql)
        .find(sql => !sql.match(/^SELECT/));
}
var bool;
(function (bool) {
    function enc(b) {
        return (b === undefined) ? null : (b ? 1 : 0);
    }
    bool.enc = enc;
    function dec(t) {
        return (t === null) ? undefined : (t === 1);
    }
    bool.dec = dec;
})(bool = exports.bool || (exports.bool = {}));
