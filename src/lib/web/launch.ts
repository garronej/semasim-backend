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
import * as compression from "compression";

//NOTE: If decide to implement graceful termination need to to call beforeExit of sessionManager.

export function launch(
    httpsServer: https.Server,
    httpServer: http.Server
): void {

    sessionManager.launch();

    const hostname = `web.${deploy.getBaseDomain()}`;

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


    const sendHtml = (pageName: string) =>
        (_req, res: express.Response) => {

            res.set("Content-Type", "text/html; charset=utf-8");

            res.send(frontend.getPage(pageName));

        };


    const expressLogger = (() => {
        switch (deploy.getEnv()) {
            case "DEV": return morgan("dev", { "stream": { "write": str => logger.log(str) } });
            case "PROD": return (_req, _res, next: express.NextFunction) => next();
        }
    })();

    app
        .use(compression())
        .use(express.static(frontend.assets_dir_path))
        .get(
            /\.[a-zA-Z0-9]{1,8}$/,
            (_req, res) => res.status(404).end()
        )
        .use((req, res, next) => sessionManager
            .loadRequestSession(req, res)
            .then(() => next())
        )
        .use(expressLogger)
        .get(
            ["/login", "/register"],
            (req, res, next) =>
                !!sessionManager.getAuth(req.session!) ?
                    res.redirect("/") :
                    next()
        )
        .get("/login", sendHtml("login"))
        .get("/register", sendHtml("register"))
        .use((req, res, next) =>
            !!sessionManager.getAuth(req.session!) ?
                next() :
                res.redirect("/login")
        )
        .get("/", (_req, res) => res.redirect("/manager"))
        .get("/manager", sendHtml("manager"))
        .get("/webphone", sendHtml("webphone"))
        .use((_req, res) => res.status(404).end())
        ;

    httpsServer.on("request", app);

}


