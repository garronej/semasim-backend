import * as express from "express";
import * as logger from "morgan";
import * as favicon from "serve-favicon";
import * as cookieParser from "cookie-parser"; //TODO: useless so far
import * as fs from "fs";
import * as path from "path";
import * as db from "./db";

import { buildData as managerBuildData } from "../../frontend/manager-page/dist/data";

import * as _debug from "debug";
let debug = _debug("_webRouter");

const __project_root= path.join(__dirname, "..", "..");
const __theme_static = path.join(__project_root, "res", "theme-static");
const __frontend_root= path.join(__project_root, "frontend");

export const cookieSecret= "FswZd0eNsAlPppEkvE0v";

export const webRouter: express.Router = express.Router()

webRouter
    .use(favicon(path.join(__theme_static, "assets", "img", "ico", "favicon.ico")))
    .use([
        express.static(__theme_static),
        express.static(path.join(__frontend_root, "login-page", "static")),
        express.static(path.join(__frontend_root, "manager-page", "static"))
    ])
    .get(/^\/assets\//, (req, res)=>{

        debug("asset not found!");

        renderNotFound(req, res);

    })
    .use(logger("dev"))
    .use(cookieParser(cookieSecret))
    .get(["/login.ejs", "/register.ejs"], (req, res)=> {

        if (req.session!.user) {

            debug("Already logged in redirect to root");
            res.redirect("/");
            
        }else{

            renderLogin(req, res);

        }

    })
    .use((req, res, next) => {

        if (!req.session!.user) {

            debug("Redirect to login page!");
            res.redirect("/login.ejs");

        }else {

            next();

        }

    })
    .get("/", (req, res) => {

        //TODO chose the page we redirect to depending of user config
        debug("...root, redirect to manager");

        res.redirect("/manager.ejs");

    })
    .get("/logout.ejs", (req, res)=> {

        debug("...logout user");

        delete req.session!.user;

        res.redirect("/login.ejs");

    })
    .get("/manager.ejs", renderManager)
    .use((req, res) => renderNotFound);

async function renderNotFound(req: express.Request, res: express.Response){

        debug(`... ${req.url} not found 404`);

        res.status(404).end();

}

async function renderLogin(req: express.Request, res: express.Response) {

    debug("...renderLogin!");

    res.render(path.join(__frontend_root, "login-page", "index.ejs"));

}

async function renderManager(req: express.Request, res: express.Response) {

    debug("...renderManager!");

    try {

        let dongles= await db.getEndpoints(req.session!.user);

        res.render(
            path.join(__frontend_root, "manager-page", "index.ejs"),
            managerBuildData( 
                req.session!.email, 
                dongles.map(dongle=> ({
                    "dongle_imei": dongle.imei,
                    "sim_iccid": dongle.sim.iccid,
                    "sim_service_provider": dongle.sim.serviceProvider || null,
                    "sim_number": dongle.sim.number || null
                }))
            )
        );

    } catch (error) {

        //TODO relocate login

        return res.status(400).end();

    }

}

