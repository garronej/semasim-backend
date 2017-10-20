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
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var logger = require("morgan");
var favicon = require("serve-favicon");
var cookieParser = require("cookie-parser"); //TODO: useless so far
var path = require("path");
var db = require("./db");
var data_1 = require("../../frontend/manager-page/dist/data");
var _debug = require("debug");
var debug = _debug("_webRouter");
var __project_root = path.join(__dirname, "..", "..");
var __theme_static = path.join(__project_root, "res", "theme-static");
var __frontend_root = path.join(__project_root, "frontend");
exports.cookieSecret = "FswZd0eNsAlPppEkvE0v";
exports.webRouter = express.Router();
exports.webRouter
    .use(favicon(path.join(__theme_static, "assets", "img", "ico", "favicon.ico")))
    .use([
    express.static(__theme_static),
    express.static(path.join(__frontend_root, "login-page", "static")),
    express.static(path.join(__frontend_root, "manager-page", "static"))
])
    .get(/^\/assets\//, function (req, res) {
    debug("asset not found!");
    renderNotFound(req, res);
})
    .use(logger("dev"))
    .use(cookieParser(exports.cookieSecret))
    .get(["/login.ejs", "/register.ejs"], function (req, res) {
    if (req.session.user) {
        debug("Already logged in redirect to root");
        res.redirect("/");
    }
    else {
        renderLogin(req, res);
    }
})
    .use(function (req, res, next) {
    if (!req.session.user) {
        debug("Redirect to login page!");
        res.redirect("/login.ejs");
    }
    else {
        next();
    }
})
    .get("/", function (req, res) {
    //TODO chose the page we redirect to depending of user config
    debug("...root, redirect to manager");
    res.redirect("/manager.ejs");
})
    .get("/logout.ejs", function (req, res) {
    debug("...logout user");
    delete req.session.user;
    res.redirect("/login.ejs");
})
    .get("/manager.ejs", renderManager)
    .use(function (req, res) { return renderNotFound; });
function renderNotFound(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            debug("... " + req.url + " not found 404");
            res.status(404).end();
            return [2 /*return*/];
        });
    });
}
function renderLogin(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            debug("...renderLogin!");
            res.render(path.join(__frontend_root, "login-page", "index.ejs"));
            return [2 /*return*/];
        });
    });
}
function renderManager(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var dongles, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    debug("...renderManager!");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, db.getEndpoints(req.session.user)];
                case 2:
                    dongles = _a.sent();
                    res.render(path.join(__frontend_root, "manager-page", "index.ejs"), data_1.buildData(req.session.email, dongles.map(function (dongle) { return ({
                        "dongle_imei": dongle.imei,
                        "sim_iccid": dongle.sim.iccid,
                        "sim_service_provider": dongle.sim.serviceProvider || null,
                        "sim_number": dongle.sim.number || null
                    }); })));
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    //TODO relocate login
                    return [2 /*return*/, res.status(400).end()];
                case 4: return [2 /*return*/];
            }
        });
    });
}
