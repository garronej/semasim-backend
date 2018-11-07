
import * as types from "../../frontend/shared/dist/lib/types";
import * as webApiDeclaration from "../../frontend/shared/dist/web_api_declaration";
import * as api_decl_backendToUa from "../../frontend/shared/dist/sip_api_declarations/backendToUa";
import * as api_decl_uaToBackend from "../../frontend/shared/dist/sip_api_declarations/uaToBackend";

export {
    webApiDeclaration,
    types,
    api_decl_backendToUa,
    api_decl_uaToBackend
};

import * as fs from "fs";
import * as path from "path";
import * as scriptingTools from "scripting-tools";

const frontend_dir_path = path.join(__dirname, "..", "..", "frontend");
const pages_dir_path = path.join(frontend_dir_path, "pages");

/** 
 * return [ "login", "register", "manager", "webphone", ... ] 
 * */
export function getPageNames(): string[] {

    if (getPageNames.value !== undefined) {
        return getPageNames.value;
    }

    const read = () => getPageNames.value = scriptingTools
        .fs_ls(pages_dir_path, "FILENAME", false)
        .filter(pageName => pageName.indexOf(".") < 0)
        ;

    fs.watch(pages_dir_path, { "persistent": false }, () => read());

    read();

    return getPageNames();

}

export namespace getPageNames {

    export let value: string[] | undefined = undefined;

}

/**
 * 
 * @param pageName eg: "manager" or "webphone"
 * 
 * Assert pageName in pageList
 * 
 */
export function getPage(pageName: string): getPage.Page {

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

    for (const file_path of [html_file_path, js_file_path]) {

        fs.watch(file_path, { "persistent": false }, () => read());

    }

    read();

    return getPage(pageName);

};

export namespace getPage {

    export type Page = { "html": Buffer; "js": Buffer; };

    export const cache: { [pageName: string]: Page; } = {};

}

export const pathToWebAssets = path.join(frontend_dir_path, "web-assets");
