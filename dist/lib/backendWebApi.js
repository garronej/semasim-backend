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
Object.defineProperty(exports, "__esModule", { value: true });
var https = require("https");
var express = require("express");
var logger = require("morgan");
var fs = require("fs");
var path = require("path"); //TODO: remove
var nodeRestClient = require("node-rest-client");
var gatewaySipApi = require("./gatewaySipApi");
var backendSipProxy_1 = require("./backendSipProxy");
var db = require("./dbInterface");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_backendWebApi");
function startServer() {
    return new Promise(function (resolve) {
        var router = express.Router()
            .use(logger("dev"));
        router.get("/:method", function (req, res) {
            switch (req.params.method) {
                case getConfigAndUnlock.methodName: return getConfigAndUnlock.handler(req, res);
                case getUserConfig.methodName: return getUserConfig.handler(req, res);
                default: return res.status(400).end();
            }
        });
        var app = express()
            .use("/" + _constants_1.c.webApiPath, router);
        var httpsServer = https.createServer(_constants_1.c.tlsOptions)
            .on("request", app)
            .listen(_constants_1.c.webApiPort)
            .on("listening", function () { return resolve(); });
    });
}
exports.startServer = startServer;
var getUserConfig;
(function (getUserConfig) {
    getUserConfig.methodName = "get-user-config";
    function generateUserConfig(endpointConfigs) {
        return __spread([
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
            [
                "<config xmlns=\"http://www.linphone.org/xsds/lpconfig.xsd\" ",
                "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" ",
                "xsi:schemaLocation=\"http://www.linphone.org/xsds/lpconfig.xsd lpconfig.xsd\">",
            ].join(""),
            "  <section name=\"sip\">",
            "    <entry name=\"sip_port\">-1</entry>",
            "    <entry name=\"sip_tcp_port\">5060</entry>",
            "    <entry name=\"sip_tls_port\">5061</entry>",
            "    <entry name=\"default_proxy\">0</entry>",
            "    <entry name=\"ping_with_options\">0</entry>",
            "  </section>",
            "  <section name=\"net\">",
            "    <entry name=\"dns_srv_enabled\">0</entry>",
            "    <entry name=\"firewall_policy\">ice</entry>",
            "    <entry name=\"stun_server\">" + _constants_1.c.backendHostname + "</entry>",
            "  </section>"
        ], endpointConfigs, [
            "</config>"
        ]).join("\n");
    }
    function generateEndpointConfig(id, display_name, imei, last_four_digits_of_iccid) {
        return [
            "  <section name=\"proxy_" + id + "\">",
            "    <entry name=\"reg_proxy\">sip:" + _constants_1.c.backendHostname + ";transport=tls</entry>",
            "    <entry name=\"reg_route\">sip:" + _constants_1.c.backendHostname + ";transport=tls;lr</entry>",
            "    <entry name=\"reg_expires\">" + _constants_1.c.reg_expires + "</entry>",
            "    <entry name=\"reg_identity\">\"" + display_name + "\" &lt;sip:" + imei + "@" + _constants_1.c.backendHostname + ";transport=tls&gt;</entry>",
            "    <entry name=\"reg_sendregister\">1</entry>",
            "    <entry name=\"publish\">0</entry>",
            "  </section>",
            "  <section name=\"auth_info_" + id + "\">",
            "    <entry name=\"username\">" + imei + "</entry>",
            "    <entry name=\"userid\">" + imei + "</entry>",
            "    <entry name=\"passwd\">" + last_four_digits_of_iccid + "</entry>",
            "    <entry name=\"realm\">semasim</entry>",
            "  </section>"
        ].join("\n");
    }
    function validateQueryString(query) {
        try {
            var _a = query, email = _a.email, password = _a.password;
            return (email.match(_constants_1.c.regExpEmail) !== null &&
                password.match(_constants_1.c.regExpPassword) !== null);
        }
        catch (error) {
            return false;
        }
    }
    function handler(req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var query, configs, endpointConfigs, id, _loop_1, _a, _b, _c, dongle_imei, sim_iccid, sim_number, sim_service_provider, e_1_1, xml, error_1, e_1, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        debug("=>getUserConfig");
                        return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                                var email, password, url, error_2;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 5, , 6]);
                                            email = "joseph.garrone.gj@gmail.com";
                                            password = "abcde12345";
                                            return [4 /*yield*/, db.semasim_backend.deleteUser(email)];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, db.semasim_backend.addUser(email, "abcde12345")];
                                        case 2:
                                            _a.sent();
                                            return [4 /*yield*/, db.semasim_backend.addConfig(email, {
                                                    "dongle_imei": "353145038273450",
                                                    "sim_iccid": "8933150116110005978",
                                                    "sim_number": "+33769365812",
                                                    "sim_service_provider": "Free"
                                                })];
                                        case 3:
                                            _a.sent();
                                            return [4 /*yield*/, db.semasim_backend.addConfig(email, {
                                                    "dongle_imei": "358880032664586",
                                                    "sim_iccid": "8933201717151946530",
                                                    "sim_number": "+33636786385",
                                                    "sim_service_provider": "Bouygues Telecom"
                                                })];
                                        case 4:
                                            _a.sent();
                                            url = buildUrl(getUserConfig.methodName, { email: email, password: password });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_2 = _a.sent();
                                            console.log("error", error_2);
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); })()];
                    case 1:
                        _e.sent();
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 13, , 14]);
                        query = req.query;
                        debug({ query: query });
                        if (!validateQueryString(query))
                            throw new Error("INVALID_QUERY");
                        return [4 /*yield*/, db.semasim_backend.checkUserPassword(query.email, query.password)];
                    case 3:
                        if (!(_e.sent()))
                            throw new Error("FORBIDDEN");
                        return [4 /*yield*/, db.semasim_backend.getUserConfigs(query.email)];
                    case 4:
                        configs = _e.sent();
                        endpointConfigs = [];
                        id = 0;
                        _loop_1 = function (dongle_imei, sim_iccid, sim_number, sim_service_provider) {
                            var last_four_digits_of_iccid = sim_iccid.substring(sim_iccid.length - 4);
                            var display_name = (function () {
                                var out = sim_service_provider || "";
                                out += sim_number || "";
                                if (!out)
                                    out += last_four_digits_of_iccid;
                                return out;
                            })();
                            endpointConfigs[endpointConfigs.length] = generateEndpointConfig(id++, display_name, dongle_imei, last_four_digits_of_iccid);
                        };
                        _e.label = 5;
                    case 5:
                        _e.trys.push([5, 10, 11, 12]);
                        return [4 /*yield*/, db.semasim_backend.getUserConfigs(query.email)];
                    case 6:
                        _a = __values.apply(void 0, [_e.sent()]), _b = _a.next();
                        _e.label = 7;
                    case 7:
                        if (!!_b.done) return [3 /*break*/, 9];
                        _c = _b.value, dongle_imei = _c.dongle_imei, sim_iccid = _c.sim_iccid, sim_number = _c.sim_number, sim_service_provider = _c.sim_service_provider;
                        _loop_1(dongle_imei, sim_iccid, sim_number, sim_service_provider);
                        _e.label = 8;
                    case 8:
                        _b = _a.next();
                        return [3 /*break*/, 7];
                    case 9: return [3 /*break*/, 12];
                    case 10:
                        e_1_1 = _e.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 12];
                    case 11:
                        try {
                            if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 12:
                        xml = generateUserConfig(endpointConfigs);
                        debug(xml);
                        res.setHeader("Content-Type", "application/xml; charset=utf-8");
                        res.status(200).send(new Buffer(xml, "utf8"));
                        return [3 /*break*/, 14];
                    case 13:
                        error_1 = _e.sent();
                        debug(error_1.message);
                        res.statusMessage = error_1.message;
                        res.status(400).end();
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/];
                }
            });
        });
    }
    getUserConfig.handler = handler;
})(getUserConfig = exports.getUserConfig || (exports.getUserConfig = {}));
var getConfigAndUnlock;
(function (getConfigAndUnlock) {
    var xml = undefined;
    function generateXml(imei, last_four_digits_of_iccid) {
        if (!xml) {
            xml = fs.readFileSync(path.join(__dirname, "..", "..", "res", "remote_provisioning.xml"), "utf8");
            xml = xml.replace(/DOMAIN/g, _constants_1.c.backendHostname);
            xml = xml.replace(/REG_EXPIRES/g, "" + _constants_1.c.reg_expires);
        }
        var newXml = xml;
        newXml = newXml.replace(/IMEI/g, imei);
        newXml = newXml.replace(/LAST_FOUR_DIGITS_OF_ICCID/g, last_four_digits_of_iccid);
        newXml = newXml.replace(/DISPLAY_NAME/g, "XXXXXXX");
        return newXml;
    }
    getConfigAndUnlock.methodName = "get-config-and-unlock";
    function validateQueryString(query) {
        try {
            var _a = query, imei = _a.imei, last_four_digits_of_iccid = _a.last_four_digits_of_iccid, pin_first_try = _a.pin_first_try, pin_second_try = _a.pin_second_try;
            return (imei.match(/^[0-9]{15}$/) !== null &&
                last_four_digits_of_iccid.match(/^[0-9]{4}$/) !== null &&
                pin_first_try.match(/^[0-9]{4}$/) !== null &&
                (pin_second_try === undefined || pin_second_try.match(/^[0-9]{4}$/) !== null));
        }
        catch (error) {
            return false;
        }
    }
    function handler(req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var query, gatewaySocket, resp, xml_1, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        debug("=>getConfig");
                        query = req.query;
                        debug({ query: query });
                        if (!validateQueryString(query))
                            throw new Error("INVALID_QUERY");
                        gatewaySocket = backendSipProxy_1.gatewaySockets.get(query.imei);
                        if (!gatewaySocket)
                            throw new Error("GATEWAY_NOT_FOUND");
                        return [4 /*yield*/, gatewaySipApi.unlockDongle.run(gatewaySocket, query)];
                    case 1:
                        resp = _a.sent();
                        if (resp.pinState !== "READY")
                            throw new Error("UNLOCK_FAILED");
                        debug({ resp: resp });
                        res.setHeader("Content-Type", "application/xml; charset=utf-8");
                        xml_1 = generateXml(query.imei, query.last_four_digits_of_iccid);
                        debug(xml_1);
                        res.status(200).send(new Buffer(xml_1, "utf8"));
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        debug(error_3.message);
                        res.statusMessage = error_3.message;
                        res.status(400).end();
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
    getConfigAndUnlock.handler = handler;
    function run(params) {
        return new Promise(function (resolve, reject) {
            var client = new nodeRestClient.Client();
            var paramsAsRecord = (function () {
                var out = {};
                try {
                    for (var _a = __values(Object.keys(params)), _b = _a.next(); !_b.done; _b = _a.next()) {
                        var key = _b.value;
                        out[key] = params[key];
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                return out;
                var e_2, _c;
            })();
            client.get(buildUrl(getConfigAndUnlock.methodName, paramsAsRecord), function (data, _a) {
                var statusCode = _a.statusCode, statusMessage = _a.statusMessage;
                if (statusCode !== 200)
                    return reject(new Error("webAPI " + getConfigAndUnlock.methodName + " error " + statusCode + ", " + statusMessage));
                resolve(data);
            });
        });
    }
    getConfigAndUnlock.run = run;
})(getConfigAndUnlock = exports.getConfigAndUnlock || (exports.getConfigAndUnlock = {}));
function buildUrl(methodName, params) {
    var query = [];
    try {
        for (var _a = __values(Object.keys(params)), _b = _a.next(); !_b.done; _b = _a.next()) {
            var key = _b.value;
            var value = params[key];
            if (value === undefined)
                continue;
            query[query.length] = key + "=" + params[key];
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
        }
        finally { if (e_3) throw e_3.error; }
    }
    var url = "https://" + _constants_1.c.backendHostname + ":" + _constants_1.c.webApiPort + "/" + _constants_1.c.webApiPath + "/" + methodName + "?" + query.join("&");
    console.log("GET " + url);
    return url;
    var e_3, _c;
}
