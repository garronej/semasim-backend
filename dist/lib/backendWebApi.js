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
var path = require("path");
var nodeRestClient = require("node-rest-client");
var gatewaySipApi = require("./gatewaySipApi");
var backendSipProxy_1 = require("./backendSipProxy");
var c = require("./_constants");
var _debug = require("debug");
var debug = _debug("_backendWebApi");
function startServer() {
    return new Promise(function (resolve) {
        var router = express.Router()
            .use(logger("dev"));
        router.get("/:method", function (req, res) {
            switch (req.params.method) {
                case getConfigAndUnlock.methodName: return getConfigAndUnlock.handler(req, res);
                default: return res.status(400).end();
            }
        });
        var app = express()
            .use("/" + c.webApiPath, router);
        var httpsServer = https.createServer(c.getTlsOptions())
            .on("request", app)
            .listen(c.webApiPort)
            .on("listening", function () { return resolve(); });
    });
}
exports.startServer = startServer;
var getConfigAndUnlock;
(function (getConfigAndUnlock) {
    var xml = undefined;
    function generateXml(imei, last_four_digits_of_iccid) {
        if (!xml) {
            xml = fs.readFileSync(path.join(__dirname, "..", "..", "res", "remote_provisioning.xml"), "utf8");
            xml = xml.replace(/DOMAIN/g, c.backendHostname);
            xml = xml.replace(/REG_EXPIRES/g, "" + c.reg_expires);
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
            var query, gatewaySocket, resp, xml_1, error_1;
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
                        error_1 = _a.sent();
                        debug(error_1.message);
                        res.statusMessage = error_1.message;
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
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return out;
                var e_1, _c;
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
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var url = "https://" + c.backendHostname + ":" + c.webApiPort + "/" + c.webApiPath + "/" + methodName + "?" + query.join("&");
    console.log("GET " + url);
    return url;
    var e_2, _c;
}
