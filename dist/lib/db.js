"use strict";
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
var RIPEMD160 = require("ripemd160");
var crypto = require("crypto");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var semasim_gateway_1 = require("../semasim-gateway");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_db");
/** Exported only for tests */
exports.query = semasim_gateway_1.mySqlFunctions.buildQueryFunction(_constants_1.c.dbParamsBackend);
/** For test purpose only */
function flush() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.query("DELETE FROM user;")];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.flush = flush;
/** Return user.id_ or undefined */
function createUserAccount(email, password) {
    return __awaiter(this, void 0, void 0, function () {
        var salt, hash, sql, insertId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    salt = crypto.randomBytes(8).toString("hex");
                    hash = (new RIPEMD160()).update("" + password + salt).digest("hex");
                    email = email.toLowerCase();
                    sql = [
                        "INSERT INTO user",
                        "   ( email, salt, hash )",
                        "VALUES",
                        "   ( " + semasim_gateway_1.mySqlFunctions.esc(email) + ", " + semasim_gateway_1.mySqlFunctions.esc(salt) + ", " + semasim_gateway_1.mySqlFunctions.esc(hash) + ")",
                        "ON DUPLICATE KEY UPDATE",
                        "   salt= IF(@update_record:= salt = '', VALUES(salt), salt),",
                        "   hash= IF(@update_record, VALUES(hash), hash)"
                    ].join("\n");
                    return [4 /*yield*/, exports.query(sql)];
                case 1:
                    insertId = (_a.sent()).insertId;
                    return [2 /*return*/, (insertId !== 0) ? insertId : undefined];
            }
        });
    });
}
exports.createUserAccount = createUserAccount;
/** Return user.id_ or undefined if auth failed */
function authenticateUser(email, password) {
    return __awaiter(this, void 0, void 0, function () {
        var rows, _a, _b, id_, salt, hash;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    email = email.toLowerCase();
                    return [4 /*yield*/, exports.query("SELECT * FROM user WHERE email= " + semasim_gateway_1.mySqlFunctions.esc(email))];
                case 1:
                    rows = _c.sent();
                    if (!rows.length) {
                        return [2 /*return*/, undefined];
                    }
                    _a = __read(rows, 1), _b = _a[0], id_ = _b.id_, salt = _b.salt, hash = _b.hash;
                    if (salt === "") {
                        return [2 /*return*/, undefined];
                    }
                    return [2 /*return*/, ((new RIPEMD160()).update("" + password + salt).digest("hex") === hash) ?
                            id_ : undefined];
            }
        });
    });
}
exports.authenticateUser = authenticateUser;
function deleteUser(user) {
    return __awaiter(this, void 0, void 0, function () {
        var affectedRows, isDeleted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.query("DELETE FROM user WHERE id_ = " + semasim_gateway_1.mySqlFunctions.esc(user))];
                case 1:
                    affectedRows = (_a.sent()).affectedRows;
                    isDeleted = affectedRows !== 0;
                    return [2 /*return*/, isDeleted];
            }
        });
    });
}
exports.deleteUser = deleteUser;
function getUserHash(email) {
    return __awaiter(this, void 0, void 0, function () {
        var rows, _a, hash;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    email = email.toLowerCase();
                    return [4 /*yield*/, exports.query("SELECT hash FROM user WHERE email= " + semasim_gateway_1.mySqlFunctions.esc(email))];
                case 1:
                    rows = _b.sent();
                    if (!rows.length) {
                        return [2 /*return*/, undefined];
                    }
                    _a = __read(rows, 1), hash = _a[0].hash;
                    if (hash === "") {
                        return [2 /*return*/, undefined];
                    }
                    else {
                        return [2 /*return*/, hash];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.getUserHash = getUserHash;
/** returns locked dongles with unreadable SIM iccid,
 *  locked dongles with readable iccid registered by user
 *  active dongles not registered
 */
function filterDongleWithRegistrableSim(user, dongles) {
    return __awaiter(this, void 0, void 0, function () {
        var registrableDongles, dongleWithReadableIccid, dongles_1, dongles_1_1, dongle, rows, userByIccid, rows_1, rows_1_1, _a, iccid, user_1, e_1, _b, e_2, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    registrableDongles = [];
                    dongleWithReadableIccid = [];
                    try {
                        for (dongles_1 = __values(dongles), dongles_1_1 = dongles_1.next(); !dongles_1_1.done; dongles_1_1 = dongles_1.next()) {
                            dongle = dongles_1_1.value;
                            if (!dongle.sim.iccid) {
                                registrableDongles.push(dongle);
                            }
                            else {
                                dongleWithReadableIccid.push(dongle);
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (dongles_1_1 && !dongles_1_1.done && (_b = dongles_1.return)) _b.call(dongles_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    if (!dongleWithReadableIccid.length) {
                        return [2 /*return*/, registrableDongles];
                    }
                    return [4 /*yield*/, exports.query([
                            "SELECT iccid, user",
                            "FROM sim",
                            "WHERE",
                            dongleWithReadableIccid.map(function (_a) {
                                var sim = _a.sim;
                                return "iccid= " + semasim_gateway_1.mySqlFunctions.esc(sim.iccid);
                            }).join(" OR ")
                        ].join("\n"))];
                case 1:
                    rows = _d.sent();
                    userByIccid = {};
                    try {
                        for (rows_1 = __values(rows), rows_1_1 = rows_1.next(); !rows_1_1.done; rows_1_1 = rows_1.next()) {
                            _a = rows_1_1.value, iccid = _a.iccid, user_1 = _a.user;
                            userByIccid[iccid] = user_1;
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (rows_1_1 && !rows_1_1.done && (_c = rows_1.return)) _c.call(rows_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    registrableDongles = __spread(registrableDongles, dongleWithReadableIccid.filter(function (dongle) {
                        var registeredBy = userByIccid[dongle.sim.iccid];
                        if (!registeredBy) {
                            return true;
                        }
                        else {
                            return (registeredBy === user) && chan_dongle_extended_client_1.DongleController.LockedDongle.match(dongle);
                        }
                    }));
                    return [2 /*return*/, registrableDongles];
            }
        });
    });
}
exports.filterDongleWithRegistrableSim = filterDongleWithRegistrableSim;
/** return user UAs */
function registerSim(sim, password, user, friendlyName, isVoiceEnabled) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, _a, _b, contact, queryResults, userUas, _c, _d, row, e_3, _e, e_4, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    sql = semasim_gateway_1.mySqlFunctions.buildInsertQuery("sim", {
                        "imsi": sim.imsi,
                        "iccid": sim.iccid,
                        "number": sim.storage.number || null,
                        "base64_service_provider_from_imsi": semasim_gateway_1.mySqlFunctions.b64.enc(sim.serviceProvider.fromImsi),
                        "base64_service_provider_from_network": semasim_gateway_1.mySqlFunctions.b64.enc(sim.serviceProvider.fromNetwork),
                        "contact_name_max_length": sim.storage.infos.contactNameMaxLength,
                        "number_max_length": sim.storage.infos.numberMaxLength,
                        "storage_left": sim.storage.infos.storageLeft,
                        "storage_digest": sim.storage.digest,
                        user: user,
                        password: password,
                        "need_password_renewal": 0,
                        "base64_friendly_name": semasim_gateway_1.mySqlFunctions.b64.enc(friendlyName),
                        "is_voice_enabled": semasim_gateway_1.mySqlFunctions.booleanOrUndefinedToSmallIntOrNull(isVoiceEnabled),
                        "is_online": 1
                    }, "THROW ERROR");
                    sql += [
                        "SELECT @sim_ref:= id_",
                        "FROM sim",
                        "WHERE imsi= " + semasim_gateway_1.mySqlFunctions.esc(sim.imsi),
                        ";",
                        ""
                    ].join("\n");
                    try {
                        for (_a = __values(sim.storage.contacts), _b = _a.next(); !_b.done; _b = _a.next()) {
                            contact = _b.value;
                            sql += semasim_gateway_1.mySqlFunctions.buildInsertQuery("contact", {
                                "sim": { "@": "sim_ref" },
                                "mem_index": contact.index,
                                "number_as_stored": contact.number.asStored,
                                "number_local_format": contact.number.localFormat,
                                "base64_name_as_stored": semasim_gateway_1.mySqlFunctions.b64.enc(contact.name.asStored),
                                "base64_name_full": semasim_gateway_1.mySqlFunctions.b64.enc(contact.name.full)
                            }, "THROW ERROR");
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    sql += [
                        "SELECT ua.*, user.email",
                        "FROM ua",
                        "INNER JOIN user ON user.id_= ua.user",
                        "WHERE user.id_= " + semasim_gateway_1.mySqlFunctions.esc(user)
                    ].join("\n");
                    return [4 /*yield*/, exports.query(sql)];
                case 1:
                    queryResults = _g.sent();
                    userUas = [];
                    try {
                        for (_c = __values(queryResults.pop()), _d = _c.next(); !_d.done; _d = _c.next()) {
                            row = _d.value;
                            userUas.push({
                                "instance": row["instance"],
                                "userEmail": row["email"],
                                "platform": row["platform"],
                                "pushToken": row["push_token"],
                                "software": row["software"]
                            });
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_f = _c.return)) _f.call(_c);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    return [2 /*return*/, userUas];
            }
        });
    });
}
exports.registerSim = registerSim;
function getUserSims(user) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, _a, rowsSimOwned, rowsContactSimOwned, rowsSharedWith, rowsSimShared, rowsContactSimShared, sharedWithBySim, rowsSharedWith_1, rowsSharedWith_1_1, row, imsi, contactsBySim, _b, _c, row, imsi, userSims, _loop_1, _d, _e, row, e_5, _f, e_6, _g, e_7, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    sql = [
                        "SELECT",
                        "   sim.*",
                        "FROM sim",
                        "WHERE sim.user= " + semasim_gateway_1.mySqlFunctions.esc(user),
                        ";",
                        "SELECT",
                        "   sim.imsi,",
                        "   contact.*",
                        "FROM contact",
                        "INNER JOIN sim ON sim.id_= contact.sim",
                        "WHERE sim.user= " + semasim_gateway_1.mySqlFunctions.esc(user),
                        ";",
                        "SELECT",
                        "   sim.imsi,",
                        "   user.email,",
                        "   user_sim.base64_friendly_name IS NOT NULL AS is_confirmed",
                        "FROM sim",
                        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
                        "INNER JOIN user ON user.id_= user_sim.user",
                        "WHERE sim.user= " + semasim_gateway_1.mySqlFunctions.esc(user),
                        ";",
                        "SELECT",
                        "   sim.*,",
                        "   user_sim.base64_friendly_name AS base64_user_friendly_name,",
                        "   user_sim.base64_sharing_request_message,",
                        "   user.email",
                        "FROM sim",
                        "INNER JOIN user ON user.id_= sim.user",
                        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
                        "WHERE user_sim.user= " + semasim_gateway_1.mySqlFunctions.esc(user),
                        ";",
                        "SELECT",
                        "   sim.imsi,",
                        "   contact.*",
                        "FROM contact",
                        "INNER JOIN sim ON sim.id_= contact.sim",
                        "INNER JOIN user_sim ON user_sim.sim= sim.id_",
                        "WHERE user_sim.user= " + semasim_gateway_1.mySqlFunctions.esc(user),
                    ].join("\n");
                    return [4 /*yield*/, exports.query(sql)];
                case 1:
                    _a = __read.apply(void 0, [_j.sent(), 5]), rowsSimOwned = _a[0], rowsContactSimOwned = _a[1], rowsSharedWith = _a[2], rowsSimShared = _a[3], rowsContactSimShared = _a[4];
                    sharedWithBySim = {};
                    try {
                        for (rowsSharedWith_1 = __values(rowsSharedWith), rowsSharedWith_1_1 = rowsSharedWith_1.next(); !rowsSharedWith_1_1.done; rowsSharedWith_1_1 = rowsSharedWith_1.next()) {
                            row = rowsSharedWith_1_1.value;
                            imsi = row["imsi"];
                            if (!sharedWithBySim[imsi]) {
                                sharedWithBySim[imsi] = {
                                    "confirmed": [],
                                    "notConfirmed": []
                                };
                            }
                            sharedWithBySim[imsi][row["is_confirmed"] ? "confirmed" : "notConfirmed"].push(row["email"]);
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (rowsSharedWith_1_1 && !rowsSharedWith_1_1.done && (_f = rowsSharedWith_1.return)) _f.call(rowsSharedWith_1);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                    contactsBySim = {};
                    try {
                        for (_b = __values(__spread(rowsContactSimOwned, rowsContactSimShared)), _c = _b.next(); !_c.done; _c = _b.next()) {
                            row = _c.value;
                            imsi = row["imsi"];
                            if (!contactsBySim[imsi]) {
                                contactsBySim[imsi] = [];
                            }
                            contactsBySim[imsi].push({
                                "index": parseInt(row["mem_index"]),
                                "name": {
                                    "asStored": semasim_gateway_1.mySqlFunctions.b64.dec(row["base64_name_as_stored"]),
                                    "full": semasim_gateway_1.mySqlFunctions.b64.dec(row["base64_name_full"])
                                },
                                "number": {
                                    "asStored": row["number_as_stored"],
                                    "localFormat": row["number_local_format"]
                                }
                            });
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_g = _b.return)) _g.call(_b);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                    userSims = [];
                    _loop_1 = function (row) {
                        var sim = {
                            "iccid": row["iccid"],
                            "imsi": row["imsi"],
                            "serviceProvider": {
                                "fromImsi": semasim_gateway_1.mySqlFunctions.b64.dec(row["base64_service_provider_from_imsi"]),
                                "fromNetwork": semasim_gateway_1.mySqlFunctions.b64.dec(row["base64_service_provider_from_network"])
                            },
                            "storage": {
                                "number": (row["number"] === null) ? undefined : row["number"],
                                "infos": {
                                    "contactNameMaxLength": parseInt(row["contact_name_max_length"]),
                                    "numberMaxLength": parseInt(row["number_max_length"]),
                                    "storageLeft": parseInt(row["storage_left"]),
                                },
                                "contacts": contactsBySim[row["imsi"]] || [],
                                "digest": row["storage_digest"]
                            }
                        };
                        var _a = __read((function () {
                            var ownerEmail = row["email"];
                            var ownerFriendlyName = semasim_gateway_1.mySqlFunctions.b64.dec(row["base64_friendly_name"]);
                            if (ownerEmail === undefined) {
                                return [
                                    ownerFriendlyName,
                                    {
                                        "status": "OWNED",
                                        "sharedWith": sharedWithBySim[sim.imsi] || {
                                            "confirmed": [],
                                            "notConfirmed": []
                                        }
                                    }
                                ];
                            }
                            else {
                                var friendlyName_1 = semasim_gateway_1.mySqlFunctions.b64.dec(row["base64_user_friendly_name"]);
                                if (friendlyName_1 === undefined) {
                                    //TODO: Security hotFix
                                    row["password"] = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
                                    return [
                                        ownerFriendlyName,
                                        {
                                            "status": "SHARED NOT CONFIRMED",
                                            ownerEmail: ownerEmail,
                                            "sharingRequestMessage": semasim_gateway_1.mySqlFunctions.b64.dec(row["base64_sharing_request_message"])
                                        }
                                    ];
                                }
                                else {
                                    return [
                                        friendlyName_1,
                                        { "status": "SHARED CONFIRMED", ownerEmail: ownerEmail }
                                    ];
                                }
                            }
                        })(), 2), friendlyName = _a[0], ownership = _a[1];
                        var userSim = {
                            sim: sim,
                            friendlyName: friendlyName,
                            ownership: ownership,
                            "password": row["password"],
                            "isVoiceEnabled": semasim_gateway_1.mySqlFunctions.smallIntOrNullToBooleanOrUndefined(row["is_voice_enabled"]),
                            "isOnline": row["is_online"] === 1
                        };
                        userSims.push(userSim);
                    };
                    try {
                        for (_d = __values(__spread(rowsSimOwned, rowsSimShared)), _e = _d.next(); !_e.done; _e = _d.next()) {
                            row = _e.value;
                            _loop_1(row);
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (_e && !_e.done && (_h = _d.return)) _h.call(_d);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                    return [2 /*return*/, userSims];
            }
        });
    });
}
exports.getUserSims = getUserSims;
function addOrUpdateUa(ua) {
    return __awaiter(this, void 0, void 0, function () {
        var sql;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = [
                        "INSERT INTO ua",
                        "   (instance, user, platform, push_token, software)",
                        "SELECT",
                        [
                            semasim_gateway_1.mySqlFunctions.esc(ua.instance),
                            "id_",
                            semasim_gateway_1.mySqlFunctions.esc(ua.platform),
                            semasim_gateway_1.mySqlFunctions.esc(ua.pushToken),
                            semasim_gateway_1.mySqlFunctions.esc(ua.software)
                        ].join(", "),
                        "FROM user WHERE email= " + semasim_gateway_1.mySqlFunctions.esc(ua.userEmail),
                        "ON DUPLICATE KEY UPDATE",
                        "   platform= VALUES(platform),",
                        "   push_token= VALUES(push_token),",
                        "   software= VALUES(software)"
                    ].join("\n");
                    return [4 /*yield*/, exports.query(sql)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.addOrUpdateUa = addOrUpdateUa;
function setSimOnline(imsi, password, isVoiceEnabled) {
    return __awaiter(this, void 0, void 0, function () {
        var is_voice_enabled, queryResults, uasRegisteredToSim, _a, _b, row, e_8, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    is_voice_enabled = semasim_gateway_1.mySqlFunctions.booleanOrUndefinedToSmallIntOrNull(isVoiceEnabled);
                    return [4 /*yield*/, exports.query([
                            "SELECT",
                            "@sim_ref:= id_,",
                            "storage_digest,",
                            [
                                "@password_status:= ",
                                "IF(password= " + semasim_gateway_1.mySqlFunctions.esc(password) + ", ",
                                "IF(need_password_renewal, 'NEED RENEWAL', 'UNCHANGED'), ",
                                "'RENEWED') AS password_status"
                            ].join(""),
                            "FROM sim",
                            "WHERE imsi= " + semasim_gateway_1.mySqlFunctions.esc(imsi),
                            ";",
                            "UPDATE sim",
                            "SET",
                            "   is_online= 1,",
                            "   password= " + semasim_gateway_1.mySqlFunctions.esc(password) + ",",
                            "   need_password_renewal= (@password_status= 'NEED RENEWAL'),",
                            "   is_voice_enabled= " + semasim_gateway_1.mySqlFunctions.esc(is_voice_enabled),
                            "WHERE id_= @sim_ref",
                            ";",
                            "SELECT",
                            "   ua.*, user.email",
                            "FROM ua",
                            "INNER JOIN user ON user.id_= ua.user",
                            "INNER JOIN sim ON sim.user= user.id_",
                            "WHERE sim.id_= @sim_ref",
                            ";",
                            "SELECT",
                            "   ua.*, user.email",
                            "FROM ua",
                            "INNER JOIN user ON user.id_= ua.user",
                            "INNER JOIN user_sim ON user_sim.user= user.id_",
                            "INNER JOIN sim ON sim.id_= user_sim.sim",
                            "WHERE sim.id_= @sim_ref AND user_sim.base64_friendly_name IS NOT NULL"
                        ].join("\n"))];
                case 1:
                    queryResults = _d.sent();
                    if (queryResults[0].length === 0) {
                        return [2 /*return*/, { "isSimRegistered": false }];
                    }
                    else {
                        uasRegisteredToSim = [];
                        try {
                            for (_a = __values(__spread(queryResults.pop(), queryResults.pop())), _b = _a.next(); !_b.done; _b = _a.next()) {
                                row = _b.value;
                                uasRegisteredToSim.push({
                                    "instance": row["instance"],
                                    "userEmail": row["email"],
                                    "platform": row["platform"],
                                    "pushToken": row["push_token"],
                                    "software": row["software"]
                                });
                            }
                        }
                        catch (e_8_1) { e_8 = { error: e_8_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_8) throw e_8.error; }
                        }
                        return [2 /*return*/, {
                                "isSimRegistered": true,
                                "passwordStatus": queryResults[0][0]["password_status"],
                                "storageDigest": queryResults[0][0]["storage_digest"],
                                uasRegisteredToSim: uasRegisteredToSim
                            }];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.setSimOnline = setSimOnline;
function setSimOffline(imsi) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.query("UPDATE sim SET is_online= 0 WHERE imsi= " + semasim_gateway_1.mySqlFunctions.esc(imsi))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.setSimOffline = setSimOffline;
/** Return UAs that no longer use sim */
function unregisterSim(user, imsi) {
    return __awaiter(this, void 0, void 0, function () {
        var queryResults, affectedUas, _a, _b, row, e_9, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, exports.query([
                        "SELECT @sim_ref:= sim.id_, @is_sim_owned:= sim.user= " + semasim_gateway_1.mySqlFunctions.esc(user),
                        "FROM sim",
                        "LEFT JOIN user_sim ON user_sim.sim= sim.id_",
                        "WHERE",
                        "sim.imsi= " + semasim_gateway_1.mySqlFunctions.esc(imsi) + " AND ( sim.user= " + semasim_gateway_1.mySqlFunctions.esc(user) + " OR user_sim.user= " + semasim_gateway_1.mySqlFunctions.esc(user) + ")",
                        "GROUP BY sim.id_",
                        ";",
                        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not have access to this SIM')",
                        ";",
                        "SELECT",
                        "   ua.*, user.email",
                        "FROM ua",
                        "   INNER JOIN user ON user.id_= ua.user",
                        "   INNER JOIN sim ON sim.user= user.id_",
                        "WHERE sim.id_= @sim_ref AND @is_sim_owned",
                        ";",
                        "SELECT",
                        "   ua.*, user.email",
                        "FROM ua",
                        "INNER JOIN user ON user.id_= ua.user",
                        "INNER JOIN user_sim ON user_sim.user= user.id_",
                        "WHERE",
                        "   user_sim.sim= @sim_ref",
                        "   AND user_sim.base64_friendly_name IS NOT NULL",
                        "   AND ( @is_sim_owned OR user.id_= " + semasim_gateway_1.mySqlFunctions.esc(user) + ")",
                        ";",
                        "DELETE FROM sim WHERE id_= @sim_ref AND @is_sim_owned",
                        ";",
                        "DELETE FROM user_sim",
                        "WHERE sim= @sim_ref AND user= " + semasim_gateway_1.mySqlFunctions.esc(user) + " AND NOT @is_sim_owned"
                    ].join("\n"))];
                case 1:
                    queryResults = _d.sent();
                    affectedUas = [];
                    try {
                        for (_a = __values(__spread(queryResults[2], queryResults[3])), _b = _a.next(); !_b.done; _b = _a.next()) {
                            row = _b.value;
                            affectedUas.push({
                                "instance": row["instance"],
                                "userEmail": row["email"],
                                "platform": row["platform"],
                                "pushToken": row["push_token"],
                                "software": row["software"]
                            });
                        }
                    }
                    catch (e_9_1) { e_9 = { error: e_9_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_9) throw e_9.error; }
                    }
                    return [2 /*return*/, affectedUas];
            }
        });
    });
}
exports.unregisterSim = unregisterSim;
//TODO: useless to return UA as sharing request must be accepted first
/** Return assert emails not empty */
function shareSim(auth, imsi, emails, sharingRequestMessage) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, queryResults, userRows, affectedUsers, userRows_1, userRows_1_1, row, email, e_10, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    emails = emails
                        .map(function (email) { return email.toLowerCase(); })
                        .filter(function (email) { return email !== auth.email; });
                    sql = [
                        "SELECT @sim_ref:= id_",
                        "FROM sim",
                        "WHERE imsi= " + semasim_gateway_1.mySqlFunctions.esc(imsi) + " AND user= " + semasim_gateway_1.mySqlFunctions.esc(auth.user),
                        ";",
                        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not own sim')",
                        ";",
                        "INSERT IGNORE INTO user",
                        "   (email, salt, hash)",
                        "VALUES",
                        emails.map(function (email) { return "   ( " + semasim_gateway_1.mySqlFunctions.esc(email) + ", '', '')"; }).join(",\n"),
                        ";",
                        "DROP TABLE IF EXISTS _user",
                        ";",
                        "CREATE TEMPORARY TABLE _user AS (",
                        "   SELECT user.id_, user.email, user.salt<> '' AS is_registered",
                        "   FROM user",
                        "   LEFT JOIN user_sim ON user_sim.user= user.id_",
                        "   WHERE " + emails.map(function (email) { return "user.email= " + semasim_gateway_1.mySqlFunctions.esc(email); }).join(" OR "),
                        "   GROUP BY user.id_",
                        "   HAVING COUNT(user_sim.id_)=0 OR SUM(user_sim.sim= @sim_ref)=0",
                        ")",
                        ";",
                        "INSERT INTO user_sim",
                        "   (user, sim, base64_friendly_name, base64_sharing_request_message)",
                        "SELECT",
                        "   id_, @sim_ref, NULL, " + semasim_gateway_1.mySqlFunctions.esc(semasim_gateway_1.mySqlFunctions.b64.enc(sharingRequestMessage)),
                        "FROM _user",
                        ";",
                        "SELECT * from _user"
                    ].join("\n");
                    return [4 /*yield*/, exports.query(sql)];
                case 1:
                    queryResults = _b.sent();
                    userRows = queryResults.pop();
                    affectedUsers = {
                        "registered": [],
                        "notRegistered": []
                    };
                    try {
                        for (userRows_1 = __values(userRows), userRows_1_1 = userRows_1.next(); !userRows_1_1.done; userRows_1_1 = userRows_1.next()) {
                            row = userRows_1_1.value;
                            email = row["email"];
                            if (row["is_registered"] === 1) {
                                affectedUsers.registered.push(email);
                            }
                            else {
                                affectedUsers.notRegistered.push(email);
                            }
                        }
                    }
                    catch (e_10_1) { e_10 = { error: e_10_1 }; }
                    finally {
                        try {
                            if (userRows_1_1 && !userRows_1_1.done && (_a = userRows_1.return)) _a.call(userRows_1);
                        }
                        finally { if (e_10) throw e_10.error; }
                    }
                    return [2 /*return*/, affectedUsers];
            }
        });
    });
}
exports.shareSim = shareSim;
/** Return no longer registered UAs, assert email list not empty*/
function stopSharingSim(user, imsi, emails) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, queryResults, uaRows, noLongerRegisteredUas, uaRows_1, uaRows_1_1, row, e_11, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    emails = emails.map(function (email) { return email.toLowerCase(); });
                    sql = [
                        "SELECT @sim_ref:= id_",
                        "FROM sim",
                        "WHERE imsi= " + semasim_gateway_1.mySqlFunctions.esc(imsi) + " AND user= " + semasim_gateway_1.mySqlFunctions.esc(user),
                        ";",
                        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not own SIM')",
                        ";",
                        "DROP TABLE IF EXISTS _user_sim",
                        ";",
                        "CREATE TEMPORARY TABLE _user_sim AS (",
                        "   SELECT",
                        "       user_sim.id_,",
                        "       user_sim.user,",
                        "       user.email,",
                        "       user_sim.base64_friendly_name IS NOT NULL as is_confirmed",
                        "   FROM user_sim",
                        "   INNER JOIN user ON user.id_= user_sim.user",
                        "   WHERE user_sim.sim= @sim_ref AND (" + emails.map(function (email) { return "user.email= " + semasim_gateway_1.mySqlFunctions.esc(email); }).join(" OR ") + ")",
                        ")",
                        ";",
                        "SELECT ua.*, _user_sim.email, @ua_found:= 1",
                        "FROM ua",
                        "INNER JOIN _user_sim ON _user_sim.user= ua.user",
                        "WHERE _user_sim.is_confirmed",
                        ";",
                        "UPDATE sim",
                        "SET need_password_renewal= 1",
                        "WHERE id_= @sim_ref AND @ua_found",
                        ";",
                        "DELETE user_sim.*",
                        "FROM user_sim",
                        "INNER JOIN _user_sim ON _user_sim.id_= user_sim.id_"
                    ].join("\n");
                    return [4 /*yield*/, exports.query(sql)];
                case 1:
                    queryResults = _b.sent();
                    uaRows = queryResults[4];
                    noLongerRegisteredUas = [];
                    try {
                        for (uaRows_1 = __values(uaRows), uaRows_1_1 = uaRows_1.next(); !uaRows_1_1.done; uaRows_1_1 = uaRows_1.next()) {
                            row = uaRows_1_1.value;
                            noLongerRegisteredUas.push({
                                "instance": row["instance"],
                                "userEmail": row["email"],
                                "platform": row["platform"],
                                "pushToken": row["push_token"],
                                "software": row["software"]
                            });
                        }
                    }
                    catch (e_11_1) { e_11 = { error: e_11_1 }; }
                    finally {
                        try {
                            if (uaRows_1_1 && !uaRows_1_1.done && (_a = uaRows_1.return)) _a.call(uaRows_1);
                        }
                        finally { if (e_11) throw e_11.error; }
                    }
                    return [2 /*return*/, noLongerRegisteredUas];
            }
        });
    });
}
exports.stopSharingSim = stopSharingSim;
/** Return user UAs */
function setSimFriendlyName(user, imsi, friendlyName) {
    return __awaiter(this, void 0, void 0, function () {
        var b64FriendlyName, sql, queryResults, uaRows, userUas, uaRows_2, uaRows_2_1, row, e_12, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    b64FriendlyName = semasim_gateway_1.mySqlFunctions.b64.enc(friendlyName);
                    sql = [
                        "SELECT @sim_ref:= sim.id_, @is_sim_owned:= sim.user= " + semasim_gateway_1.mySqlFunctions.esc(user),
                        "FROM sim",
                        "LEFT JOIN user_sim ON user_sim.sim= sim.id_",
                        "WHERE sim.imsi= " + semasim_gateway_1.mySqlFunctions.esc(imsi) + " AND ( sim.user= " + semasim_gateway_1.mySqlFunctions.esc(user) + " OR user_sim.user= " + semasim_gateway_1.mySqlFunctions.esc(user) + ")",
                        "GROUP BY sim.id_",
                        ";",
                        "SELECT _ASSERT(@sim_ref IS NOT NULL, 'User does not have access to this SIM')",
                        ";",
                        "UPDATE sim",
                        "SET base64_friendly_name= " + semasim_gateway_1.mySqlFunctions.esc(b64FriendlyName),
                        "WHERE id_= @sim_ref AND @is_sim_owned",
                        ";",
                        "UPDATE user_sim",
                        "SET base64_friendly_name= " + semasim_gateway_1.mySqlFunctions.esc(b64FriendlyName) + ", base64_sharing_request_message= NULL",
                        "WHERE sim= @sim_ref AND user= " + semasim_gateway_1.mySqlFunctions.esc(user) + " AND NOT @is_sim_owned",
                        ";",
                        "SELECT ua.*, user.email",
                        "FROM ua",
                        "INNER JOIN user ON user.id_= ua.user",
                        "WHERE user= " + semasim_gateway_1.mySqlFunctions.esc(user)
                    ].join("\n");
                    return [4 /*yield*/, exports.query(sql)];
                case 1:
                    queryResults = _b.sent();
                    uaRows = queryResults.pop();
                    userUas = [];
                    try {
                        for (uaRows_2 = __values(uaRows), uaRows_2_1 = uaRows_2.next(); !uaRows_2_1.done; uaRows_2_1 = uaRows_2.next()) {
                            row = uaRows_2_1.value;
                            userUas.push({
                                "instance": row["instance"],
                                "userEmail": row["email"],
                                "platform": row["platform"],
                                "pushToken": row["push_token"],
                                "software": row["software"]
                            });
                        }
                    }
                    catch (e_12_1) { e_12 = { error: e_12_1 }; }
                    finally {
                        try {
                            if (uaRows_2_1 && !uaRows_2_1.done && (_a = uaRows_2.return)) _a.call(uaRows_2);
                        }
                        finally { if (e_12) throw e_12.error; }
                    }
                    return [2 /*return*/, userUas];
            }
        });
    });
}
exports.setSimFriendlyName = setSimFriendlyName;
function getSimOwner(imsi) {
    return __awaiter(this, void 0, void 0, function () {
        var rows;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.query([
                        "SELECT user.*",
                        "FROM user",
                        "INNER JOIN sim ON sim.user= user.id_",
                        "WHERE sim.imsi= " + semasim_gateway_1.mySqlFunctions.esc(imsi)
                    ].join("\n"))];
                case 1:
                    rows = _a.sent();
                    if (!rows.length) {
                        return [2 /*return*/, undefined];
                    }
                    else {
                        return [2 /*return*/, {
                                "user": rows[0]["id_"],
                                "email": rows[0]["email"]
                            }];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.getSimOwner = getSimOwner;
