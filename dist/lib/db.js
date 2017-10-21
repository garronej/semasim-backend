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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
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
Object.defineProperty(exports, "__esModule", { value: true });
var mysql = require("mysql");
var RIPEMD160 = require("ripemd160");
var crypto = require("crypto");
var semasim_gateway_1 = require("../semasim-gateway");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_db");
var connection = undefined;
function query(sql, values) {
    if (!connection) {
        connection = mysql.createConnection(__assign({}, _constants_1.c.dbParamsBackend, { "multipleStatements": true }));
    }
    return semasim_gateway_1.mySqlFunctions.queryOnConnection(connection, sql, values);
}
/** For test purpose only */
function flush() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, query([
                        "DELETE FROM sim;",
                        "DELETE FROM dongle;",
                        "DELETE FROM user;"
                    ].join("\n"))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.flush = flush;
/** Return user.id_ or undefined */
function addUser(email, password) {
    return __awaiter(this, void 0, void 0, function () {
        var salt, hash, _a, sql, values, insertId, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, new Promise(function (resolve) { return crypto.randomBytes(8, function (_, buffer) {
                        return resolve(buffer.toString("hex"));
                    }); })];
                case 1:
                    salt = _c.sent();
                    hash = (new RIPEMD160()).update("" + password + salt).digest("hex");
                    _a = __read(semasim_gateway_1.mySqlFunctions.buildInsertQuery("user", {
                        "email": email.toLowerCase(),
                        salt: salt, hash: hash
                    }), 2), sql = _a[0], values = _a[1];
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, query(sql, values)];
                case 3:
                    insertId = (_c.sent()).insertId;
                    return [2 /*return*/, insertId];
                case 4:
                    _b = _c.sent();
                    return [2 /*return*/, undefined];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.addUser = addUser;
/** Return user.id_ or undefined if auth failed */
function authenticateUser(email, password) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, values, rows, _a, _b, id_, salt, hash;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    sql = [
                        "SELECT id_, salt, hash",
                        "FROM user",
                        "WHERE email=?"
                    ].join("\n");
                    values = [email.toLowerCase()];
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    rows = _c.sent();
                    if (!rows.length)
                        return [2 /*return*/, undefined];
                    _a = __read(rows, 1), _b = _a[0], id_ = _b.id_, salt = _b.salt, hash = _b.hash;
                    return [2 /*return*/, ((new RIPEMD160()).update("" + password + salt).digest("hex") === hash) ? id_ : undefined];
            }
        });
    });
}
exports.authenticateUser = authenticateUser;
function addEndpoint(dongle, user) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, values, dongle_ref, sim_ref, _a, _b, contact, _c, sql_, values_, e_1, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    sql = "";
                    values = [];
                    dongle_ref = "A";
                    (function () {
                        var _a = __read(semasim_gateway_1.mySqlFunctions.buildInsertOrUpdateQuery("dongle", {
                            "imei": dongle.imei,
                            "is_voice_enabled": semasim_gateway_1.mySqlFunctions.booleanOrUndefinedToSmallIntOrNull(dongle.isVoiceEnabled)
                        }), 2), sql_ = _a[0], values_ = _a[1];
                        sql += sql_ + [
                            "SELECT @" + dongle_ref + ":= id_",
                            "FROM dongle",
                            "WHERE imei= ?",
                            ";",
                            ""
                        ].join("\n");
                        values = __spread(values, values_, [dongle.imei]);
                    })();
                    sim_ref = "B";
                    (function () {
                        var sim = dongle.sim;
                        var _a = __read(semasim_gateway_1.mySqlFunctions.buildInsertOrUpdateQuery("sim", {
                            "iccid": sim.iccid,
                            "imsi": sim.imsi,
                            "service_provider": sim.serviceProvider || null,
                            "number": sim.number || null,
                            "contact_name_max_length": sim.phonebook.infos.contactNameMaxLength,
                            "number_max_length": sim.phonebook.infos.numberMaxLength,
                            "storage_left": sim.phonebook.infos.storageLeft
                        }), 2), sql_ = _a[0], values_ = _a[1];
                        sql += sql_ + [
                            "SELECT @" + sim_ref + ":= id_",
                            "FROM sim",
                            "WHERE sim.iccid= ?",
                            ";",
                            ""
                        ].join("\n");
                        values = __spread(values, values_, [sim.iccid]);
                    })();
                    (function () {
                        //TODO: transaction if user delete...
                        var _a = __read(semasim_gateway_1.mySqlFunctions.buildInsertOrUpdateQuery("endpoint", {
                            "dongle": { "@": dongle_ref },
                            "sim": { "@": sim_ref },
                            "user": user
                        }), 2), sql_ = _a[0], values_ = _a[1];
                        sql += sql_;
                        values = __spread(values, values_);
                    })();
                    try {
                        for (_a = __values(dongle.sim.phonebook.contacts), _b = _a.next(); !_b.done; _b = _a.next()) {
                            contact = _b.value;
                            _c = __read(semasim_gateway_1.mySqlFunctions.buildInsertOrUpdateQuery("contact", {
                                "sim": { "@": sim_ref },
                                "number": contact.number,
                                "base64_name": (new Buffer(contact.name, "utf8")).toString("base64"),
                                "mem_index": contact.index
                            }), 2), sql_ = _c[0], values_ = _c[1];
                            sql += sql_;
                            values = __spread(values, values_);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.addEndpoint = addEndpoint;
function getEndpoints(user) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, values, rows, dongles, i, row, dongle, contacts, endpointId_, row_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = [
                        "SELECT",
                        "endpoint.id_,",
                        "dongle.imei,",
                        "dongle.is_voice_enabled,",
                        "sim.iccid,",
                        "sim.imsi,",
                        "sim.service_provider,",
                        "sim.number AS sim_number,",
                        "sim.contact_name_max_length,",
                        "sim.number_max_length,",
                        "sim.storage_left,",
                        "contact.number,",
                        "contact.base64_name,",
                        "contact.mem_index",
                        "FROM endpoint",
                        "INNER JOIN dongle ON dongle.id_= endpoint.dongle",
                        "INNER JOIN sim ON sim.id_= endpoint.sim",
                        "INNER JOIN user ON user.id_= endpoint.user",
                        "LEFT JOIN contact ON contact.sim= sim.id_",
                        "WHERE user.id_= ?",
                        "ORDER BY endpoint.id_"
                    ].join("\n");
                    values = [user];
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    rows = _a.sent();
                    dongles = [];
                    for (i = 0; i < rows.length;) {
                        row = rows[i];
                        dongle = {
                            "imei": row["imei"],
                            "isVoiceEnabled": semasim_gateway_1.mySqlFunctions.smallIntOrNullToBooleanOrUndefined(row["is_voice_enabled"]),
                            "sim": {
                                "iccid": row["iccid"],
                                "imsi": row["imsi"],
                                "number": row["sim_number"] || undefined,
                                "serviceProvider": row["service_provider"] || undefined,
                                "phonebook": {
                                    "infos": {
                                        "contactNameMaxLength": row["contact_name_max_length"],
                                        "numberMaxLength": row["number_max_length"],
                                        "storageLeft": row["storage_left"]
                                    },
                                    "contacts": []
                                }
                            }
                        };
                        dongles.push(dongle);
                        if (row["mem_index"] === null) {
                            i++;
                            continue;
                        }
                        contacts = dongle.sim.phonebook.contacts;
                        endpointId_ = row["id_"];
                        for (; i < rows.length && rows[i]["id_"] === endpointId_; i++) {
                            row_1 = rows[i];
                            contacts.push({
                                "index": row_1["mem_index"],
                                "name": (new Buffer(row_1["base64_name"], "base64")).toString("utf8"),
                                "number": row_1["number"]
                            });
                        }
                    }
                    return [2 /*return*/, dongles];
            }
        });
    });
}
exports.getEndpoints = getEndpoints;
function deleteUser(user) {
    return __awaiter(this, void 0, void 0, function () {
        var affectedRows, isDeleted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, query("DELETE FROM user WHERE id = ?", [user])];
                case 1:
                    affectedRows = (_a.sent()).affectedRows;
                    isDeleted = affectedRows !== 0;
                    console.log({ isDeleted: isDeleted });
                    return [2 /*return*/, isDeleted];
            }
        });
    });
}
exports.deleteUser = deleteUser;
function deleteEndpoint(imei, user) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, values, affectedRows, isDeleted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = [
                        "DELETE endpoint.*",
                        "FROM endpoint",
                        "INNER JOIN dongle ON dongle.id_= endpoint.dongle",
                        "WHERE dongle.imei= ? AND endpoint.user= ?"
                    ].join("\n");
                    values = [imei, user];
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    affectedRows = (_a.sent()).affectedRows;
                    isDeleted = affectedRows ? true : false;
                    return [2 /*return*/, isDeleted];
            }
        });
    });
}
exports.deleteEndpoint = deleteEndpoint;
