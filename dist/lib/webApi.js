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
var semasim_webclient_1 = require("../semasim-webclient");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_backendWebApi");
function getRouter() {
    return express.Router()
        .use(logger("dev"))
        .use(bodyParser.json())
        .use("/:method", function (req, res) {
        debug("Api call");
        var handler = handlers[req.params.method];
        if (!handler)
            return res.status(404).end();
        handler(req, res);
    });
}
exports.getRouter = getRouter;
function fail(res, statusMessage) {
    debug("error", statusMessage);
    res.statusMessage = statusMessage;
    res.status(400).end();
}
function failNoStatus(res, reason) {
    if (reason)
        debug("error", reason);
    res.status(400).end();
}
var handlers = {};
(function () {
    var methodName = semasim_webclient_1.webApiClient.loginUser.methodName;
    function validateBody(query) {
        try {
            var _a = query, email = _a.email, password = _a.password;
            return (email.match(_constants_1.c.regExpEmail) !== null &&
                password.match(_constants_1.c.regExpPassword) !== null);
        }
        catch (error) {
            return false;
        }
    }
    handlers[methodName] = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var body, email, password, user_id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName);
                    body = req.body;
                    debug({ body: body });
                    if (!validateBody(body))
                        return [2 /*return*/, failNoStatus(res, "malformed")];
                    email = body.email, password = body.password;
                    return [4 /*yield*/, db.semasim_backend.getUserIdIfGranted(email, password)];
                case 1:
                    user_id = _a.sent();
                    debug("======>", { user_id: user_id });
                    if (!user_id)
                        return [2 /*return*/, failNoStatus(res, "Auth failed")];
                    req.session.user_id = user_id;
                    req.session.user_email = email;
                    debug("User granted " + user_id);
                    res.status(200).end();
                    return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    var methodName = semasim_webclient_1.webApiClient.registerUser.methodName;
    function validateBody(query) {
        try {
            var _a = query, email = _a.email, password = _a.password;
            return (email.match(_constants_1.c.regExpEmail) !== null &&
                password.match(_constants_1.c.regExpPassword) !== null);
        }
        catch (error) {
            return false;
        }
    }
    handlers[methodName] = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var body, email, password, isCreated;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName);
                    debug({ "session": req.session });
                    body = req.body;
                    debug({ body: body });
                    if (!validateBody(body))
                        return [2 /*return*/, failNoStatus(res, "malformed")];
                    email = body.email, password = body.password;
                    return [4 /*yield*/, db.semasim_backend.addUser(email, password)];
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
    var methodName = semasim_webclient_1.webApiClient.createdUserEndpointConfig.methodName;
    function validateBody(query) {
        try {
            var _a = query, imei = _a.imei, last_four_digits_of_iccid = _a.last_four_digits_of_iccid, pin_first_try = _a.pin_first_try, pin_second_try = _a.pin_second_try;
            return (imei.match(_constants_1.c.regExpImei) !== null &&
                last_four_digits_of_iccid.match(_constants_1.c.regExpFourDigits) !== null &&
                (pin_first_try === undefined || pin_first_try.match(_constants_1.c.regExpFourDigits) !== null) &&
                (pin_second_try === undefined || pin_second_try.match(_constants_1.c.regExpFourDigits) !== null));
        }
        catch (error) {
            return false;
        }
    }
    ;
    handlers[methodName] = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var body, imei, last_four_digits_of_iccid, pin_first_try, pin_second_try, user_id, gatewaySocket, hasSim, unlockResult, phonebook;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName);
                    body = req.body;
                    debug({ body: body });
                    if (!validateBody(body))
                        return [2 /*return*/, failNoStatus(res, "malformed")];
                    imei = body.imei, last_four_digits_of_iccid = body.last_four_digits_of_iccid, pin_first_try = body.pin_first_try, pin_second_try = body.pin_second_try;
                    user_id = req.session.user_id;
                    if (!user_id)
                        return [2 /*return*/, fail(res, "USER_NOT_LOGGED")];
                    debug({ user_id: user_id });
                    gatewaySocket = sipProxy_1.gatewaySockets.get(imei);
                    debug("Gateway socket found");
                    if (!gatewaySocket)
                        return [2 /*return*/, fail(res, "DONGLE_NOT_FOUND")];
                    return [4 /*yield*/, semasim_gateway_1.sipApiClientGateway.doesDongleHasSim.makeCall(gatewaySocket, imei, last_four_digits_of_iccid)];
                case 1:
                    hasSim = _a.sent();
                    if (!hasSim)
                        return [2 /*return*/, fail(res, "ICCID_MISMATCH")];
                    return [4 /*yield*/, semasim_gateway_1.sipApiClientGateway.unlockDongle.makeCall(gatewaySocket, {
                            imei: imei,
                            last_four_digits_of_iccid: last_four_digits_of_iccid,
                            pin_first_try: pin_first_try,
                            pin_second_try: pin_second_try
                        })];
                case 2:
                    unlockResult = _a.sent();
                    if (!unlockResult.dongleFound)
                        return [2 /*return*/, fail(res, "DONGLE_NOT_FOUND")];
                    if (unlockResult.pinState !== "READY") {
                        if (!pin_first_try)
                            fail(res, "SIM_PIN_LOCKED_AND_NO_PIN_PROVIDED");
                        else
                            fail(res, "WRONG_PIN");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, db.semasim_backend.addEndpointConfig(user_id, {
                            "dongle_imei": imei,
                            "sim_iccid": unlockResult.iccid,
                            "sim_number": unlockResult.number || null,
                            "sim_service_provider": unlockResult.serviceProvider || null
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, semasim_gateway_1.sipApiClientGateway.getSimPhonebook.makeCall(gatewaySocket, unlockResult.iccid)];
                case 4:
                    phonebook = _a.sent();
                    if (!phonebook) return [3 /*break*/, 6];
                    return [4 /*yield*/, db.semasim_backend.setSimContacts(unlockResult.iccid, phonebook.contacts)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    res.status(200).end();
                    return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    var methodName = semasim_webclient_1.webApiClient.getUserEndpointConfigs.methodName;
    handlers[methodName] = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var user_id, configs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName);
                    user_id = req.session.user_id;
                    if (!user_id)
                        return [2 /*return*/, fail(res, "USER_NOT_LOGGED")];
                    return [4 /*yield*/, db.semasim_backend.getUserEndpointConfigs(user_id)];
                case 1:
                    configs = _a.sent();
                    res.setHeader("Content-Type", "application/json; charset=utf-8");
                    res.status(200).send(new Buffer(JSON.stringify(configs), "utf8"));
                    return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    var methodName = semasim_webclient_1.webApiClient.getUserLinphoneConfig.methodName;
    function validateQueryString(query) {
        try {
            var _a = query, email_as_hex = _a.email_as_hex, password_as_hex = _a.password_as_hex;
            var email = (new Buffer(email_as_hex, "hex")).toString("utf8");
            var password = (new Buffer(password_as_hex, "hex")).toString("utf8");
            return (email.match(_constants_1.c.regExpEmail) !== null &&
                password.match(_constants_1.c.regExpPassword) !== null);
        }
        catch (error) {
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
            //`    <entry name="sip_port" overwrite="true">-1</entry>`,
            //`    <entry name="sip_tcp_port" overwrite="true">5060</entry>`,
            //`    <entry name="sip_tls_port" overwrite="true">5061</entry>`,
            "    <entry name=\"ping_with_options\" " + ov + ">0</entry>",
            "  </section>",
            "  <section name=\"net\">",
            "    <entry name=\"dns_srv_enabled\" " + ov + ">1</entry>",
            "  </section>"
        ], endpointConfigs, phonebookConfigs, [
            "</config>"
        ]).join("\n");
    }
    function generateEndpointConfig(id, display_name, imei, last_four_digits_of_iccid, endpointConfigs) {
        //let reg_identity= `"${display_name}" &lt;sip:${imei}@${domain};transport=tls&gt;`;
        var reg_identity = entities.encode("\"" + display_name + "\" <sip:" + imei + "@" + domain + ";transport=tls>");
        endpointConfigs[endpointConfigs.length] = [
            "  <section name=\"nat_policy_" + id + "\">",
            "    <entry name=\"ref\" " + ov + ">nat_policy_" + id + "</entry>",
            "    <entry name=\"stun_server\" " + ov + ">" + domain + "</entry>",
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
            "    <entry name=\"username\" " + ov + ">" + imei + "</entry>",
            "    <entry name=\"userid\" " + ov + ">" + imei + "</entry>",
            "    <entry name=\"passwd\" " + ov + ">" + last_four_digits_of_iccid + "</entry>",
            "  </section>"
        ].join("\n");
    }
    function generatePhonebookConfig(id, contacts, phonebookConfigs) {
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
    function generateDisplayName(id, sim_number, sim_service_provider, last_four_digits_of_iccid) {
        var infos = [];
        if (sim_number)
            infos.push("" + sim_number);
        if (sim_service_provider)
            infos.push("" + sim_service_provider);
        var infosConcat = infos.join("-");
        if (!infosConcat)
            infosConcat = "iccid:..." + last_four_digits_of_iccid;
        return "Sim" + (id + 1) + ":" + infosConcat;
    }
    handlers[methodName] = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var query, email_as_hex, password_as_hex, email, password, user_id, endpointConfigs, phonebookConfigs, id, _a, _b, _c, dongle_imei, sim_iccid, sim_number, sim_service_provider, last_four_digits_of_iccid, display_name, _d, _e, e_1_1, xml, e_1, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    debug("handle " + methodName);
                    query = req.query;
                    debug({ query: query });
                    if (!validateQueryString(query))
                        return [2 /*return*/, failNoStatus(res, "malformed")];
                    email_as_hex = query.email_as_hex, password_as_hex = query.password_as_hex;
                    email = (new Buffer(email_as_hex, "hex")).toString("utf8");
                    password = (new Buffer(password_as_hex, "hex")).toString("utf8");
                    return [4 /*yield*/, db.semasim_backend.getUserIdIfGranted(email, password)];
                case 1:
                    user_id = _g.sent();
                    if (!user_id)
                        return [2 /*return*/, failNoStatus(res, "user not found")];
                    endpointConfigs = [];
                    phonebookConfigs = [];
                    id = -1;
                    _g.label = 2;
                case 2:
                    _g.trys.push([2, 8, 9, 10]);
                    return [4 /*yield*/, db.semasim_backend.getUserEndpointConfigs(user_id)];
                case 3:
                    _a = __values.apply(void 0, [_g.sent()]), _b = _a.next();
                    _g.label = 4;
                case 4:
                    if (!!_b.done) return [3 /*break*/, 7];
                    _c = _b.value, dongle_imei = _c.dongle_imei, sim_iccid = _c.sim_iccid, sim_number = _c.sim_number, sim_service_provider = _c.sim_service_provider;
                    id++;
                    last_four_digits_of_iccid = sim_iccid.substring(sim_iccid.length - 4);
                    display_name = generateDisplayName(id, sim_number, sim_service_provider, last_four_digits_of_iccid);
                    generateEndpointConfig(id, display_name, dongle_imei, last_four_digits_of_iccid, endpointConfigs);
                    _d = generatePhonebookConfig;
                    _e = [id];
                    return [4 /*yield*/, db.semasim_backend.getSimContacts(sim_iccid)];
                case 5:
                    _d.apply(void 0, _e.concat([_g.sent(),
                        phonebookConfigs]));
                    _g.label = 6;
                case 6:
                    _b = _a.next();
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_1_1 = _g.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (_b && !_b.done && (_f = _a.return)) _f.call(_a);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 10:
                    xml = generateGlobalConfig(endpointConfigs, phonebookConfigs);
                    debug(xml);
                    res.setHeader("Content-Type", "application/xml; charset=utf-8");
                    res.status(200).send(new Buffer(xml, "utf8"));
                    return [2 /*return*/];
            }
        });
    }); };
})();
(function () {
    var methodName = semasim_webclient_1.webApiClient.deleteUserEndpointConfig.methodName;
    function validateBody(query) {
        try {
            var imei = query.imei;
            return (imei.match(_constants_1.c.regExpImei) !== null);
        }
        catch (error) {
            return false;
        }
    }
    handlers[methodName] = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var body, imei, user_id, isDeleted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("handle " + methodName);
                    body = req.body;
                    debug({ body: body });
                    if (!validateBody(body))
                        return [2 /*return*/, failNoStatus(res, "malformed")];
                    imei = body.imei;
                    user_id = req.session.user_id;
                    if (!user_id)
                        return [2 /*return*/, fail(res, "USER_NOT_LOGGED")];
                    debug({ user_id: user_id });
                    return [4 /*yield*/, db.semasim_backend.deleteEndpointConfig(user_id, imei)];
                case 1:
                    isDeleted = _a.sent();
                    if (!isDeleted)
                        return [2 /*return*/, fail(res, "ENDPOINT_CONFIG_NOT_FOUND")];
                    res.status(200).end();
                    return [2 /*return*/];
            }
        });
    }); };
})();
