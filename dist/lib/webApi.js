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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var html_entities = require("html-entities");
var entities = new html_entities.XmlEntities;
var semasim_gateway_1 = require("../semasim-gateway");
var sipProxy_1 = require("./sipProxy");
var db = require("./db");
var _ = require("./../../frontend/api");
var _constants_1 = require("./_constants");
require("colors");
var _debug = require("debug");
var debug = _debug("_backendWebApi");
function getRouter() {
    return express.Router()
        .use(logger("dev"))
        .use(bodyParser.json())
        .use("/:method", function (req, res) {
        try {
            handlers[req.params.method](req, res);
        }
        catch (error) {
            fail(res, _.unknownError);
        }
    });
}
exports.getRouter = getRouter;
function fail(res, statusMessage) {
    debug(("Error: " + statusMessage).red);
    res.statusMessage = statusMessage;
    res.status(400).end();
}
function failNoStatus(res, reason) {
    if (reason)
        debug(("Error " + reason).red);
    res.status(400).end();
}
var handlers = {};
(function () {
    var methodName = _.loginUser.methodName;
    function validateBody(query) {
        try {
            var _a = query, email = _a.email, password = _a.password;
            return (email.match(_constants_1.c.regExpEmail) !== null &&
                password.match(_constants_1.c.regExpPassword) !== null);
        }
        catch (_b) {
            return false;
        }
    }
    handlers[methodName] = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var body, email, password, user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName);
                    body = req.body;
                    debug({ body: body });
                    if (!validateBody(body))
                        return [2 /*return*/, failNoStatus(res, "malformed")];
                    email = body.email, password = body.password;
                    return [4 /*yield*/, db.authenticateUser(email, password)];
                case 1:
                    user = _a.sent();
                    if (!user)
                        return [2 /*return*/, failNoStatus(res, "Auth failed")];
                    req.session.user = user;
                    req.session.user_email = email;
                    res.status(200).end();
                    return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    var methodName = _.registerUser.methodName;
    function validateBody(query) {
        try {
            var _a = query, email = _a.email, password = _a.password;
            return (email.match(_constants_1.c.regExpEmail) !== null &&
                password.match(_constants_1.c.regExpPassword) !== null);
        }
        catch (_b) {
            return false;
        }
    }
    handlers[methodName] = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var body, email, password, isCreated;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    body = req.body;
                    if (!validateBody(body))
                        return [2 /*return*/, failNoStatus(res, "malformed")];
                    email = body.email, password = body.password;
                    return [4 /*yield*/, db.addUser(email, password)];
                case 1:
                    isCreated = _a.sent();
                    if (!isCreated)
                        return [2 /*return*/, fail(res, "EMAIL_NOT_AVAILABLE")];
                    res.status(200).end();
                    return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    var methodName = _.createUserEndpoint.methodName;
    function validateBody(query) {
        try {
            var _a = query, imei = _a.imei, last_four_digits_of_iccid = _a.last_four_digits_of_iccid, pin_first_try = _a.pin_first_try, pin_second_try = _a.pin_second_try;
            return (imei.match(_constants_1.c.regExpImei) !== null &&
                last_four_digits_of_iccid.match(_constants_1.c.regExpFourDigits) !== null &&
                (pin_first_try === undefined || pin_first_try.match(_constants_1.c.regExpFourDigits) !== null) &&
                (pin_second_try === undefined || pin_second_try.match(_constants_1.c.regExpFourDigits) !== null));
        }
        catch (_b) {
            return false;
        }
    }
    ;
    handlers[methodName] = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var body, imei, last_four_digits_of_iccid, pin_first_try, pin_second_try, user, gatewaySocket, unlockResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName);
                    body = req.body;
                    debug({ body: body });
                    if (!validateBody(body))
                        return [2 /*return*/, failNoStatus(res, "malformed")];
                    imei = body.imei, last_four_digits_of_iccid = body.last_four_digits_of_iccid, pin_first_try = body.pin_first_try, pin_second_try = body.pin_second_try;
                    user = req.session.user;
                    if (!user)
                        return [2 /*return*/, fail(res, "USER_NOT_LOGGED")];
                    gatewaySocket = sipProxy_1.gatewaySockets.get(imei);
                    if (!gatewaySocket)
                        return [2 /*return*/, fail(res, "DONGLE_NOT_FOUND")];
                    return [4 /*yield*/, semasim_gateway_1.sipApiClientGateway.unlockDongle.makeCall(gatewaySocket, {
                            imei: imei,
                            last_four_digits_of_iccid: last_four_digits_of_iccid,
                            pin_first_try: pin_first_try,
                            pin_second_try: pin_second_try
                        })];
                case 1:
                    unlockResult = _a.sent();
                    if (unlockResult.status === "STILL LOCKED") {
                        if (!pin_first_try)
                            fail(res, "SIM_PIN_LOCKED_AND_NO_PIN_PROVIDED");
                        else
                            fail(res, "WRONG_PIN");
                        return [2 /*return*/];
                    }
                    if (unlockResult.status === "ERROR") {
                        //TODO: No! Some other error may happen
                        debug("ERROR".red);
                        debug(unlockResult);
                        return [2 /*return*/, fail(res, "ICCID_MISMATCH")];
                    }
                    return [4 /*yield*/, db.addEndpoint(unlockResult.dongle, user)];
                case 2:
                    _a.sent();
                    res.status(200).end();
                    return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    /*
    <string name="semasim_login_url"> https://www.&domain;/api/get-user-linphone-config
    ?email_as_hex=%1$s&amp;password_as_hex=%2$s&amp;instance_id_as_hex=%3$s</string>
    */
    var methodName = "get-user-linphone-config";
    function validateQueryString(query) {
        try {
            var _a = query, email_as_hex = _a.email_as_hex, password_as_hex = _a.password_as_hex, instance_id_as_hex = _a.instance_id_as_hex;
            var email = (new Buffer(email_as_hex, "hex")).toString("utf8");
            var password = (new Buffer(password_as_hex, "hex")).toString("utf8");
            var instanceId = (new Buffer(instance_id_as_hex, "hex")).toString("utf8");
            return (email.match(_constants_1.c.regExpEmail) !== null &&
                password.match(_constants_1.c.regExpPassword) !== null &&
                !!instanceId);
        }
        catch (_b) {
            return false;
        }
    }
    var ov = " overwrite=\"true\" ";
    var domain = _constants_1.c.shared.domain;
    function generateGlobalConfig(endpointConfigs, phonebookConfigs) {
        return __spread([
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
            [
                "<config xmlns=\"http://www.linphone.org/xsds/lpconfig.xsd\" ",
                "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" ",
                "xsi:schemaLocation=\"http://www.linphone.org/xsds/lpconfig.xsd lpconfig.xsd\">",
            ].join(""),
            "  <section name=\"sip\">",
            "    <entry name=\"ping_with_options\" " + ov + ">0</entry>",
            "  </section>",
            "  <section name=\"net\">",
            "    <entry name=\"dns_srv_enabled\" " + ov + ">1</entry>",
            "  </section>"
        ], endpointConfigs, phonebookConfigs, [
            "</config>"
        ]).join("\n");
    }
    function updateEndpointConfigs(id, dongle, endpointConfigs) {
        var display_name = (function generateDisplayName(id, sim) {
            var infos = [];
            if (sim.number)
                infos.push("" + sim.number);
            if (sim.serviceProvider)
                infos.push("" + sim.serviceProvider);
            var infosConcat = ": " + infos.join("-");
            return "Sim" + (id + 1) + infosConcat;
        })(id, dongle.sim);
        var reg_identity = entities.encode("\"" + display_name + "\" <sip:" + dongle.imei + "@" + domain + ";transport=tls>");
        var last_four_digits_of_iccid = dongle.sim.iccid.substring(dongle.sim.iccid.length - 4);
        //let stunServer= networkTools.getStunServer.previousResult!;
        endpointConfigs[endpointConfigs.length] = [
            "  <section name=\"nat_policy_" + id + "\">",
            "    <entry name=\"ref\" " + ov + ">nat_policy_" + id + "</entry>",
            //`    <entry name="stun_server" ${ov}>${stunServer.ip}:${stunServer.port}</entry>`,
            "    <entry name=\"stun_server\" " + ov + ">" + _constants_1.c.shared.domain + "</entry>",
            "    <entry name=\"protocols\" " + ov + ">stun,ice</entry>",
            "  </section>",
            "  <section name=\"proxy_" + id + "\">",
            "    <entry name=\"reg_proxy\" " + ov + ">sip:" + domain + ";transport=tls</entry>",
            "    <entry name=\"reg_route\" " + ov + ">sip:" + domain + ";transport=tls;lr</entry>",
            "    <entry name=\"reg_expires\" " + ov + ">" + _constants_1.c.reg_expires + "</entry>",
            "    <entry name=\"reg_identity\" " + ov + ">" + reg_identity + "</entry>",
            "    <entry name=\"reg_sendregister\" " + ov + ">1</entry>",
            "    <entry name=\"publish\" " + ov + ">0</entry>",
            "    <entry name=\"nat_policy_ref\" " + ov + ">nat_policy_" + id + "</entry>",
            "  </section>",
            "  <section name=\"auth_info_" + id + "\">",
            "    <entry name=\"username\" " + ov + ">" + dongle.imei + "</entry>",
            "    <entry name=\"userid\" " + ov + ">" + dongle.imei + "</entry>",
            "    <entry name=\"passwd\" " + ov + ">" + last_four_digits_of_iccid + "</entry>",
            "  </section>"
        ].join("\n");
        /*
        endpointConfigs[endpointConfigs.length] = [
            `  <section name="nat_policy_${id}">`,
            `    <entry name="ref" ${ov}>nat_policy_${id}</entry>`,
            `    <entry name="stun_server" ${ov}>${c.shared.domain}</entry>`,
            `    <entry name="protocols" ${ov}>stun,turn,ice</entry>`,
            `    <entry name="stun_server_username" ${ov}>ad9c087a-bb61-11e7-afe4-f71e2efec7c1</entry>`,
            `  </section>`,
            `  <section name="proxy_${id}">`,
            `    <entry name="reg_proxy" ${ov}>sip:${domain};transport=tls</entry>`,
            `    <entry name="reg_route" ${ov}>sip:${domain};transport=tls;lr</entry>`,
            `    <entry name="reg_expires" ${ov}>${c.reg_expires}</entry>`,
            `    <entry name="reg_identity" ${ov}>${reg_identity}</entry>`,
            `    <entry name="reg_sendregister" ${ov}>1</entry>`,
            `    <entry name="publish" ${ov}>0</entry>`,
            `    <entry name="nat_policy_ref" ${ov}>nat_policy_${id}</entry>`,
            `  </section>`,
            `  <section name="auth_info_${id}">`,
            `    <entry name="username" ${ov}>${dongle.imei}</entry>`,
            `    <entry name="userid" ${ov}>${dongle.imei}</entry>`,
            `    <entry name="passwd" ${ov}>${last_four_digits_of_iccid}</entry>`,
            `  </section>`,
            `  <section name="auth_info_${id+1}">`,
            `    <entry name="username" ${ov}>ad9c087a-bb61-11e7-afe4-f71e2efec7c1</entry>`,
            `    <entry name="userid" ${ov}>ad9c0906-bb61-11e7-9878-e8a34e885e55</entry>`,
            `    <entry name="passwd" ${ov}>ad9c0906-bb61-11e7-9878-e8a34e885e55</entry>`,
            `  </section>`
        ].join("\n");
        */
    }
    function updatePhonebookConfigs(id, contacts, phonebookConfigs) {
        var startIndex = phonebookConfigs.length;
        for (var i = 0; i < contacts.length; i++) {
            var contact = contacts[i];
            //TODO: Test with special characters, see if it break linephone
            var url = entities.encode("\"" + contact.name + " (Sim" + (id + 1) + ")\" <sip:" + contact.number + "@" + domain + ">");
            phonebookConfigs[phonebookConfigs.length] = [
                "  <section name=\"friend_" + (startIndex + i) + "\">",
                "    <entry name=\"url\" " + ov + ">" + url + "</entry>",
                "    <entry name=\"pol\" " + ov + ">accept</entry>",
                "    <entry name=\"subscribe\" " + ov + ">0</entry>",
                "  </section>",
            ].join("\n");
        }
    }
    /*
    networkTools.getStunServer.domain = c.shared.domain;
    let prGetStun= networkTools.getStunServer.defineUpdateInterval();
    */
    handlers[methodName] = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var query, email_as_hex, password_as_hex, instance_id_as_hex, email, password, instanceId, user, endpointConfigs, phonebookConfigs, id, _a, _b, dongle, e_1_1, xml, e_1, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    debug("handle " + methodName);
                    query = req.query;
                    if (!validateQueryString(query))
                        return [2 /*return*/, failNoStatus(res, "malformed")];
                    email_as_hex = query.email_as_hex, password_as_hex = query.password_as_hex, instance_id_as_hex = query.instance_id_as_hex;
                    email = (new Buffer(email_as_hex, "hex")).toString("utf8");
                    password = (new Buffer(password_as_hex, "hex")).toString("utf8");
                    instanceId = (new Buffer(instance_id_as_hex, "hex")).toString("utf8");
                    return [4 /*yield*/, db.authenticateUser(email, password)];
                case 1:
                    user = _d.sent();
                    if (!user)
                        return [2 /*return*/, failNoStatus(res, "user not found")];
                    endpointConfigs = [];
                    phonebookConfigs = [];
                    id = 0;
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 7, 8, 9]);
                    return [4 /*yield*/, db.getEndpoints(user)];
                case 3:
                    _a = __values.apply(void 0, [_d.sent()]), _b = _a.next();
                    _d.label = 4;
                case 4:
                    if (!!_b.done) return [3 /*break*/, 6];
                    dongle = _b.value;
                    updateEndpointConfigs(id, dongle, endpointConfigs);
                    updatePhonebookConfigs(id, dongle.sim.phonebook.contacts, phonebookConfigs);
                    id++;
                    _d.label = 5;
                case 5:
                    _b = _a.next();
                    return [3 /*break*/, 4];
                case 6: return [3 /*break*/, 9];
                case 7:
                    e_1_1 = _d.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 9];
                case 8:
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 9:
                    xml = generateGlobalConfig(endpointConfigs, phonebookConfigs);
                    debug(xml);
                    console.log({ instanceId: instanceId });
                    res.setHeader("Content-Type", "application/xml; charset=utf-8");
                    res.status(200).send(new Buffer(xml, "utf8"));
                    return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    var methodName = _.deleteUserEndpoint.methodName;
    function validateBody(query) {
        try {
            var imei = query.imei;
            return imei.match(_constants_1.c.regExpImei) !== null;
        }
        catch (_a) {
            return false;
        }
    }
    handlers[methodName] = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var body, imei, user, isDeleted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName);
                    body = req.body;
                    if (!validateBody(body))
                        return [2 /*return*/, failNoStatus(res, "malformed")];
                    imei = body.imei;
                    user = req.session.user;
                    if (!user)
                        return [2 /*return*/, fail(res, "USER_NOT_LOGGED")];
                    return [4 /*yield*/, db.deleteEndpoint(imei, user)];
                case 1:
                    isDeleted = _a.sent();
                    if (!isDeleted)
                        return [2 /*return*/, fail(res, "ENDPOINT_NOT_FOUND")];
                    res.status(200).end();
                    return [2 /*return*/];
            }
        });
    }); };
})();
