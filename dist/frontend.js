"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types = require("../../frontend/shared/dist/lib/types");
exports.types = types;
const webApiDeclaration = require("../../frontend/shared/dist/web_api_declaration");
exports.webApiDeclaration = webApiDeclaration;
const api_decl_backendToUa = require("../../frontend/shared/dist/sip_api_declarations/backendToUa");
exports.api_decl_backendToUa = api_decl_backendToUa;
const api_decl_uaToBackend = require("../../frontend/shared/dist/sip_api_declarations/uaToBackend");
exports.api_decl_uaToBackend = api_decl_uaToBackend;
const fs = require("fs");
const path = require("path");
const scriptingTools = require("scripting-tools");
const frontend_dir_path = path.join(__dirname, "..", "..", "frontend");
const pages_dir_path = path.join(frontend_dir_path, "pages");
/**
 * return [ "login", "register", "manager", "webphone", ... ]
 * */
function getPageNames() {
    if (getPageNames.value !== undefined) {
        return getPageNames.value;
    }
    const read = () => getPageNames.value = scriptingTools
        .fs_ls(pages_dir_path, "FILENAME", false)
        .filter(pageName => pageName.indexOf(".") < 0);
    fs.watch(pages_dir_path, { "persistent": false }, () => read());
    read();
    return getPageNames();
}
exports.getPageNames = getPageNames;
(function (getPageNames) {
    getPageNames.value = undefined;
})(getPageNames = exports.getPageNames || (exports.getPageNames = {}));
/**
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
    const html_file_path = path.join(page_dir_path, `${pageName}.html`);
    const js_file_path = path.join(page_dir_path, "dist", `${pageName}.js`);
    const read = () => getPage.cache[pageName] = {
        "html": fs.readFileSync(html_file_path),
        "js": fs.readFileSync(js_file_path)
    };
    for (const file_path in [html_file_path, js_file_path]) {
        fs.watch(file_path, { "persistent": false }, () => read());
    }
    read();
    return getPage(pageName);
}
exports.getPage = getPage;
;
(function (getPage) {
    getPage.cache = {};
})(getPage = exports.getPage || (exports.getPage = {}));
exports.pathToWebAssets = path.join(frontend_dir_path, "web-assets");
