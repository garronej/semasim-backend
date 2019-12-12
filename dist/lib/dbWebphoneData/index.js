"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const impl_1 = require("./impl");
let mysqlApi;
function launch() {
    mysqlApi = impl_1.connectToDbAndGetMysqlApi("POOL");
}
exports.launch = launch;
exports.dbWebphoneData = impl_1.getApi(() => mysqlApi);
