"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const apiHandlers_1 = require("./apiHandlers");
const load_balancer_1 = require("../../load-balancer");
const pages = require("../../frontend/pages");
const webApiDeclaration = require("../../web_api_declaration");
const sessionManager = require("./sessionManager");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const logger = require("logger");
const deploy_1 = require("../../deploy");
const compression = require("compression");
//NOTE: If decide to implement graceful termination need to to call beforeExit of sessionManager.
const debug = logger.debugFactory();
const cookieSecret = "xSoLe9d3=";
function launch(httpsServer, httpServer) {
    {
        const appPlain = express();
        appPlain
            .use((req, res) => req.get("host") === deploy_1.deploy.getBaseDomain() ?
            res.redirect(`https://www.semasim.com${req.originalUrl}`) :
            res.redirect(`https://${req.get("host")}${req.originalUrl}`));
        httpServer.on("request", appPlain);
    }
    sessionManager.launch(cookieSecret);
    const app = express();
    app
        .use((req, res, next) => req.get("host") === deploy_1.deploy.getBaseDomain() ?
        res.redirect(`https://www.semasim.com${req.originalUrl}`) : next())
        .use(cookieParser(cookieSecret));
    load_balancer_1.webApi.init({
        app,
        "apiPath": webApiDeclaration.apiPath,
        "handlers": apiHandlers_1.handlers,
        "isAuthenticated": async (req, res) => {
            /*
            console.log("============> Remove all cookies");
            req.headers.cookie= "a_cookie_lol=aokay; b_cookie_lol=bokay";
            req.cookies = {};
            req.signedCookies = {};
            */
            await sessionManager.loadRequestSession(req, res);
            return sessionManager.isAuthenticated(req.session);
        },
        "onError": {
            "badRequest": ({ session }) => {
                if (session !== undefined) {
                    sessionManager.eraseSessionAuthentication(session);
                }
            }
        },
        "logger": load_balancer_1.webApi.getDefaultLogger({
            "logOnlyErrors": deploy_1.deploy.getEnv() === "DEV" ? false : true,
            "log": logger.log,
            "stringifyAuthentication": ({ session }) => session !== undefined && sessionManager.isAuthenticated(session) ?
                `user: ${session.shared.email}` :
                "anonymous"
        })
    });
    app
        .use(compression())
        .use(express.static(pages.static_dir_path))
        .head(["/img/logo@2x@2x.png", "/img/logosm@2x@2x.png"], (_req, res) => res.status(404).end())
        .use((req, res, next) => sessionManager.loadRequestSession(req, res)
        .then(() => next()))
        .use((() => {
        switch (deploy_1.deploy.getEnv()) {
            case "DEV": return morgan("dev", { "stream": { "write": str => logger.log(str) } });
            case "PROD": return (_req, _res, next) => next();
        }
    })())
        .get("/", (_req, res) => res.redirect(`/${pages.availablePages.PageName.webphone}`))
        .get("*", (req, res) => {
        const pageName = req.path.match(/^\/(.*)$/)[1].toLowerCase();
        if (!pages.isPageName(pageName)) {
            debug(`Consider banning IP ${req.connection.remoteAddress} asking for ${req.method} ${req.originalUrl}`);
            res.status(404).end();
            return;
        }
        const session = req.session;
        if (pageName === "login" || pageName === "register") {
            sessionManager.eraseSessionAuthentication(session);
        }
        const isRequestFromWebview = (() => {
            const { webview } = req.query;
            return webview === "true";
        })();
        if (pages.doesRequireAuth(pageName) &&
            !sessionManager.isAuthenticated(session) &&
            !isRequestFromWebview) {
            res.redirect(`/${pages.availablePages.PageName.login}`);
            return;
        }
        res.set("Content-Type", "text/html; charset=utf-8");
        res.send(pages.getPage(pageName)[isRequestFromWebview ?
            "webView" :
            "unaltered"]);
    });
    httpsServer.on("request", app);
}
exports.launch = launch;
