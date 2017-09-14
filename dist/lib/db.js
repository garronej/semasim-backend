"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var mysql = require("mysql");
var md5 = require("md5");
var semasim_gateway_1 = require("../semasim-gateway");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_db");
var semasim_backend;
(function (semasim_backend) {
    var connection = undefined;
    function query(sql, values) {
        if (!connection) {
            connection = mysql.createConnection(__assign({}, _constants_1.c.dbParamsBackend, { "multipleStatements": true }));
        }
        return semasim_gateway_1.mySqlFunctions.queryOnConnection(connection, sql, values);
    }
    function computePasswordMd5(email, password) {
        return md5(">" + email.toLowerCase() + "<>" + password + "<");
    }
    function addUser(email, password) {
        return __awaiter(this, void 0, void 0, function () {
            var password_md5, _a, sql, values, insertId, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        debug("=>addUser");
                        password_md5 = computePasswordMd5(email, password);
                        _a = __read(semasim_gateway_1.mySqlFunctions.buildInsertQuery("user", { email: email, password_md5: password_md5 }), 2), sql = _a[0], values = _a[1];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, query(sql, values)];
                    case 2:
                        insertId = (_b.sent()).insertId;
                        console.log("user added");
                        return [2 /*return*/, insertId];
                    case 3:
                        error_1 = _b.sent();
                        console.log("user exist");
                        return [2 /*return*/, 0];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    semasim_backend.addUser = addUser;
    function deleteUser(user_id) {
        return __awaiter(this, void 0, void 0, function () {
            var affectedRows, isDeleted;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("=>deleteUser");
                        return [4 /*yield*/, query("DELETE FROM user WHERE `id` = ?", [user_id])];
                    case 1:
                        affectedRows = (_a.sent()).affectedRows;
                        isDeleted = affectedRows !== 0;
                        console.log({ isDeleted: isDeleted });
                        return [2 /*return*/, isDeleted];
                }
            });
        });
    }
    semasim_backend.deleteUser = deleteUser;
    function getUserIdIfGranted(email, password) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, id, password_md5, error_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        debug("=>getUserIdIfGranted");
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, query("SELECT `id`, `password_md5` from `user` WHERE `email`= ?", [email])];
                    case 2:
                        _a = __read.apply(void 0, [_c.sent(), 1]), _b = _a[0], id = _b.id, password_md5 = _b.password_md5;
                        if (password_md5 === computePasswordMd5(email, password))
                            return [2 /*return*/, id];
                        else {
                            debug("Wrong pass");
                            return [2 /*return*/, 0];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _c.sent();
                        debug("user not found");
                        return [2 /*return*/, 0];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    semasim_backend.getUserIdIfGranted = getUserIdIfGranted;
    //TODO: test if an other user add same device
    function addEndpointConfig(user_id, _a) {
        var dongle_imei = _a.dongle_imei, sim_iccid = _a.sim_iccid, sim_service_provider = _a.sim_service_provider, sim_number = _a.sim_number;
        return __awaiter(this, void 0, void 0, function () {
            var _a, sql, values, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        debug("=>addEndpointConfig");
                        _a = __read(semasim_gateway_1.mySqlFunctions.buildInsertOrUpdateQuery("endpoint_config", {
                            user_id: user_id,
                            dongle_imei: dongle_imei,
                            sim_iccid: sim_iccid,
                            sim_service_provider: sim_service_provider,
                            sim_number: sim_number
                        }), 2), sql = _a[0], values = _a[1];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, query(sql, values)];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_3 = _b.sent();
                        debug("User does not exist");
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    semasim_backend.addEndpointConfig = addEndpointConfig;
    function deleteEndpointConfig(user_id, imei) {
        return __awaiter(this, void 0, void 0, function () {
            var affectedRows, isDeleted;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("=>deleteEndpointConfig");
                        return [4 /*yield*/, query("DELETE FROM endpoint_config WHERE `user_id`=? AND `dongle_imei`=?", [user_id, imei])];
                    case 1:
                        affectedRows = (_a.sent()).affectedRows;
                        isDeleted = affectedRows ? true : false;
                        return [2 /*return*/, isDeleted];
                }
            });
        });
    }
    semasim_backend.deleteEndpointConfig = deleteEndpointConfig;
    function getUserEndpointConfigs(user_id) {
        debug("=>getUserConfigs");
        return query([
            "SELECT `dongle_imei`, `sim_iccid`, `sim_service_provider`, `sim_number`",
            "FROM endpoint_config",
            "WHERE `user_id`= ?"
        ].join("\n"), [user_id]);
    }
    semasim_backend.getUserEndpointConfigs = getUserEndpointConfigs;
    function getSimContacts(sim_iccid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("=>getSimContacts");
                        return [4 /*yield*/, query([
                                "SELECT `index`, `number`, `base64_name`",
                                "FROM sim_contact",
                                "WHERE `sim_iccid`= ?",
                            ].join("\n"), [sim_iccid])];
                    case 1: return [2 /*return*/, (_a.sent())
                            .map(function (_a) {
                            var base64_name = _a.base64_name, rest = __rest(_a, ["base64_name"]);
                            return (__assign({}, rest, { "name": (new Buffer(base64_name, "base64")).toString("utf8") }));
                        })];
                }
            });
        });
    }
    semasim_backend.getSimContacts = getSimContacts;
    function setSimContacts(sim_iccid, contacts) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, values, contacts_1, contacts_1_1, _a, index, number, name_1, _b, _sql, _values, error_4, e_1, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        debug("=>setSimContacts");
                        sql = "";
                        values = [];
                        try {
                            for (contacts_1 = __values(contacts), contacts_1_1 = contacts_1.next(); !contacts_1_1.done; contacts_1_1 = contacts_1.next()) {
                                _a = contacts_1_1.value, index = _a.index, number = _a.number, name_1 = _a.name;
                                _b = __read(semasim_gateway_1.mySqlFunctions.buildInsertOrUpdateQuery("sim_contact", {
                                    sim_iccid: sim_iccid,
                                    index: index,
                                    number: number,
                                    "base64_name": (new Buffer(name_1, "utf8")).toString("base64")
                                }), 2), _sql = _b[0], _values = _b[1];
                                sql += _sql;
                                values = __spread(values, _values);
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (contacts_1_1 && !contacts_1_1.done && (_c = contacts_1.return)) _c.call(contacts_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, query(sql, values)];
                    case 2:
                        _d.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_4 = _d.sent();
                        debug("Config fos SIM does not exist");
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    semasim_backend.setSimContacts = setSimContacts;
})(semasim_backend = exports.semasim_backend || (exports.semasim_backend = {}));
