import * as express from "express";
import * as forceDomain from "forcedomain";
import * as https from "https";
import * as http from "http";
import { handlers as apiHandlers } from "./apiHandlers";
import * as apiServer from "../../tools/webApi";
import * as frontend from "../../frontend";
import * as sessionManager from "./sessionManager";
import * as morgan from "morgan";
import * as logger from "logger";
import { deploy } from "../../deploy";
import * as path from "path";
import * as i from "../../bin/installer";
import * as fs from "fs";

//NOTE: If decide to implement graceful termination need to to call beforeExit of sessionManager.

export function launch(
    httpsServer: https.Server,
    httpServer: http.Server
): void {

    sessionManager.launch();

    const hostname = `www.${deploy.getBaseDomain()}`;

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

    app.use(forceDomain({ hostname }))

    apiServer.init({
        app,
        "apiPath": frontend.webApiDeclaration.apiPath,
        "handlers": apiHandlers,
        "isAuthenticated": async (req, res) => {

            await sessionManager.loadRequestSession(req, res);

            return !!sessionManager.getAuth(req.session!);

        },
        "onError": {
            "badRequest": req => {
                if( !!req.session ){

                    sessionManager.setAuth(req.session!, undefined);

                }
            }
        },
        "logger": apiServer.getDefaultLogger({
            "logOnlyErrors": deploy.getEnv() === "DEV" ? false : true,
            "log": logger.log,
            "stringifyAuthentication": req => {

                let auth = sessionManager.getAuth(req.session!);

                if (!!auth) {
                    return `user: ${auth.email}`;
                } else {
                    return "user not authenticated";
                }

            }
        })
    });

    const sendHtml = (res: express.Response, pageName: string)=> {
        
        res.set("Content-Type", "text/html; charset=utf-8");

        res.send(frontend.getPage(pageName).html);

    };

    const expressLogger = (() => {
        switch (deploy.getEnv()) {
            case "DEV": return morgan("dev", { "stream": { "write": str => logger.log(str) } });
            case "PROD": return (_req, _res, next: express.NextFunction) => next();
        }
    })();

    app
        .get("/installer.sh", (_req, res) => res.send(getInstaller()))
        .get(/^\/semasim_([^\.]+).tar.gz/, (req, res) => res.redirect(getSemasimGatewayDownloadUrl(req.params[0])))
        .get(frontend.getPageNames().map(pageName => `/${pageName}.js`), (req, res) => res.send(frontend.getPage(path.basename(req.path, ".js")).js))
        .use(express.static(frontend.pathToWebAssets))
        .get(/\.[a-zA-Z0-9]{1,8}$/, (_req, res) => res.status(404).end())
        .use((req, res, next) => sessionManager.loadRequestSession(req, res).then(() => next()))
        .use( expressLogger )
        .get(["/login", "/register"], (req, res, next) => !!sessionManager.getAuth(req.session!) ? res.redirect("/") : next())
        .get("/login", (_req, res) => sendHtml(res, "login"))
        .get("/register", (_req, res) => sendHtml(res, "register"))
        .use((req, res, next) => !!sessionManager.getAuth(req.session!) ? next() : res.redirect("/login"))
        .get("/", (_req, res) => res.redirect("/manager"))
        .get("/manager", (_req, res) => sendHtml(res, "manager"))
        .get("/webphone", (_req, res) => sendHtml(res, "webphone"))
        .use((_req, res) => res.status(404).end())
        ;

    httpsServer.on("request", app);

}

/** return installer.sh content */
function getInstaller(): Buffer {

    if (getInstaller.value !== undefined) {
        return getInstaller.value;
    }

    const file_path = path.join(i.module_dir_path, "res", "installer.sh");

    const read = () => getInstaller.value = Buffer.from(
        fs
            .readFileSync(file_path)
            .toString("utf8")
            .replace(/\r\n/g, "\n"),
        "utf8"
    );

    fs.watch(file_path, { "persistent": false }, () => read());

    read();

    return getInstaller();

}

namespace getInstaller {

    export let value: Buffer | undefined = undefined;

}

function getSemasimGatewayDownloadUrl(architecture: string) {

    if (architecture === "armv7l") {

        return `https://github.com/garronej/semasim-gw-dist/releases/download/latest/semasim_${architecture}.tar.gz`;

    } else {

        return "/not-found";

    }

}


