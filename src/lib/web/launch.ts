import * as express from "express";
import * as https from "https";
import * as http from "http";
import { handlers as apiHandlers } from "./apiHandlers";
import { webApi as apiServer } from "../../load-balancer";
import * as frontend from "../../frontend";
import * as sessionManager from "./sessionManager";
import * as morgan from "morgan";
import * as cookieParser from "cookie-parser";
import * as logger from "logger";
import { deploy } from "../../deploy";
import * as compression from "compression";

//NOTE: If decide to implement graceful termination need to to call beforeExit of sessionManager.

const debug = logger.debugFactory();
const cookieSecret = "xSoLe9d3=";

export function launch(
    httpsServer: https.Server,
    httpServer: http.Server
) {

    {

        const appPlain = express();

        appPlain
            .use((req, res) => req.get("host") === deploy.getBaseDomain() ?
                res.redirect(`https://www.semasim.com${req.originalUrl}`) :
                res.redirect(`https://${req.get("host")}${req.originalUrl}`)
            );

        httpServer.on("request", appPlain);

    }

    sessionManager.launch(cookieSecret);

    const app = express();

    app
        .use((req, res, next) => req.get("host") === deploy.getBaseDomain() ?
            res.redirect(`https://www.semasim.com${req.originalUrl}`) : next()
        )
        .use(cookieParser(cookieSecret))
        ;

    apiServer.init({
        app,
        "apiPath": frontend.webApiDeclaration.apiPath,
        "handlers": apiHandlers,
        "isAuthenticated": async (req, res) => {

            await sessionManager.loadRequestSession(req, res);

            return sessionManager.isAuthenticated(req.session!);

        },
        "onError": {
            "badRequest": ({ session }) => {
                if (session !== undefined) {
                    sessionManager.eraseSessionAuthentication(session);
                }
            }
        },
        "logger": apiServer.getDefaultLogger({
            "logOnlyErrors": deploy.getEnv() === "DEV" ? false : true,
            "log": logger.log,
            "stringifyAuthentication": ({ session }) =>
                session !== undefined && sessionManager.isAuthenticated(session) ?
                    `user: ${session.shared.email}` :
                    "anonymous"
        })
    });

    app
        .use(compression())
        .use(express.static(frontend.static_dir_path))
        .head(["/img/logo@2x@2x.png", "/img/logosm@2x@2x.png"], (_req, res) => res.status(404).end())
        .use((req, res, next) =>
            sessionManager.loadRequestSession(req, res)
                .then(() => next())
        )
        .use((() => {
            switch (deploy.getEnv()) {
                case "DEV": return morgan("dev", { "stream": { "write": str => logger.log(str) } });
                case "PROD": return (_req, _res, next: express.NextFunction) => next();
            }
        })())
        .get("/", (_req, res) => res.redirect(`/${frontend.availablePages.PageName.webphone}`))
        .get("*", (req, res) => {

            const pageName = req.path.match(/^\/(.*)$/)![1].toLowerCase();

            if (!frontend.isPageName(pageName)) {

                debug(`Consider banning IP ${req.connection.remoteAddress} asking for ${req.method} ${req.originalUrl}`);

                res.status(404).end();

                return;

            }

            const session = req.session!;

            if (pageName === "login" || pageName === "register") {
                sessionManager.eraseSessionAuthentication(session);
            }

            const isRequestFromWebview = (() => {

                const { webview } = req.query as frontend.availablePages.urlParams.Common;

                return webview === "true";

            })();

            if (
                frontend.doesRequireAuth(pageName) &&
                !sessionManager.isAuthenticated(session) &&
                !isRequestFromWebview
            ) {
                res.redirect(`/${frontend.availablePages.PageName.login}`);
                return;
            }

            res.set("Content-Type", "text/html; charset=utf-8");

            res.send(
                frontend.getPage(pageName)[
                isRequestFromWebview ?
                    "webView" :
                    "unaltered"
                ]
            );

        })
        ;

    httpsServer.on("request", app);

}
