"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const apiHandlers_1 = require("./apiHandlers");
const apiServer = require("../../tools/webApi");
const frontend = require("../../frontend");
const sessionManager = require("./sessionManager");
const morgan = require("morgan");
const logger = require("logger");
const deploy_1 = require("../../deploy");
const compression = require("compression");
const stripe = require("../stripe");
//NOTE: If decide to implement graceful termination need to to call beforeExit of sessionManager.
const debug = logger.debugFactory();
function launch(httpsServer, httpServer) {
    {
        const appPlain = express();
        appPlain
            .use((req, res) => req.get("host") === deploy_1.deploy.getBaseDomain() ?
            res.redirect(`https://www.semasim.com${req.originalUrl}`) :
            res.redirect(`https://${req.get("host")}${req.originalUrl}`));
        httpServer.on("request", appPlain);
    }
    sessionManager.launch();
    const app = express();
    app
        .use((req, res, next) => req.get("host") === deploy_1.deploy.getBaseDomain() ?
        res.redirect(`https://www.semasim.com${req.originalUrl}`) : next());
    //TODO: if apex domain (semasim.com, dev.semasim.com) redirect to www.semasim.com
    apiServer.init({
        app,
        "apiPath": frontend.webApiDeclaration.apiPath,
        "handlers": apiHandlers_1.handlers,
        "isAuthenticated": (req, res) => __awaiter(this, void 0, void 0, function* () {
            yield sessionManager.loadRequestSession(req, res);
            return !!sessionManager.getAuth(req.session);
        }),
        "onError": {
            "badRequest": req => {
                if (!!req.session) {
                    sessionManager.setAuth(req.session, undefined);
                }
            }
        },
        "logger": apiServer.getDefaultLogger({
            "logOnlyErrors": deploy_1.deploy.getEnv() === "DEV" ? false : true,
            "log": logger.log,
            "stringifyAuthentication": req => {
                let auth = sessionManager.getAuth(req.session);
                if (!!auth) {
                    return `user: ${auth.email}`;
                }
                else {
                    return "user not authenticated";
                }
            }
        })
    });
    const sendHtml = (pageName) => (_req, res) => {
        res.set("Content-Type", "text/html; charset=utf-8");
        res.send(frontend.getPage(pageName));
    };
    const expressLogger = (() => {
        switch (deploy_1.deploy.getEnv()) {
            case "DEV": return morgan("dev", { "stream": { "write": str => logger.log(str) } });
            case "PROD": return (_req, _res, next) => next();
        }
    })();
    stripe.registerWebHooks(app);
    app
        .use(compression())
        .use(express.static(frontend.assets_dir_path))
        .head(["/img/logo@2x@2x.png", "/img/logosm@2x@2x.png"], (_req, res) => res.status(404).end())
        .use((req, res, next) => {
        if ([
            "",
            "login",
            "register",
            "manager",
            "webphone",
            "subscription"
        ].map(v => `/${v}`).indexOf(req.path) === -1) {
            debug(`Consider banning IP ${req.connection.remoteAddress} asking for ${req.method} ${req.originalUrl}`);
            res.status(404).end();
            return;
        }
        next();
    })
        .use((req, res, next) => sessionManager
        .loadRequestSession(req, res)
        .then(() => next()))
        .use(expressLogger)
        .get(["/login", "/register"], (req, res, next) => !!sessionManager.getAuth(req.session) ?
        res.redirect("/") :
        next())
        .get("/login", sendHtml("login"))
        .get("/register", sendHtml("register"))
        .use((req, res, next) => !!sessionManager.getAuth(req.session) ?
        next() :
        res.redirect("/login"))
        .get("/", (_req, res) => res.redirect("/manager"))
        .get("/manager", sendHtml("manager"))
        .get("/webphone", sendHtml("webphone"))
        .get("/subscription", sendHtml("subscription"));
    httpsServer.on("request", app);
}
exports.launch = launch;
