"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types = require("../../frontend/shared/dist/lib/types/userSim");
exports.types = types;
const backend_1 = require("../../frontend/shared/dist/lib/cookies/logic/backend");
exports.AuthenticatedSessionDescriptorSharedData = backend_1.AuthenticatedSessionDescriptorSharedData;
exports.WebsocketConnectionParams = backend_1.WebsocketConnectionParams;
const subscriptionTypes = require("../../frontend/shared/dist/lib/types/subscription");
exports.subscriptionTypes = subscriptionTypes;
const shopTypes = require("../../frontend/shared/dist/lib/types/shop");
exports.shopTypes = shopTypes;
const wd = require("../../frontend/shared/dist/lib/types/webphoneData/types");
exports.wd = wd;
const currencyLib = require("../../frontend/shared/dist/tools/currency");
exports.currencyLib = currencyLib;
const shopProducts_1 = require("../../frontend/shared/dist/lib/shopProducts");
const shipping = require("../../frontend/shared/dist/lib/shipping");
exports.shipping = shipping;
const api_decl_backendToUa = require("../../frontend/shared/dist/sip_api_declarations/backendToUa");
exports.api_decl_backendToUa = api_decl_backendToUa;
const api_decl_uaToBackend = require("../../frontend/shared/dist/sip_api_declarations/uaToBackend");
exports.api_decl_uaToBackend = api_decl_uaToBackend;
const availablePages = require("../../frontend/shared/dist/lib/availablePages");
exports.availablePages = availablePages;
const deploy_1 = require("./deploy");
const ejs = require("ejs");
const logger = require("logger");
const watch = require("node-watch");
const urlGetParameters = require("../../frontend/shared/dist/tools/urlGetParameters");
exports.urlGetParameters = urlGetParameters;
const debug = logger.debugFactory();
const fs = require("fs");
const path = require("path");
const frontend_dir_path = path.join(__dirname, "..", "..", "frontend");
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
        case _.webviewphone: return true;
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
function getShopProducts() {
    let assets_root = getAssetsRoot(deploy_1.deploy.getEnv());
    if (assets_root === "/") {
        assets_root = `//web.${deploy_1.deploy.getBaseDomain()}/`;
    }
    assets_root = `https:${assets_root}`;
    return shopProducts_1.getProducts(assets_root);
}
exports.getShopProducts = getShopProducts;
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
