"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types = require("../../frontend/shared/dist/lib/types");
exports.types = types;
const currencyByCountry_1 = require("../../frontend/shared/dist/lib/currencyByCountry");
exports.currencyByCountry = currencyByCountry_1.currencyByCountry;
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
exports.assets_dir_path = path.join(frontend_dir_path, "docs");
/**
 *
 * @param pageName eg: "manager" or "webphone"
 *
 * Assert pageName in pageList
 *
 */
function getPage(pageName) {
    if (pageName in getPage.cache) {
        return getPage.cache[pageName];
    }
    const page_dir_path = path.join(pages_dir_path, pageName);
    const ejs_file_path = path.join(page_dir_path, `page.ejs`);
    const read = () => getPage.cache[pageName] = Buffer.from(ejs.render(fs.readFileSync(ejs_file_path).toString("utf8"), {
        "assets_root": deploy_1.deploy.getEnv() === "DEV" ?
            "/" :
            "//static.semasim.com/"
    }), "utf8");
    watch(ejs_file_path, { "persistent": false }, () => {
        debug(`${pageName} page updated`);
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
