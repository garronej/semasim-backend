import * as express from "express";
//import * as logger from "morgan";
import { Session } from "./web";
import * as frontend from "../semasim-frontend";

export function start(app: express.Express) {

    app
        .use(express.static(frontend.pathToStatic))
        .get(/\.[a-zA-Z0-9]{1,8}$/, (req, res) => res.status(404).end())
        .get(["/login", "/register"], (req, res, next) => (req.session! as Session).auth ? res.redirect("/") : next())
        .get("/login", (req, res) => res.send(frontend.pagesHtml.login))
        .get("/register", (req, res) => res.send(frontend.pagesHtml.register))
        .use((req, res, next) => (req.session! as Session).auth ? next() : res.redirect("/login"))
        .get("/", (req, res) => res.redirect("/manager"))
        .get("/manager", (req, res) => res.send(frontend.pagesHtml.manager))
        .get("/webphone", (req, res) => res.send(frontend.pagesHtml.webphone))
        .use((req, res, next) => res.status(404).end())
        ;

}

//.use(logger("dev"))

