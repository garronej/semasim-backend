"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var path = require("path");
var fs = require("fs");
var _debug = require("debug");
var debug = _debug("_webInterface");
var __frontend_root = path.join(__dirname, "..", "..", "frontend");
var loginHtml = fs.readFileSync(path.join(__frontend_root, "pages", "login", "login.html"), "utf8");
var registerHtml = fs.readFileSync(path.join(__frontend_root, "pages", "register", "register.html"), "utf8");
var managerHtml = fs.readFileSync(path.join(__frontend_root, "pages", "manager", "manager.html"), "utf8");
function start(app) {
    app
        .use(express.static(path.join(__frontend_root, "static")))
        .get(/\.[a-zA-Z0-9]{1,8}$/, function (req, res) { return res.status(404).end(); })
        .get(["/login", "/register"], function (req, res, next) { return req.session.auth ? res.redirect("/") : next(); })
        .get("/login", function (req, res) { return res.send(loginHtml); })
        .get("/register", function (req, res) { return res.send(registerHtml); })
        .use(function (req, res, next) { return req.session.auth ? next() : res.redirect("/login"); })
        .get("/", function (req, res) { return res.redirect("/manager"); })
        .get("/manager", function (req, res) { return res.send(managerHtml); })
        .use(function (req, res, next) { return res.status(404).end(); });
}
exports.start = start;
//.use(logger("dev"))
//.use(favicon(path.join(__frontend_root, "img", "ico", "favicon.ico")))
