/// <reference types="node" />
import * as types from "../../frontend/shared/dist/lib/types";
import * as webApiDeclaration from "../../frontend/shared/dist/web_api_declaration";
import * as api_decl_backendToUa from "../../frontend/shared/dist/sip_api_declarations/backendToUa";
import * as api_decl_uaToBackend from "../../frontend/shared/dist/sip_api_declarations/uaToBackend";
export { webApiDeclaration, types, api_decl_backendToUa, api_decl_uaToBackend };
/**
 * return [ "login", "register", "manager", "webphone", ... ]
 * */
export declare function getPageNames(): string[];
export declare namespace getPageNames {
    let value: string[] | undefined;
}
/**
 * @param pageName eg: "manager" or "webphone"
 *
 * Assert pageName in pageList
 *
 */
export declare function getPage(pageName: string): getPage.Page;
export declare namespace getPage {
    type Page = {
        "html": Buffer;
        "js": Buffer;
    };
    const cache: {
        [pageName: string]: Page;
    };
}
export declare const pathToWebAssets: string;
