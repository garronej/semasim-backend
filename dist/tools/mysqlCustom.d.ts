import * as mysql from "mysql";
export declare type TSql = string | number | null;
export declare type Lock = {
    [key: string]: (string | number) | (string | number)[];
};
export declare type InsertObj = Record<string, TSql | {
    "@": string;
}>;
export declare type Api = {
    query(sql: string, lockFor?: Lock): Promise<any>;
    esc(value: TSql): string;
    buildInsertQuery<T extends InsertObj>(table: string, objOrObjArray: T | T[], onDuplicateKeyAction: "IGNORE" | "UPDATE" | "THROW ERROR"): string;
    end(): Promise<void>;
};
export declare function createPoolAndGetApi(connectionConfig: mysql.ConnectionConfig, handleStringEncoding?: undefined | "HANDLE STRING ENCODING", connectionLimit?: number): Api;
export declare namespace bool {
    function enc(b: boolean): 0 | 1;
    function enc(b: undefined): null;
    function enc(b: boolean | undefined): 0 | 1 | null;
    function dec(t: 0 | 1): boolean;
    function dec(t: null): undefined;
    function dec(t: 0 | 1 | null): boolean | undefined;
}
