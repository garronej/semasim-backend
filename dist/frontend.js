"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types = require("../../frontend/shared/dist/lib/types");
exports.types = types;
const currencyLib = require("../../frontend/shared/dist/lib/tools/currency");
exports.currencyLib = currencyLib;
const webApiDeclaration = require("../../frontend/shared/dist/web_api_declaration");
exports.webApiDeclaration = webApiDeclaration;
const api_decl_backendToUa = require("../../frontend/shared/dist/sip_api_declarations/backendToUa");
exports.api_decl_backendToUa = api_decl_backendToUa;
const api_decl_uaToBackend = require("../../frontend/shared/dist/sip_api_declarations/uaToBackend");
exports.api_decl_uaToBackend = api_decl_uaToBackend;
const deploy_1 = require("./deploy");
const ejs = require("ejs");
const logger = require("logger");
const watch = require("node-watch");
const debug = logger.debugFactory();
const fs = require("fs");
const path = require("path");
const frontend_dir_path = path.join(__dirname, "..", "..", "frontend");
const pages_dir_path = path.join(frontend_dir_path, "pages");
const templates_dir_path = path.join(frontend_dir_path, "shared", "templates");
exports.static_dir_path = path.join(frontend_dir_path, "static.semasim.com");
/**
 * @param pageName eg: "manager" or "webphone"
 */
function getPage(pageName) {
    if (pageName in getPage.cache) {
        return getPage.cache[pageName];
    }
    const page_dir_path = path.join(pages_dir_path, pageName);
    const ejs_file_path = path.join(page_dir_path, "page.ejs");
    const read = () => {
        const [unaltered, webView] = [false, true]
            .map(isWebView => ({ "assets_root": deploy_1.deploy.getEnv() === "DEV" ? "/" : "//static.semasim.com/", isWebView }))
            .map(data => ejs.render(fs.readFileSync(ejs_file_path).toString("utf8"), data, { "root": templates_dir_path }))
            .map(renderedPage => Buffer.from(renderedPage, "utf8"));
        getPage.cache[pageName] = { unaltered, webView };
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
    getPage.cache = {};
})(getPage = exports.getPage || (exports.getPage = {}));
