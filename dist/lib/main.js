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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
require("rejection-tracker").main(__dirname, "..", "..");
var https = require("https");
var http = require("http");
var express = require("express");
var session = require("express-session");
var forceDomain = require("forcedomain");
var networkTools = require("../tools/networkTools");
var sipProxy = require("./sipProxy");
var webApi = require("./webApi");
var semasim_webclient_1 = require("../semasim-webclient");
var _constants_1 = require("./_constants");
var _debug = require("debug");
var debug = _debug("_main");
(function () { return __awaiter(_this, void 0, void 0, function () {
    var hostname, interfaceLocalIp;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                debug("Starting semasim backend...");
                return [4 /*yield*/, sipProxy.startServer()];
            case 1:
                _a.sent();
                debug("..Sip proxy server started !");
                hostname = "www." + _constants_1.c.shared.domain;
                return [4 /*yield*/, networkTools.retrieveIpFromHostname(hostname)];
            case 2:
                interfaceLocalIp = (_a.sent()).interfaceLocalIp;
                return [4 /*yield*/, new Promise(function (resolve) {
                        var app = express();
                        app.set("view engine", "ejs");
                        app
                            .use(session({ "secret": semasim_webclient_1.cookieSecret, "resave": false, "saveUninitialized": false }))
                            .use("/" + semasim_webclient_1.webApiClient.webApiPath, webApi.getRouter())
                            .use(forceDomain({ hostname: hostname }))
                            .use("/", semasim_webclient_1.webRouter);
                        https.createServer(_constants_1.c.tlsOptions)
                            .on("request", app)
                            .listen(443, interfaceLocalIp)
                            .once("listening", function () { return resolve(); });
                    })];
            case 3:
                _a.sent();
                debug("...webserver started");
                return [4 /*yield*/, new Promise(function (resolve) {
                        var app = express();
                        app.use(forceDomain({
                            hostname: hostname,
                            "port": 443,
                            "protocol": "https"
                        }));
                        http.createServer()
                            .on("request", app)
                            .listen(80, interfaceLocalIp)
                            .once("listening", function () { return resolve(); });
                    })];
            case 4:
                _a.sent();
                debug("...https redirect started");
                return [2 /*return*/];
        }
    });
}); })();
