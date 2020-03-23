

type MapValue<T> = T extends Map<any, infer R> ? R : never;


import * as availablePages from "../../../frontend/shared/dist/lib/availablePages";
import { deploy } from "../deploy";
import * as ejs from "ejs";
import * as logger from "logger";
import * as watch from "node-watch";

const debug = logger.debugFactory();


import * as fs from "fs";
import * as path from "path";

const frontend_dir_path = path.join(__dirname, "..", "..", "..", "frontend");
const pages_dir_path = path.join(frontend_dir_path, "pages");
const templates_dir_path = path.join(frontend_dir_path, "shared", "templates");
export const static_dir_path = path.join(frontend_dir_path, "static.semasim.com");

export { availablePages };

export function doesRequireAuth(pageName: availablePages.PageName): boolean {

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

export const isPageName = (() => {

    const set = new Set<string>(availablePages.PageName.pagesNames);

    return (pageName: string): pageName is availablePages.PageName =>
        set.has(pageName)
        ;

})();

export function getAssetsRoot(env: "DEV" | "PROD") {
    return env === "DEV" ? "/" : "//static.semasim.com/";
}


export function getPage(pageName: availablePages.PageName): MapValue<typeof getPage.cache> {

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
            "assets_root": getAssetsRoot(deploy.getEnv()),
            "isDevEnv": deploy.getEnv() === "DEV"
        };

        const unrenderedPage = fs.readFileSync(ejs_file_path).toString("utf8");

        const [unaltered, webView] = [false, true]
            .map(isWebView => ({ ...ejsData, isWebView }))
            .map(ejsData => ejs.render(unrenderedPage, ejsData, { "root": templates_dir_path }))
            .map(renderedPage => Buffer.from(renderedPage, "utf8"))
            ;

        getPage.cache.set(pageName, { unaltered, webView });

    };

    watch(
        ejs_file_path,
        { "persistent": false },
        () => {

            debug(`${pageName} page updated`);

            read();

        }
    );

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

    export const cache = new Map<availablePages.PageName, { unaltered: Buffer; webView: Buffer; }>();

}
