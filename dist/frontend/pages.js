"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const availablePages = require("../../../frontend/shared/dist/lib/availablePages");
exports.availablePages = availablePages;
const deploy_1 = require("../deploy");
const ejs = require("ejs");
const logger = require("logger");
const watch = require("node-watch");
const debug = logger.debugFactory();
const fs = require("fs");
const path = require("path");
const frontend_dir_path = path.join(__dirname, "..", "..", "..", "frontend");
const pages_dir_path = path.join(frontend_dir_path, "pages");
const templates_dir_path = path.join(frontend_dir_path, "shared", "templates");
exports.static_dir_path = path.join(frontend_dir_path, "static.semasim.com");
function doesRequireAuth(pageName) {
    const _ = availablePages.PageName;
    switch (pageName) {
        case _.login: return false;
        case _.register: return false;
        case _.manager: return true;
        case _.webphone: return true;
        case _.subscription: return true;
        case _.shop: return false;
    }
}
exports.doesRequireAuth = doesRequireAuth;
exports.isPageName = (() => {
    const set = new Set(availablePages.PageName.pagesNames);
    return (pageName) => set.has(pageName);
})();
function getAssetsRoot(env) {
    return env === "DEV" ? "/" : "//static.semasim.com/";
}
exports.getAssetsRoot = getAssetsRoot;
function getPage(pageName) {
    {
        const page = getPage.cache.get(pageName);
        if (page !== undefined) {
            return page;
        }
    }
    const page_dir_path = path.join(pages_dir_path, pageName);
    const ejs_file_path = path.join(page_dir_path, "page.ejs");
    const read = () => {
        const ejsData = {
            "assets_root": getAssetsRoot(deploy_1.deploy.getEnv()),
            "isDevEnv": deploy_1.deploy.getEnv() === "DEV"
        };
        const unrenderedPage = fs.readFileSync(ejs_file_path).toString("utf8");
        const [unaltered, webView] = [false, true]
            .map(isWebView => (Object.assign(Object.assign({}, ejsData), { isWebView })))
            .map(ejsData => ejs.render(unrenderedPage, ejsData, { "root": templates_dir_path }))
            .map(renderedPage => Buffer.from(renderedPage, "utf8"));
        getPage.cache.set(pageName, { unaltered, webView });
    };
    watch(ejs_file_path, { "persistent": false }, () => {
        debug(`${pageName} page updated`);
        read();
    });
    watch(templates_dir_path, {
        "recursive": true,
        "persistent": false
    }, () => {
        debug(`${pageName} page updated (templates dir)`);
        read();
    });
    read();
    return getPage(pageName);
}
exports.getPage = getPage;
;
(function (getPage) {
    getPage.cache = new Map();
})(getPage = exports.getPage || (exports.getPage = {}));
