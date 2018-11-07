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
const forceDomain = require("forcedomain");
const apiHandlers_1 = require("./apiHandlers");
const apiServer = require("../../tools/webApi");
const frontend = require("../../frontend");
const sessionManager = require("./sessionManager");
const morgan = require("morgan");
const logger = require("logger");
const deploy_1 = require("../../deploy");
const path = require("path");
const i = require("../../bin/installer");
const fs = require("fs");
//NOTE: If decide to implement graceful termination need to to call beforeExit of sessionManager.
function launch(httpsServer, httpServer) {
    sessionManager.launch();
    const hostname = `www.${deploy_1.deploy.getBaseDomain()}`;
    (() => {
        const app = express();
        app.use(forceDomain({
            hostname,
            "port": 443,
            "protocol": "https"
        }));
        httpServer.on("request", app);
    })();
    const app = express();
    app.use(forceDomain({ hostname }));
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
            "logOnlyErrors": false,
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
    const sendHtml = (res, pageName) => {
        res.set("Content-Type", "text/html; charset=utf-8");
        res.send(frontend.getPage(pageName).html);
    };
    app
        .get("/installer.sh", (_req, res) => res.send(getInstaller()))
        .get(/^\/semasim_([^\.]+).tar.gz/, (req, res) => res.redirect(getSemasimGatewayDownloadUrl(req.params[0])))
        .get(frontend.getPageNames().map(pageName => `/${pageName}.js`), (req, res) => res.send(frontend.getPage(path.basename(req.path, ".js")).js))
        .use(express.static(frontend.pathToWebAssets))
        .get(/\.[a-zA-Z0-9]{1,8}$/, (_req, res) => res.status(404).end())
        .use((req, res, next) => sessionManager.loadRequestSession(req, res).then(() => next()))
        .use(morgan("dev", { "stream": { "write": str => logger.log(str) } }))
        .get(["/login", "/register"], (req, res, next) => !!sessionManager.getAuth(req.session) ? res.redirect("/") : next())
        .get("/login", (_req, res) => sendHtml(res, "login"))
        .get("/register", (_req, res) => sendHtml(res, "register"))
        .use((req, res, next) => !!sessionManager.getAuth(req.session) ? next() : res.redirect("/login"))
        .get("/", (_req, res) => res.redirect("/manager"))
        .get("/manager", (_req, res) => sendHtml(res, "manager"))
        .get("/webphone", (_req, res) => sendHtml(res, "webphone"))
        .use((_req, res) => res.status(404).end());
    httpsServer.on("request", app);
}
exports.launch = launch;
/** return installer.sh content */
function getInstaller() {
    if (getInstaller.value !== undefined) {
        return getInstaller.value;
    }
    const file_path = path.join(i.module_dir_path, "res", "installer.sh");
    const read = () => getInstaller.value = Buffer.from(fs
        .readFileSync(file_path)
        .toString("utf8")
        .replace(/\r\n/g, "\n"), "utf8");
    fs.watch(file_path, { "persistent": false }, () => read());
    read();
    return getInstaller();
}
(function (getInstaller) {
    getInstaller.value = undefined;
})(getInstaller || (getInstaller = {}));
function getSemasimGatewayDownloadUrl(architecture) {
    if (architecture === "armv7l") {
        return `https://github.com/garronej/semasim-gw-dist/releases/download/latest/semasim_${architecture}.tar.gz`;
    }
    else {
        return "/not-found";
    }
}
