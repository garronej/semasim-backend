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
var sharedSipProxy = require("../sipProxy/shared");
var sip = require("../sipProxy/sip");
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
            case 0: return [4 /*yield*/, query("SELECT `username`,`realm` FROM `ps_auths`")];
            case 1:
                res = _a.sent();
                endpoints = res.map(function (_a) {
                    var username = _a.username, realm = _a.realm;
                    return ({ "endpoint": username, "lastUpdated": parseInt(realm) });
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
var queryContacts = ts_exec_queue_1.execQueue(cluster, group, function (callback) { return __awaiter(_this, void 0, void 0, function () {
    var res, contacts;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                debug("entering queryContact");
                return [4 /*yield*/, query("SELECT `uri`,`endpoint` FROM `ps_contacts`")];
            case 1:
                res = _a.sent();
                contacts = res.map(function (_a) {
                    var uri = _a.uri, endpoint = _a.endpoint;
                    return endpoint + "/" + uri.replace(/\^3B/g, ";");
                });
                callback(contacts);
                return [2 /*return*/, contacts];
        }
    });
}); });
function queryContactsOfEndpoints(endpoint) {
    return __awaiter(this, void 0, void 0, function () {
        var contacts;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, queryContacts()];
                case 1:
                    contacts = _a.sent();
                    return [2 /*return*/, contacts.filter(function (uri) { return sip.parseUriWithEndpoint(uri).endpoint === endpoint; })];
            }
        });
    });
}
exports.queryContactsOfEndpoints = queryContactsOfEndpoints;
function getContactOfFlow(flowToken) {
    return __awaiter(this, void 0, void 0, function () {
        var contacts, contacts_1, contacts_1_1, contactUri, e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    debug("entering getContactOfFlow", flowToken);
                    return [4 /*yield*/, queryContacts()];
                case 1:
                    contacts = _b.sent();
                    try {
                        for (contacts_1 = __values(contacts), contacts_1_1 = contacts_1.next(); !contacts_1_1.done; contacts_1_1 = contacts_1.next()) {
                            contactUri = contacts_1_1.value;
                            if (sip.parseUriWithEndpoint(contactUri).params[sharedSipProxy.flowTokenKey] === flowToken)
                                return [2 /*return*/, contactUri];
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (contacts_1_1 && !contacts_1_1.done && (_a = contacts_1.return)) _a.call(contacts_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return [2 /*return*/, undefined];
            }
        });
    });
}
exports.getContactOfFlow = getContactOfFlow;
var deleteContact = ts_exec_queue_1.execQueue(cluster, group, function (uri, callback) { return __awaiter(_this, void 0, void 0, function () {
    var match, affectedRows, isDeleted;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                debug("entering deleteContact", uri);
                match = uri.match(/^([^\/]+)\/(.*)$/);
                return [4 /*yield*/, query("DELETE FROM `ps_contacts` WHERE `endpoint`=? AND `uri`=?", [match[1], match[2].replace(/;/g, "^3B")])];
            case 1:
                affectedRows = (_a.sent()).affectedRows;
                isDeleted = affectedRows ? true : false;
                callback(isDeleted);
                return [2 /*return*/, isDeleted];
        }
    });
}); });
function deleteContactOfFlow(flowToken) {
    return __awaiter(this, void 0, void 0, function () {
        var isDeleted, uri;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("entering deleteContactOfFlow", flowToken);
                    return [4 /*yield*/, getContactOfFlow(flowToken)];
                case 1:
                    uri = _a.sent();
                    if (!uri) {
                        isDeleted = true;
                        return [2 /*return*/, isDeleted];
                    }
                    return [4 /*yield*/, deleteContact(uri)];
                case 2:
                    isDeleted = _a.sent();
                    return [2 /*return*/, isDeleted];
            }
        });
    });
}
exports.deleteContactOfFlow = deleteContactOfFlow;
exports.addOrUpdateEndpoint = ts_exec_queue_1.execQueue(cluster, group, function (endpoint, isDongleConnected, callback) { return __awaiter(_this, void 0, void 0, function () {
    var queryLines, ps_aors, ps_endpoints, ps_auths;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                debug("Add or update endpoint " + endpoint + " in real time configuration");
                queryLines = [];
                ps_aors = (function () {
                    var id = endpoint;
                    var max_contacts = 12;
                    var qualify_frequency = 15000;
                    var support_path = "no";
                    queryLines = __spread(queryLines, [
                        "INSERT INTO `ps_aors`",
                        "(`id`,`max_contacts`,`qualify_frequency`, `support_path`)",
                        "VALUES ( ?, ?, ?, ?)",
                        "ON DUPLICATE KEY UPDATE",
                        "`max_contacts`= VALUES(`max_contacts`),",
                        "`qualify_frequency`= VALUES(`qualify_frequency`),",
                        "`support_path`= VALUES(`support_path`)",
                        ";"
                    ]);
                    return [id, max_contacts, qualify_frequency, support_path];
                })();
                ps_endpoints = (function () {
                    var id = endpoint;
                    var disallow = "all";
                    var allow = "alaw,ulaw";
                    var context = exports.callContext;
                    var message_context = exports.messageContext;
                    var subscribe_context = exports.subscribeContext(endpoint);
                    var aors = endpoint;
                    var auth = endpoint;
                    var force_rport = "yes";
                    queryLines = __spread(queryLines, [
                        "INSERT INTO `ps_endpoints`",
                        "(`id`,`disallow`,`allow`,`context`,`message_context`,`subscribe_context`,`aors`,`auth`,`force_rport`)",
                        "VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        "ON DUPLICATE KEY UPDATE",
                        "`disallow`= VALUES(`disallow`),",
                        "`allow`= VALUES(`allow`),",
                        "`context`= VALUES(`context`),",
                        "`message_context`= VALUES(`message_context`),",
                        "`subscribe_context`= VALUES(`subscribe_context`),",
                        "`aors`= VALUES(`aors`),",
                        "`auth`= VALUES(`auth`),",
                        "`force_rport`= VALUES(`force_rport`)",
                        ";",
                    ]);
                    return [id, disallow, allow, context, message_context, subscribe_context, aors, auth, force_rport];
                })();
                ps_auths = (function () {
                    var id = endpoint;
                    var auth_type = "userpass";
                    var username = endpoint;
                    var password = "password";
                    queryLines = __spread(queryLines, [
                        "INSERT INTO `ps_auths`",
                        "(`id`, `auth_type`, `username`, `password`) VALUES (?, ?, ?, ?)",
                        "ON DUPLICATE KEY UPDATE",
                        "`auth_type`= VALUES(`auth_type`),",
                        "`username`= VALUES(`username`),",
                        "`password`= VALUES(`password`)",
                        ";"
                    ]);
                    var values = [id, auth_type, username, password];
                    if (isDongleConnected) {
                        var realm = "" + Date.now();
                        queryLines = __spread(queryLines, [
                            "UPDATE `ps_auths` SET `realm` = ? WHERE `id` = ?",
                            ";"
                        ]);
                        values = __spread(values, [realm, id]);
                    }
                    return values;
                })();
                return [4 /*yield*/, query(queryLines.join("\n"), __spread(ps_aors, ps_endpoints, ps_auths))];
            case 1:
                _a.sent();
                callback();
                return [2 /*return*/];
        }
    });
}); });
//# sourceMappingURL=dbInterface.js.map