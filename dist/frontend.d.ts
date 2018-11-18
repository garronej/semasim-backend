/// <reference types="node" />
import * as types from "../../frontend/shared/dist/lib/types";
import * as webApiDeclaration from "../../frontend/shared/dist/web_api_declaration";
import * as api_decl_backendToUa from "../../frontend/shared/dist/sip_api_declarations/backendToUa";
import * as api_decl_uaToBackend from "../../frontend/shared/dist/sip_api_declarations/uaToBackend";
export { webApiDeclaration, types, api_decl_backendToUa, api_decl_uaToBackend };
export declare const assets_dir_path: string;
/**
 *
 * @param pageName eg: "manager" or "webphone"
 *
 * Assert pageName in pageList
 *
 */
export declare function getPage(pageName: string): Buffer;
export declare namespace getPage {
    const cache: {
        [pageName: string]: Buffer;
    };
}
