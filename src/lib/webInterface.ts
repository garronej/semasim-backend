import * as express from "express";
import * as logger from "morgan";
import * as favicon from "serve-favicon";
import * as path from "path";
import { Session } from "./mainWeb";
import * as fs from "fs";

import * as _debug from "debug";
let debug = _debug("_webInterface");

const __frontend_root = path.join(__dirname, "..", "..", "frontend");

const loginHtml = fs.readFileSync(path.join(__frontend_root, "pages", "login", "login.html"), "utf8");
const registerHtml = fs.readFileSync(path.join(__frontend_root, "pages", "register", "register.html"), "utf8");
const managerHtml = fs.readFileSync(path.join(__frontend_root, "pages", "manager", "manager.html"), "utf8");

export function start(app: express.Express) {

    app
        .use(express.static(path.join(__frontend_root, "static")))
        .get(/\.[a-zA-Z0-9]{1,8}$/, (req, res) => res.status(404).end())
        .get(["/login", "/register"], (req, res, next) => (req.session! as Session).auth ? res.redirect("/") : next())
        .get("/login", (req, res) => res.send(loginHtml))
        .get("/register", (req, res) => res.send(registerHtml))
        .use((req, res, next) => (req.session! as Session).auth ? next() : res.redirect("/login"))
        .get("/", (req, res) => res.redirect("/manager"))
        .get("/manager", (req, res) => res.send(managerHtml))
        .use((req, res, next) => res.status(404).end())
        ;

}

//.use(logger("dev"))
//.use(favicon(path.join(__frontend_root, "img", "ico", "favicon.ico")))

