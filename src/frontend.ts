
import * as types from "../../frontend/shared/dist/lib/types";
import * as webApiDeclaration from "../../frontend/shared/dist/web_api_declaration";
import * as api_decl_backendToUa from "../../frontend/shared/dist/sip_api_declarations/backendToUa";
import * as api_decl_uaToBackend from "../../frontend/shared/dist/sip_api_declarations/uaToBackend";
import { deploy } from "./deploy";
import * as ejs from "ejs";
import * as logger from "logger";
import * as watch from "node-watch";

 

const debug= logger.debugFactory();

export {
    webApiDeclaration,
    types,
    api_decl_backendToUa,
    api_decl_uaToBackend
};

import * as fs from "fs";
import * as path from "path";

const frontend_dir_path = path.join(__dirname, "..", "..", "frontend");
const pages_dir_path = path.join(frontend_dir_path, "pages");
export const assets_dir_path = path.join(frontend_dir_path, "docs");

debug("up!");

/**
 * 
 * @param pageName eg: "manager" or "webphone"
 * 
 * Assert pageName in pageList
 * 
 */
export function getPage(pageName: string): Buffer {

    if (pageName in getPage.cache) {
        return getPage.cache[pageName];
    }

    const page_dir_path = path.join(pages_dir_path, pageName);

    const ejs_file_path = path.join(page_dir_path, `page.ejs`);

    const read = () => getPage.cache[pageName] = Buffer.from(
        ejs.render(
            fs.readFileSync(ejs_file_path).toString("utf8"),
            {
                "assets_root": deploy.getEnv() === "DEV" ?
                    "/" :
                    "//static.semasim.com/"
            }
        ),
        "utf8"
    );

    watch(ejs_file_path, { "persistent": false }, () => {

        debug(`${pageName} page updated`);

        read();

    });

    //fs.watch(ejs_file_path, { "persistent": false }, () => read());

    read();

    return getPage(pageName);

};

export namespace getPage {

    export const cache: { [pageName: string]: Buffer; } = {};

}
