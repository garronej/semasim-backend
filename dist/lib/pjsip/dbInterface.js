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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var ts_exec_queue_1 = require("ts-exec-queue");
var mysql = require("mysql");
exports.callContext = "from-sip-call";
exports.messageContext = "from-sip-message";
exports.subscribeContext = function (imei) { return "from-sip-subscribe-" + imei; };
var _debug = require("debug");
var debug = _debug("_pjsip/dbInterface");
var dbParams = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "abcde12345"
};
var connection = mysql.createConnection(__assign({}, dbParams, { "database": "asterisk", "multipleStatements": true }));
function query(sql, values) {
    return new Promise(function (resolve, reject) {
        var r = connection.query(sql, values || [], function (err, results) { return err ? reject(err) : resolve(results); });
    });
}
var cluster = {};
var group = "DB_ACCESS";
exports.queryEndpoints = ts_exec_queue_1.execQueue(cluster, group, function (callback) { return __awaiter(_this, void 0, void 0, function () {
    var res, endpoints;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, query("SELECT `id`,`set_var` FROM `ps_endpoints`")];
            case 1:
                res = _a.sent();
                endpoints = res.map(function (_a) {
                    var id = _a.id, set_var = _a.set_var;
                    return ({ "endpoint": id, "lastUpdated": parseInt(set_var.split("=")[1]) });
                });
                callback(endpoints);
                return [2 /*return*/, endpoints];
        }
    });
}); });
exports.truncateContacts = ts_exec_queue_1.execQueue(cluster, group, function (callback) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, query("TRUNCATE ps_contacts")];
            case 1:
                _a.sent();
                callback();
                return [2 /*return*/];
        }
    });
}); });
exports.queryContacts = ts_exec_queue_1.execQueue(cluster, group, function (callback) { return __awaiter(_this, void 0, void 0, function () {
    var contacts, contacts_1, contacts_1_1, contact, e_1, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, query("SELECT `id`,`uri`,`path`,`endpoint`,`user_agent` FROM `ps_contacts`")];
            case 1:
                contacts = _b.sent();
                try {
                    for (contacts_1 = __values(contacts), contacts_1_1 = contacts_1.next(); !contacts_1_1.done; contacts_1_1 = contacts_1.next()) {
                        contact = contacts_1_1.value;
                        contact.uri = contact.uri.replace(/\^3B/g, ";");
                        contact.path = contact.path.replace(/\^3B/g, ";");
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (contacts_1_1 && !contacts_1_1.done && (_a = contacts_1.return)) _a.call(contacts_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                callback(contacts);
                return [2 /*return*/, contacts];
        }
    });
}); });
exports.deleteContact = ts_exec_queue_1.execQueue(cluster, group, function (id, callback) { return __awaiter(_this, void 0, void 0, function () {
    var affectedRows, isDeleted;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, query("DELETE FROM `ps_contacts` WHERE `id`=?", [id])];
            case 1:
                affectedRows = (_a.sent()).affectedRows;
                isDeleted = affectedRows ? true : false;
                callback(isDeleted);
                return [2 /*return*/, isDeleted];
        }
    });
}); });
function generateQueryInsert(table, values) {
    var keys = Object.keys(values);
    var backtickKeys = keys.map(function (key) { return "`" + key + "`"; });
    var queryLines = [
        "INSERT INTO " + table + " ( " + backtickKeys.join(", ") + " )",
        "VALUES ( " + keys.map(function () { return "?"; }).join(", ") + " )",
        "ON DUPLICATE KEY UPDATE",
        backtickKeys.map(function (backtickKey) { return backtickKey + " = VALUES(" + backtickKey + ")"; }).join(", "),
        ";"
    ];
    return [
        queryLines.join("\n"),
        keys.map(function (key) { return values[key]; })
    ];
}
exports.addOrUpdateEndpoint = ts_exec_queue_1.execQueue(cluster, group, function (endpoint, isDongleConnected, callback) { return __awaiter(_this, void 0, void 0, function () {
    var queryLine, values;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                debug("Add or update endpoint " + endpoint + " in real time configuration");
                queryLine = "";
                values = [];
                (function () {
                    var _a = __read(generateQueryInsert("ps_aors", {
                        "id": endpoint,
                        "max_contacts": 12,
                        "qualify_frequency": 15000,
                        "support_path": "yes"
                    }), 2), _query = _a[0], _values = _a[1];
                    queryLine += "\n" + _query;
                    values = __spread(values, _values);
                })();
                (function () {
                    var _a = __read(generateQueryInsert("ps_endpoints", {
                        "id": endpoint,
                        "disallow": "all",
                        "allow": "alaw,ulaw",
                        "context": exports.callContext,
                        "message_context": exports.messageContext,
                        "subscribe_context": exports.subscribeContext(endpoint),
                        "aors": endpoint,
                        "auth": endpoint,
                        "force_rport": null,
                        "from_domain": "semasim.com",
                        "ice_support": "yes",
                        "direct_media": null,
                        "asymmetric_rtp_codec": null,
                        "rtcp_mux": null,
                        "direct_media_method": null,
                        "connected_line_method": null,
                        "transport": "transport-tcp",
                        "callerid_tag": null
                    }), 2), _query = _a[0], _values = _a[1];
                    if (isDongleConnected) {
                        _query += [
                            "UPDATE `ps_endpoints` SET `set_var` = ? WHERE `id` = ?",
                            ";"
                        ].join("\n");
                        _values = __spread(_values, ["LAST_UPDATED=" + Date.now(), endpoint]);
                    }
                    queryLine += "\n" + _query;
                    values = __spread(values, _values);
                })();
                (function () {
                    var _a = __read(generateQueryInsert("ps_auths", {
                        "id": endpoint,
                        "auth_type": "userpass",
                        "username": endpoint,
                        "password": "password",
                        "realm": "semasim"
                    }), 2), _query = _a[0], _values = _a[1];
                    queryLine += "\n" + _query;
                    values = __spread(values, _values);
                })();
                return [4 /*yield*/, query(queryLine, values)];
            case 1:
                _a.sent();
                callback();
                return [2 /*return*/];
        }
    });
}); });
