import * as express from "express";
import * as logger from "morgan";
import * as favicon from "serve-favicon";
import * as path from "path";
import "ejs"; //TODO: test if ok
import { Session } from "./mainWeb";

import { buildData as managerBuildData } from "../../frontend/manager-page/dist/data";

import * as _debug from "debug";
let debug = _debug("_webInterface");

const __project_root = path.join(__dirname, "..", "..");
const __theme_static = path.join(__project_root, "res", "theme-static");
const __frontend_root = path.join(__project_root, "frontend");

export function start(app: express.Express) {

    app.set("view engine", "ejs");

    app
        .use(favicon(path.join(__theme_static, "assets", "img", "ico", "favicon.ico")))
        .use([
            express.static(__theme_static),
            express.static(path.join(__frontend_root, "login-page", "static")),
            express.static(path.join(__frontend_root, "manager-page", "static"))
        ])
        .get(/^\/assets\//, (req, res) => {

            debug("asset not found!");

            renderNotFound(req, res);

        })
        .use(logger("dev"))
        .get(["/login.ejs", "/register.ejs"], (req, res) => {

            let session: Session= req.session!;

            if ( !session.auth ) {

                debug("Already logged in redirect to root");
                res.redirect("/");

            } else {

                renderLogin(req, res);

            }

        })
        .use((req, res, next) => {

            let session: Session= req.session!;

            if (!session.auth) {

                debug("Redirect to login page!");
                res.redirect("/login.ejs");

            } else {

                next();

            }

        })
        .get("/", (req, res) => {

            //TODO chose the page we redirect to depending of user config
            debug("...root, redirect to manager");

            res.redirect("/manager.ejs");

        })
        .get("/logout.ejs", (req, res) => {

            debug("...logout user");

            let session: Session= req.session!;

            session.auth= undefined;

            res.redirect("/login.ejs");

        })
        .get("/manager.ejs", renderManager)
        .use((req, res) => renderNotFound)
        ;


}


async function renderNotFound(req: express.Request, res: express.Response) {

    debug(`... ${req.url} not found 404`);

    res.status(404).end();

}

async function renderLogin(req: express.Request, res: express.Response) {

    debug("...renderLogin!");

    res.render(path.join(__frontend_root, "login-page", "index.ejs"));

}

async function renderManager(req: express.Request, res: express.Response) {

    debug("...renderManager!");

    res.render(
        path.join(__frontend_root, "manager-page", "index.ejs"),
        { "email": (req.session! as Session).auth!.email }
    );

}

