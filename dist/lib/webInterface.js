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
var favicon = require("serve-favicon");
var path = require("path");
require("ejs"); //TODO: test if ok
var _debug = require("debug");
var debug = _debug("_webInterface");
var __project_root = path.join(__dirname, "..", "..");
var __theme_static = path.join(__project_root, "res", "theme-static");
var __frontend_root = path.join(__project_root, "frontend");
function start(app) {
    app.set("view engine", "ejs");
    app
        .use(favicon(path.join(__theme_static, "assets", "img", "ico", "favicon.ico")))
        .use([
        express.static(__theme_static),
        express.static(path.join(__frontend_root, "login-page", "static")),
        express.static(path.join(__frontend_root, "manager-page", "static"))
    ])
        .get(/^\/assets\//, renderNotFound)
        .get(["/login.ejs", "/register.ejs"], function (req, res) {
        var session = req.session;
        if (session.auth) {
            //debug("Already logged in redirect to root");
            res.redirect("/");
        }
        else {
            renderLogin(req, res);
        }
    })
        .use(function (req, res, next) {
        var session = req.session;
        if (!session.auth) {
            //debug("Redirect to login page!");
            res.redirect("/login.ejs");
        }
        else {
            next();
        }
    })
        .get("/", function (req, res) {
        //TODO chose the page we redirect to depending of user config
        //debug("...root, redirect to manager");
        res.redirect("/manager.ejs");
    })
        .get("/logout.ejs", function (req, res) {
        //debug("...logout user");
        var session = req.session;
        session.auth = undefined;
        res.redirect("/login.ejs");
    })
        .get("/manager.ejs", renderManager)
        .use(renderNotFound);
}
exports.start = start;
function renderNotFound(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            //debug(`... ${req.url} not found 404`);
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
        return __generator(this, function (_a) {
            debug("...renderManager!");
            res.render(path.join(__frontend_root, "manager-page", "index.ejs"), {
                "title": "My SIMs",
                "email": req.session.auth.email
            });
            return [2 /*return*/];
        });
    });
}
