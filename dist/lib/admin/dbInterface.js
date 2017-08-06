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
Object.defineProperty(exports, "__esModule", { value: true });
var ts_exec_queue_1 = require("ts-exec-queue");
var mysql = require("mysql");
var endpointsContacts_1 = require("./endpointsContacts");
exports.callContext = "from-sip-call";
exports.messageContext = "from-sip-message";
exports.subscribeContext = function (imei) { return "from-sip-subscribe-" + imei; };
var _debug = require("debug");
var debug = _debug("_admin/dbInterface");
var dbParams = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "abcde12345"
};
var cluster = {};
function queryOnConnection(connection, sql, values) {
    return new Promise(function (resolve, reject) {
        var r = connection.query(sql, values || [], function (err, results) { return err ? reject(err) : resolve(results); });
    });
}
function buildInsertQuery(table, values) {
    var keys = Object.keys(values);
    var backtickKeys = keys.map(function (key) { return "`" + key + "`"; });
    var sqlLinesArray = [
        "INSERT INTO " + table + " ( " + backtickKeys.join(", ") + " )",
        "VALUES ( " + keys.map(function () { return "?"; }).join(", ") + " )",
        "ON DUPLICATE KEY UPDATE",
        backtickKeys.map(function (backtickKey) { return backtickKey + " = VALUES(" + backtickKey + ")"; }).join(", "),
        ";"
    ];
    return [
        sqlLinesArray.join("\n"),
        keys.map(function (key) { return values[key]; })
    ];
}
var dbAsterisk;
(function (dbAsterisk) {
    var _this = this;
    var group = "ASTERISK";
    var connection = undefined;
    function query(sql, values) {
        if (!connection) {
            connection = mysql.createConnection(__assign({}, dbParams, { "database": "asterisk", "multipleStatements": true }));
        }
        return queryOnConnection(connection, sql, values);
    }
    dbAsterisk.queryEndpoints = ts_exec_queue_1.execQueue(cluster, group, function (callback) { return __awaiter(_this, void 0, void 0, function () {
        var res, endpoints;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, query("SELECT `id`,`set_var` FROM `ps_endpoints`")];
                case 1:
                    res = _a.sent();
                    endpoints = res.map(function (_a) {
                        var id = _a.id, set_var = _a.set_var;
                        return ({ "endpoint": id, "lastUpdated": new Date(parseInt(set_var.split("=")[1])) });
                    });
                    callback(endpoints);
                    return [2 /*return*/, endpoints];
            }
        });
    }); });
    dbAsterisk.truncateContacts = ts_exec_queue_1.execQueue(cluster, group, function (callback) { return __awaiter(_this, void 0, void 0, function () {
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
    dbAsterisk.queryContacts = ts_exec_queue_1.execQueue(cluster, group, function (callback) { return __awaiter(_this, void 0, void 0, function () {
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
    dbAsterisk.deleteContact = ts_exec_queue_1.execQueue(cluster, group, function (id, callback) { return __awaiter(_this, void 0, void 0, function () {
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
    //TODO: isDongle connected is a stupid option
    dbAsterisk.addOrUpdateEndpoint = ts_exec_queue_1.execQueue(cluster, group, function (endpoint, isDongleConnected, callback) { return __awaiter(_this, void 0, void 0, function () {
        var sql, values;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("Add or update endpoint " + endpoint + " in real time configuration");
                    sql = "";
                    values = [];
                    (function () {
                        var _a = __read(buildInsertQuery("ps_aors", {
                            "id": endpoint,
                            "max_contacts": 12,
                            "qualify_frequency": 0,
                            "support_path": "yes"
                        }), 2), _sql = _a[0], _values = _a[1];
                        sql += "\n" + _sql;
                        values = __spread(values, _values);
                    })();
                    (function () {
                        /*
                        let [_sql, _values] = buildInsertQuery("ps_endpoints", {
                            "id": endpoint,
                            "disallow": "all",
                            "allow": "alaw,ulaw",
                            "context": callContext,
                            "message_context": messageContext,
                            "subscribe_context": subscribeContext(endpoint),
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
                        });
        
                        if (isDongleConnected) {
        
                            _sql += [
                                "UPDATE `ps_endpoints` SET `set_var` = ? WHERE `id` = ?",
                                ";"
                            ].join("\n");
        
                            _values = [..._values, `LAST_UPDATED=${Date.now()}`, endpoint];
        
                        }
                        */
                        var _a = __read(buildInsertQuery("ps_endpoints", {
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
                        }), 2), _sql = _a[0], _values = _a[1];
                        sql += "\n" + _sql;
                        values = __spread(values, _values);
                    })();
                    (function () {
                        var _a = __read(buildInsertQuery("ps_auths", {
                            "id": endpoint,
                            "auth_type": "userpass",
                            "username": endpoint,
                            "password": "password",
                            "realm": "semasim"
                        }), 2), _sql = _a[0], _values = _a[1];
                        sql += "\n" + _sql;
                        values = __spread(values, _values);
                    })();
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    _a.sent();
                    callback();
                    return [2 /*return*/];
            }
        });
    }); });
})(dbAsterisk = exports.dbAsterisk || (exports.dbAsterisk = {}));
var dbSemasim;
(function (dbSemasim) {
    var _this = this;
    var group = "SEMASIM";
    var connection = undefined;
    function query(sql, values) {
        if (!connection) {
            connection = mysql.createConnection(__assign({}, dbParams, { "database": "semasim", "multipleStatements": true }));
        }
        return queryOnConnection(connection, sql, values);
    }
    dbSemasim.addDongleIfNew = ts_exec_queue_1.execQueue(cluster, group, function (imei, callback) { return __awaiter(_this, void 0, void 0, function () {
        var _a, sql, values;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    debug("enter add dongle if new");
                    _a = __read(buildInsertQuery("dongles", { imei: imei }), 2), sql = _a[0], values = _a[1];
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    _b.sent();
                    callback();
                    return [2 /*return*/];
            }
        });
    }); });
    dbSemasim.addContactIfNew = ts_exec_queue_1.execQueue(cluster, group, function (contact, callback) { return __awaiter(_this, void 0, void 0, function () {
        var instanceid, dongles_imei, _a, sql, values;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    debug("enter add contact if new");
                    instanceid = endpointsContacts_1.Contact.readInstanceId(contact);
                    dongles_imei = contact.endpoint;
                    _a = __read(buildInsertQuery("contacts", { instanceid: instanceid, dongles_imei: dongles_imei }), 2), sql = _a[0], values = _a[1];
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    _b.sent();
                    callback();
                    return [2 /*return*/];
            }
        });
    }); });
    function addNotificationAndGetId(notification) {
        return __awaiter(this, void 0, void 0, function () {
            var dongles_imei, date, payload, _a, sql, values, _b, id;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        debug("addNotificationAndGetId", { notification: notification });
                        dongles_imei = notification.endpoint;
                        date = notification.date;
                        payload = notification.payload;
                        _a = __read(buildInsertQuery("notifications", { dongles_imei: dongles_imei, date: date, payload: payload }), 2), sql = _a[0], values = _a[1];
                        debug("1");
                        return [4 /*yield*/, query(sql, values)];
                    case 1:
                        _c.sent();
                        debug("2");
                        return [4 /*yield*/, query("SELECT `id` FROM `notifications` WHERE `dongles_imei`=? AND `date`=?", [dongles_imei, date])];
                    case 2:
                        _b = __read.apply(void 0, [_c.sent(), 1]), id = _b[0].id;
                        debug("3");
                        return [2 /*return*/, id];
                }
            });
        });
    }
    function addNotificationAsUndelivered() {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return _addNotificationAsUndelivered_(inputs[0], inputs[1]);
    }
    dbSemasim.addNotificationAsUndelivered = addNotificationAsUndelivered;
    var _addNotificationAsUndelivered_ = ts_exec_queue_1.execQueue(cluster, group, function (notification, contact, callback) { return __awaiter(_this, void 0, void 0, function () {
        var notifications_id, contacts, sql, values, contacts_2, contacts_2_1, id, _a, _sql, _values, e_2, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, addNotificationAndGetId(notification)];
                case 1:
                    notifications_id = _c.sent();
                    if (!contact) return [3 /*break*/, 3];
                    return [4 /*yield*/, query("SELECT `id`, `instanceid` FROM contacts WHERE `dongles_imei`=? AND `instanceid`= ?", [notification.endpoint, endpointsContacts_1.Contact.readInstanceId(contact)])];
                case 2:
                    contacts = _c.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, query("SELECT `id`, `instanceid` FROM contacts WHERE `dongles_imei`=?", [notification.endpoint])];
                case 4:
                    contacts = _c.sent();
                    _c.label = 5;
                case 5:
                    sql = "";
                    values = [];
                    try {
                        for (contacts_2 = __values(contacts), contacts_2_1 = contacts_2.next(); !contacts_2_1.done; contacts_2_1 = contacts_2.next()) {
                            id = contacts_2_1.value.id;
                            _a = __read(buildInsertQuery("contacts_notifications", {
                                "contacts_id": id, notifications_id: notifications_id, "delivered": 0
                            }), 2), _sql = _a[0], _values = _a[1];
                            sql += "\n" + _sql;
                            values = __spread(values, _values);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (contacts_2_1 && !contacts_2_1.done && (_b = contacts_2.return)) _b.call(contacts_2);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    return [4 /*yield*/, query(sql, values)];
                case 6:
                    _c.sent();
                    callback();
                    return [2 /*return*/];
            }
        });
    }); });
    dbSemasim.getUndeliveredNotificationsOfContact = ts_exec_queue_1.execQueue(cluster, group, function (contact, callback) { return __awaiter(_this, void 0, void 0, function () {
        var instanceid, notifications;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("enter get undelivered");
                    instanceid = endpointsContacts_1.Contact.readInstanceId(contact);
                    return [4 /*yield*/, query([
                            "SELECT notifications.`dongles_imei` AS `endpoints`, notifications.`date`, notifications.`payload`",
                            "FROM notifications",
                            "INNER JOIN contacts_notifications ON contacts_notifications.`notifications_id` = notifications.`id`",
                            "INNER JOIN contacts ON contacts.`id` = contacts_notifications.`contacts_id`",
                            "WHERE notifications.`dongles_imei` = ? AND contacts_notifications.`delivered`=0 AND contacts.`instanceid`=?",
                            "ORDER BY notifications.`date`"
                        ].join("\n"), [contact.endpoint, endpointsContacts_1.Contact.readInstanceId(contact)])];
                case 1:
                    notifications = _a.sent();
                    callback(notifications);
                    return [2 /*return*/, null];
            }
        });
    }); });
})(dbSemasim = exports.dbSemasim || (exports.dbSemasim = {}));
