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
var runExclusive = require("run-exclusive");
var mysql = require("mysql");
var c = require("./constants");
var _debug = require("debug");
var debug = _debug("_dbInterface");
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
        ";\n"
    ];
    return [
        sqlLinesArray.join("\n"),
        keys.map(function (key) { return values[key]; })
    ];
}
var asterisk;
(function (asterisk) {
    var _this = this;
    var groupRef = runExclusive.createGroupRef();
    var connection = undefined;
    function query(sql, values) {
        if (!connection) {
            connection = mysql.createConnection(__assign({}, c.dbParams, { "database": "asterisk", "multipleStatements": true }));
        }
        return queryOnConnection(connection, sql, values);
    }
    asterisk.queryEndpoints = runExclusive.build(groupRef, function () { return __awaiter(_this, void 0, void 0, function () {
        var endpoints;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, query("SELECT `id`,`set_var` FROM `ps_endpoints`")];
                case 1:
                    endpoints = (_a.sent()).map(function (_a) {
                        var id = _a.id;
                        return id;
                    });
                    return [2 /*return*/, endpoints];
            }
        });
    }); });
    asterisk.truncateContacts = runExclusive.build(groupRef, function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, query("TRUNCATE ps_contacts")];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    asterisk.queryContacts = runExclusive.build(groupRef, function () { return __awaiter(_this, void 0, void 0, function () {
        var contacts, contacts_1, contacts_1_1, contact, e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, query("SELECT `id`,`uri`,`path`,`endpoint`,`user_agent` FROM ps_contacts")];
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
                    return [2 /*return*/, contacts];
            }
        });
    }); });
    //TODO: to test
    asterisk.queryLastConnectionTimestampOfDonglesEndpoint = runExclusive.build(function (endpoint) { return __awaiter(_this, void 0, void 0, function () {
        var timestamp, _a, set_var, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, query("SELECT `set_var` FROM ps_endpoints WHERE `id`=?", [endpoint])];
                case 1:
                    _a = __read.apply(void 0, [_b.sent(), 1]), set_var = _a[0].set_var;
                    timestamp = parseInt(set_var.split("=")[1]);
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _b.sent();
                    timestamp = 0;
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/, timestamp];
            }
        });
    }); });
    asterisk.deleteContact = runExclusive.build(groupRef, function (contact) { return __awaiter(_this, void 0, void 0, function () {
        var affectedRows, isDeleted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, query("DELETE FROM `ps_contacts` WHERE `id`=?", [contact.id])];
                case 1:
                    affectedRows = (_a.sent()).affectedRows;
                    isDeleted = affectedRows ? true : false;
                    return [2 /*return*/, isDeleted];
            }
        });
    }); });
    asterisk.addOrUpdateEndpoint = runExclusive.build(groupRef, function (endpoint, password) { return __awaiter(_this, void 0, void 0, function () {
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
                        sql += _sql;
                        values = __spread(values, _values);
                    })();
                    (function () {
                        var _a = __read(buildInsertQuery("ps_endpoints", {
                            "id": endpoint,
                            "disallow": "all",
                            "allow": "alaw,ulaw",
                            "context": c.sipCallContext,
                            "message_context": c.sipMessageContext,
                            "subscribe_context": null,
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
                            "callerid_tag": null,
                            "set_var": "LAST_CONNECTION_TIMESTAMP=" + Date.now()
                        }), 2), _sql = _a[0], _values = _a[1];
                        sql += _sql;
                        values = __spread(values, _values);
                    })();
                    (function () {
                        var _a = __read(buildInsertQuery("ps_auths", {
                            "id": endpoint,
                            "auth_type": "userpass",
                            "username": endpoint,
                            "password": password,
                            "realm": "semasim"
                        }), 2), _sql = _a[0], _values = _a[1];
                        sql += _sql;
                        values = __spread(values, _values);
                    })();
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
})(asterisk = exports.asterisk || (exports.asterisk = {}));
var semasim;
(function (semasim) {
    var _this = this;
    var groupRef = runExclusive.createGroupRef();
    var connection = undefined;
    function query(sql, values) {
        if (!connection) {
            connection = mysql.createConnection(__assign({}, c.dbParams, { "database": "semasim", "multipleStatements": true }));
        }
        return queryOnConnection(connection, sql, values);
    }
    semasim.addMessageTowardGsm = runExclusive.build(groupRef, function (to_number, text, sender) { return __awaiter(_this, void 0, void 0, function () {
        var _a, sim_iccid, _b, ua_instance_id, creation_timestamp, _c, sql, values;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, query([
                        "SELECT dongle.`sim_iccid`",
                        "FROM dongle",
                        "INNER JOIN sim ON sim.`iccid`= dongle.`sim_iccid`",
                        "WHERE dongle.`imei`=?"
                    ].join("\n"), [sender.dongle_imei])];
                case 1:
                    _a = __read.apply(void 0, [_d.sent(), 1]), sim_iccid = _a[0].sim_iccid;
                    return [4 /*yield*/, query("SELECT `id` AS `ua_instance_id` FROM ua_instance WHERE `dongle_imei`=? AND `instance_id`=?", [sender.dongle_imei, sender.instance_id])];
                case 2:
                    _b = __read.apply(void 0, [_d.sent(), 1]), ua_instance_id = _b[0].ua_instance_id;
                    creation_timestamp = Date.now();
                    _c = __read(buildInsertQuery("message_toward_gsm", {
                        sim_iccid: sim_iccid,
                        creation_timestamp: creation_timestamp,
                        ua_instance_id: ua_instance_id,
                        to_number: to_number,
                        "base64_text": (new Buffer(text, "utf8")).toString("base64"),
                        "sent_message_id": null
                    }), 2), sql = _c[0], values = _c[1];
                    return [4 /*yield*/, query(sql, values)];
                case 3:
                    _d.sent();
                    return [2 /*return*/, { sim_iccid: sim_iccid, creation_timestamp: creation_timestamp }];
            }
        });
    }); });
    semasim.setMessageToGsmSentId = runExclusive.build(groupRef, function (_a, sent_message_id) {
        var sim_iccid = _a.sim_iccid, creation_timestamp = _a.creation_timestamp;
        return __awaiter(_this, void 0, void 0, function () {
            var _a, sql, values;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = __read(buildInsertQuery("message_toward_gsm", {
                            sim_iccid: sim_iccid, creation_timestamp: creation_timestamp, sent_message_id: sent_message_id
                        }), 2), sql = _a[0], values = _a[1];
                        return [4 /*yield*/, query(sql, values)];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    semasim.getUnsentMessageOfDongleSim = runExclusive.build(groupRef, function (imei) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, query([
                        "SELECT",
                        "message_toward_gsm.`sim_iccid`,",
                        "message_toward_gsm.`creation_timestamp`,",
                        "message_toward_gsm.`to_number`,",
                        "message_toward_gsm.`base64_text`,",
                        "ua_instance.`dongle_imei`,",
                        "ua_instance.`instance_id`",
                        "FROM message_toward_gsm",
                        "INNER JOIN sim ON sim.`iccid`= message_toward_gsm.`sim_iccid`",
                        "INNER JOIN dongle ON dongle.`sim_iccid`= sim.`iccid`",
                        "INNER JOIN ua_instance ON ua_instance.`id` = message_toward_gsm.`ua_instance_id`",
                        "WHERE dongle.`imei`= ? AND message_toward_gsm.`sent_message_id` IS NULL",
                        "ORDER BY message_toward_gsm.`creation_timestamp`"
                    ].join("\n"), [imei])];
                case 1: return [2 /*return*/, (_a.sent()).map(function (_a) {
                        var sim_iccid = _a.sim_iccid, creation_timestamp = _a.creation_timestamp, dongle_imei = _a.dongle_imei, instance_id = _a.instance_id, base64_text = _a.base64_text, rest = __rest(_a, ["sim_iccid", "creation_timestamp", "dongle_imei", "instance_id", "base64_text"]);
                        return (__assign({ "pk": { sim_iccid: sim_iccid, creation_timestamp: creation_timestamp }, "sender": { dongle_imei: dongle_imei, instance_id: instance_id }, "text": (new Buffer(base64_text, "base64")).toString("utf8") }, rest));
                    })];
            }
        });
    }); });
    semasim.getSenderAndTextOfSentMessageToGsm = runExclusive.build(groupRef, function (imei, sent_message_id) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, query([
                        "SELECT",
                        "ua_instance.`dongle_imei`,",
                        "ua_instance.`instance_id`,",
                        "message_toward_gsm.`base64_text`",
                        "FROM message_toward_gsm",
                        "INNER JOIN sim ON sim.`iccid`= message_toward_gsm.`sim_iccid`",
                        "INNER JOIN dongle ON dongle.`sim_iccid`= sim.`iccid`",
                        "INNER JOIN ua_instance ON ua_instance.`id` = message_toward_gsm.`ua_instance_id`",
                        "WHERE dongle.`imei`= ? AND message_toward_gsm.`sent_message_id`= ?",
                    ].join("\n"), [imei, sent_message_id])];
                case 1: return [2 /*return*/, (_a.sent())
                        .map(function (_a) {
                        var dongle_imei = _a.dongle_imei, instance_id = _a.instance_id, base64_text = _a.base64_text;
                        return ({
                            "sender": { dongle_imei: dongle_imei, instance_id: instance_id },
                            "text": (new Buffer(base64_text, "base64")).toString("utf8")
                        });
                    })
                        .pop()];
            }
        });
    }); });
    semasim.addDongleAndSim = runExclusive.build(groupRef, function (imei, iccid) { return __awaiter(_this, void 0, void 0, function () {
        var sql, values;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = "";
                    values = [];
                    (function () {
                        var _a = __read(buildInsertQuery("sim", { iccid: iccid }), 2), _sql = _a[0], _values = _a[1];
                        sql += _sql;
                        values = __spread(values, _values);
                    })();
                    (function () {
                        var _a = __read(buildInsertQuery("dongle", {
                            imei: imei, "sim_iccid": iccid
                        }), 2), _sql = _a[0], _values = _a[1];
                        sql += _sql;
                        values = __spread(values, _values);
                    })();
                    return [4 /*yield*/, query(sql, values)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    semasim.addUaInstance = runExclusive.build(groupRef, function (_a) {
        var dongle_imei = _a.dongle_imei, instance_id = _a.instance_id;
        return __awaiter(_this, void 0, void 0, function () {
            var _a, sql, values, resp, isNew;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = __read(buildInsertQuery("ua_instance", { dongle_imei: dongle_imei, instance_id: instance_id }), 2), sql = _a[0], values = _a[1];
                        return [4 /*yield*/, query(sql, values)];
                    case 1:
                        resp = _b.sent();
                        isNew = resp.insertId !== 0;
                        return [2 /*return*/, isNew];
                }
            });
        });
    });
    semasim.addMessageTowardSip = runExclusive.build(groupRef, function (from_number, text, date, target) { return __awaiter(_this, void 0, void 0, function () {
        var ua_instance_ids, imei, _a, dongle_imei, instance_id, _b, dongle_imei, instance_id, _c, id, _d, sim_iccid, creation_timestamp, sql_values, insertId, message_toward_sip_id, sql, values, ua_instance_ids_1, ua_instance_ids_1_1, ua_instance_id, _e, _sql, _values, e_2, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (!target.allUaInstanceOfImei) return [3 /*break*/, 2];
                    imei = target.allUaInstanceOfImei;
                    return [4 /*yield*/, query("SELECT `id` FROM ua_instance WHERE `dongle_imei`=?", [imei])];
                case 1:
                    ua_instance_ids = (_g.sent()).map(function (_a) {
                        var id = _a.id;
                        return id;
                    });
                    return [3 /*break*/, 7];
                case 2:
                    if (!target.allUaInstanceOfEndpointOtherThan) return [3 /*break*/, 4];
                    _a = target.allUaInstanceOfEndpointOtherThan, dongle_imei = _a.dongle_imei, instance_id = _a.instance_id;
                    imei = dongle_imei;
                    return [4 /*yield*/, query("SELECT `id` FROM ua_instance WHERE `dongle_imei`=? AND `instance_id` <> ?", [imei, instance_id])];
                case 3:
                    ua_instance_ids = (_g.sent()).map(function (_a) {
                        var id = _a.id;
                        return id;
                    });
                    if (!ua_instance_ids.length)
                        return [2 /*return*/];
                    return [3 /*break*/, 7];
                case 4:
                    if (!target.uaInstance) return [3 /*break*/, 6];
                    _b = target.uaInstance, dongle_imei = _b.dongle_imei, instance_id = _b.instance_id;
                    imei = dongle_imei;
                    return [4 /*yield*/, query("SELECT `id` FROM ua_instance WHERE `dongle_imei`=? AND `instance_id`= ?", [imei, instance_id])];
                case 5:
                    _c = __read.apply(void 0, [(_g.sent()), 1]), id = _c[0].id;
                    ua_instance_ids = [id];
                    return [3 /*break*/, 7];
                case 6: throw new Error("No target");
                case 7: return [4 /*yield*/, query("SELECT `sim_iccid` FROM dongle WHERE `imei`=?", [imei])];
                case 8:
                    _d = __read.apply(void 0, [_g.sent(), 1]), sim_iccid = _d[0].sim_iccid;
                    creation_timestamp = date.getTime();
                    sql_values = buildInsertQuery("message_toward_sip", {
                        sim_iccid: sim_iccid,
                        creation_timestamp: creation_timestamp,
                        from_number: from_number,
                        "base64_text": (new Buffer(text, "utf8")).toString("base64")
                    });
                    return [4 /*yield*/, query(sql_values[0], sql_values[1])];
                case 9:
                    insertId = (_g.sent()).insertId;
                    message_toward_sip_id = insertId;
                    sql = "";
                    values = [];
                    try {
                        for (ua_instance_ids_1 = __values(ua_instance_ids), ua_instance_ids_1_1 = ua_instance_ids_1.next(); !ua_instance_ids_1_1.done; ua_instance_ids_1_1 = ua_instance_ids_1.next()) {
                            ua_instance_id = ua_instance_ids_1_1.value;
                            _e = __read(buildInsertQuery("ua_instance_message_toward_sip", {
                                ua_instance_id: ua_instance_id,
                                message_toward_sip_id: message_toward_sip_id,
                                "delivered_timestamp": null
                            }), 2), _sql = _e[0], _values = _e[1];
                            sql += _sql;
                            values = __spread(values, _values);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (ua_instance_ids_1_1 && !ua_instance_ids_1_1.done && (_f = ua_instance_ids_1.return)) _f.call(ua_instance_ids_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    return [4 /*yield*/, query(sql, values)];
                case 10:
                    _g.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    semasim.setMessageTowardSipDelivered = runExclusive.build(groupRef, function (_a, message_toward_sip_creation_timestamp) {
        var dongle_imei = _a.dongle_imei, instance_id = _a.instance_id;
        return __awaiter(_this, void 0, void 0, function () {
            var _a, ua_instance_id, _b, message_toward_sip_id, _c, sql, values;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, query("SELECT `id` AS `ua_instance_id` FROM ua_instance WHERE `dongle_imei` = ? AND `instance_id` = ?", [dongle_imei, instance_id])];
                    case 1:
                        _a = __read.apply(void 0, [_d.sent(), 1]), ua_instance_id = _a[0].ua_instance_id;
                        return [4 /*yield*/, query([
                                "SELECT message_toward_sip.`id` AS `message_toward_sip_id`",
                                "FROM message_toward_sip",
                                "INNER JOIN sim ON sim.`iccid` = message_toward_sip.`sim_iccid`",
                                "INNER JOIN dongle ON dongle.`sim_iccid` = sim.`iccid`",
                                "WHERE message_toward_sip.`creation_timestamp` = ? AND dongle.`imei` = ?"
                            ].join("\n"), [message_toward_sip_creation_timestamp, dongle_imei])];
                    case 2:
                        _b = __read.apply(void 0, [_d.sent(), 1]), message_toward_sip_id = _b[0].message_toward_sip_id;
                        return [4 /*yield*/, buildInsertQuery("ua_instance_message_toward_sip", {
                                ua_instance_id: ua_instance_id,
                                message_toward_sip_id: message_toward_sip_id,
                                "delivered_timestamp": Date.now()
                            })];
                    case 3:
                        _c = __read.apply(void 0, [_d.sent(), 2]), sql = _c[0], values = _c[1];
                        return [4 /*yield*/, query(sql, values)];
                    case 4:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    semasim.getUndeliveredMessagesOfUaInstance = runExclusive.build(groupRef, function (_a) {
        var dongle_imei = _a.dongle_imei, instance_id = _a.instance_id;
        return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, query([
                            "SELECT message_toward_sip.`creation_timestamp`, message_toward_sip.`from_number`, message_toward_sip.`base64_text`",
                            "FROM message_toward_sip",
                            "INNER JOIN sim",
                            "ON sim.`iccid` = message_toward_sip.`sim_iccid`",
                            "INNER JOIN dongle",
                            "ON dongle.`sim_iccid` = sim.`iccid`",
                            "INNER JOIN ua_instance",
                            "ON ua_instance.`dongle_imei` = dongle.`imei`",
                            "INNER JOIN ua_instance_message_toward_sip",
                            "ON  ua_instance_message_toward_sip.`ua_instance_id` = ua_instance.`id`",
                            "AND ua_instance_message_toward_sip.`message_toward_sip_id` = message_toward_sip.`id`",
                            "WHERE dongle.`imei` = ? AND ua_instance.`instance_id` = ? AND ua_instance_message_toward_sip.`delivered_timestamp` IS NULL",
                            "ORDER BY message_toward_sip.`creation_timestamp`"
                        ].join("\n"), [dongle_imei, instance_id])];
                    case 1: return [2 /*return*/, (_a.sent()).map(function (_a) {
                            var base64_text = _a.base64_text, rest = __rest(_a, ["base64_text"]);
                            return (__assign({}, rest, { "text": (new Buffer(base64_text, "base64")).toString("utf8") }));
                        })];
                }
            });
        });
    });
})(semasim = exports.semasim || (exports.semasim = {}));
