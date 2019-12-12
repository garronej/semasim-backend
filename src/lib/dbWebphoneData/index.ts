
import * as mysqlCustom from "../../tools/mysqlCustom";

import { getApi, connectToDbAndGetMysqlApi } from "./impl";

let mysqlApi: mysqlCustom.Api;

export function launch(){

    mysqlApi = connectToDbAndGetMysqlApi("POOL")

}

export const dbWebphoneData = getApi(()=> mysqlApi);
