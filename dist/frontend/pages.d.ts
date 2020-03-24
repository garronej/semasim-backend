/// <reference types="node" />
declare type MapValue<T> = T extends Map<any, infer R> ? R : never;
import * as availablePages from "../../../frontend/shared/dist/lib/availablePages";
export declare const static_dir_path: string;
export { availablePages };
export declare function doesRequireAuth(pageName: availablePages.PageName): boolean;
export declare const isPageName: (pageName: string) => pageName is "webphone" | "login" | "register" | "manager" | "subscription" | "shop";
export declare function getAssetsRoot(env: "DEV" | "PROD"): "/" | "//static.semasim.com/";
export declare function getPage(pageName: availablePages.PageName): MapValue<typeof getPage.cache>;
export declare namespace getPage {
    const cache: Map<"webphone" | "login" | "register" | "manager" | "subscription" | "shop", {
        unaltered: Buffer;
        webView: Buffer;
    }>;
}
