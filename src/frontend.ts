
type MapValue<T> = T extends Map<any, infer R> ? R : never;
import * as types from "../../frontend/shared/dist/lib/types/userSim";
import { AuthenticatedSessionDescriptorSharedData, WebsocketConnectionParams } from "../../frontend/shared/dist/lib/cookies/logic/backend";
import * as subscriptionTypes from "../../frontend/shared/dist/lib/types/subscription";
import * as shopTypes from "../../frontend/shared/dist/lib/types/shop";
import * as wd from "../../frontend/shared/dist/lib/types/webphoneData/types";
import * as currencyLib from "../../frontend/shared/dist/tools/currency";
import { getProducts } from "../../frontend/shared/dist/lib/shopProducts";
import * as shipping from "../../frontend/shared/dist/lib/shipping";
import * as webApiDeclaration from "../../frontend/shared/dist/web_api_declaration";
import * as api_decl_backendToUa from "../../frontend/shared/dist/sip_api_declarations/backendToUa";
import * as api_decl_uaToBackend from "../../frontend/shared/dist/sip_api_declarations/uaToBackend";
import * as availablePages from "../../frontend/shared/dist/lib/availablePages";
import { deploy } from "./deploy";
import * as ejs from "ejs";
import * as logger from "logger";
import * as watch from "node-watch";
import * as urlGetParameters from "../../frontend/shared/dist/tools/urlGetParameters";

const debug = logger.debugFactory();

export {
    webApiDeclaration,
    types,
    AuthenticatedSessionDescriptorSharedData,
    WebsocketConnectionParams,
    subscriptionTypes,
    shopTypes,
    wd,
    currencyLib,
    shipping,
    api_decl_backendToUa,
    api_decl_uaToBackend,
    availablePages,
    urlGetParameters
};

import * as fs from "fs";
import * as path from "path";

const frontend_dir_path = path.join(__dirname, "..", "..", "frontend");
const pages_dir_path = path.join(frontend_dir_path, "pages");
const templates_dir_path = path.join(frontend_dir_path, "shared", "templates");
export const static_dir_path = path.join(frontend_dir_path, "static.semasim.com");


export function doesRequireAuth(pageName: availablePages.PageName): boolean {

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

export const isPageName = (() => {

    const set = new Set<string>(availablePages.PageName.pagesNames);

    return (pageName: string): pageName is availablePages.PageName =>
        set.has(pageName)
        ;

})();

function getAssetsRoot(env: "DEV" | "PROD") {
    return env === "DEV" ? "/" : "//static.semasim.com/";
}

export function getShopProducts() {

    let assets_root = getAssetsRoot(deploy.getEnv());

    if (assets_root === "/") {
        assets_root = `//web.${deploy.getBaseDomain()}/`;
    }

    assets_root = `https:${assets_root}`;

    return getProducts(assets_root);

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
