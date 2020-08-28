"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlers = void 0;
const core_1 = require("./core");
const webphoneData_1 = require("./webphoneData");
const dbWebphoneData_1 = require("../../dbWebphoneData");
const dbSemasim = require("../../dbSemasim");
const uaRemoteApiCaller = require("../remoteApiCaller");
exports.handlers = Object.assign(Object.assign({}, core_1.handlers), webphoneData_1.getHandlers(dbWebphoneData_1.dbWebphoneData, dbSemasim, uaRemoteApiCaller));
