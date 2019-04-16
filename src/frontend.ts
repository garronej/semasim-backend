
import * as types from "../../frontend/shared/dist/lib/types";
import * as currencyLib from "../../frontend/shared/dist/lib/tools/currency";
import * as webApiDeclaration from "../../frontend/shared/dist/web_api_declaration";
import * as api_decl_backendToUa from "../../frontend/shared/dist/sip_api_declarations/backendToUa";
import * as api_decl_uaToBackend from "../../frontend/shared/dist/sip_api_declarations/uaToBackend";
import { deploy } from "./deploy";
import * as ejs from "ejs";
import * as logger from "logger";
import * as watch from "node-watch";

const debug = logger.debugFactory();

export {
    webApiDeclaration,
    types,
    currencyLib,
    api_decl_backendToUa,
    api_decl_uaToBackend
};

import * as fs from "fs";
import * as path from "path";

const frontend_dir_path = path.join(__dirname, "..", "..", "frontend");
const pages_dir_path = path.join(frontend_dir_path, "pages");
const templates_dir_path = path.join(frontend_dir_path, "shared", "templates")
export const static_dir_path = path.join(frontend_dir_path, "static.semasim.com");

/**
 * @param pageName eg: "manager" or "webphone"
 */
export function getPage(pageName: string): typeof getPage.cache["string"] {

    if (pageName in getPage.cache) {
        return getPage.cache[pageName];
    }

    const page_dir_path = path.join(pages_dir_path, pageName);

    const ejs_file_path = path.join(page_dir_path, "page.ejs");


    const read = () => {

        const [unaltered, webView] = [false, true]
            .map(isWebView => ({ "assets_root": deploy.getEnv() === "DEV" ? "/" : "//static.semasim.com/", isWebView }))
            .map(data => ejs.render(fs.readFileSync(ejs_file_path).toString("utf8"), data, { "root": templates_dir_path }))
            .map(renderedPage => Buffer.from(renderedPage, "utf8"))

        getPage.cache[pageName] = { unaltered, webView };

    };

    watch(ejs_file_path, { "persistent": false }, () => {

        debug(`${pageName} page updated`);

        read();

    });

    watch(
        templates_dir_path,
        {
            "recursive": true,
            "persistent": false
        },
        () => {

            debug(`${pageName} page updated (templates dir)`);

            read();
        }
    );

    read();

    return getPage(pageName);

};

export namespace getPage {

    export const cache: { [pageName: string]: { unaltered: Buffer; webView: Buffer; } } = {};

}
