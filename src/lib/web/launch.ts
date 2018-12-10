import * as express from "express";
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
import * as stripe from "../stripe";
import * as dbSemasim from "../dbSemasim";

//NOTE: If decide to implement graceful termination need to to call beforeExit of sessionManager.

const debug = logger.debugFactory();

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

    sessionManager.launch();

    const app = express();

    app
        .use((req, res, next) => req.get("host") === deploy.getBaseDomain() ?
            res.redirect(`https://www.semasim.com${req.originalUrl}`) : next()
        )
        ;


    //TODO: if apex domain (semasim.com, dev.semasim.com) redirect to www.semasim.com

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
                if (!!req.session) {

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
        .use((req, res, next) =>
            sessionManager
                .loadRequestSession(req, res)
                .then(() => next())
        )
        .use((() => {
            switch (deploy.getEnv()) {
                case "DEV": return morgan("dev", { "stream": { "write": str => logger.log(str) } });
                case "PROD": return (_req, _res, next: express.NextFunction) => next();
            }

        })())
        .get("*", async (req, res, next) => {

            const { email_as_hex, password_as_hex } = req.query;

            if (email_as_hex === undefined) {
                next();
                return;
            }

            let email: string;

            try {

                email = Buffer.from(email_as_hex, "hex")
                    .toString("utf8")
                    .toLowerCase()
                    ;

            } catch{

                res.status(400).end();

                return;

            }

            const session = req.session!;

            const auth = sessionManager.getAuth(session);

            if (!!auth && auth.email !== email) {

                sessionManager.setAuth(session, undefined);

            }

            if (password_as_hex === undefined) {

                next();
                return;

            }

            let password: string;

            try {

                password = Buffer.from(password_as_hex, "hex")
                    .toString("utf8")
                    ;

            } catch{

                res.status(400).end();

                return;

            }

            const resp = await dbSemasim.authenticateUser(email, password);

            if (resp.status === "SUCCESS") {

                sessionManager.setAuth(session, resp.auth);

            } else {

                res.status(400).end();

                return;

            }

            next();

        })
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
        .get("/", (_req, res) => res.redirect("/webphone"))
        .get("/manager", sendHtml("manager"))
        .get("/webphone", sendHtml("webphone"))
        .get("/subscription", sendHtml("subscription"))
        ;

    httpsServer.on("request", app);

}
