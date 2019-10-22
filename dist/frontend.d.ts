/// <reference types="node" />
declare type MapValue<T> = T extends Map<any, infer R> ? R : never;
import * as types from "../../frontend/shared/dist/lib/types/userSim";
declare type AuthenticatedSessionDescriptorSharedData = import("../../frontend/shared/dist/lib/localStorage/AuthenticatedSessionDescriptorSharedData").AuthenticatedSessionDescriptorSharedData;
import { WebsocketConnectionParams } from "../../frontend/shared/dist/lib/types/WebsocketConnectionParams";
import * as subscriptionTypes from "../../frontend/shared/dist/lib/types/subscription";
import * as shopTypes from "../../frontend/shared/dist/lib/types/shop";
import * as wd from "../../frontend/shared/dist/lib/types/webphoneData/types";
import * as currencyLib from "../../frontend/shared/dist/tools/currency";
import * as shipping from "../../frontend/shared/dist/lib/shipping";
import * as api_decl_backendToUa from "../../frontend/shared/dist/sip_api_declarations/backendToUa";
import * as api_decl_uaToBackend from "../../frontend/shared/dist/sip_api_declarations/uaToBackend";
import * as availablePages from "../../frontend/shared/dist/lib/availablePages";
import { connectSidHttpHeaderName } from "../../frontend/shared/dist/lib/types/connectSidHttpHeaderName";
import * as urlGetParameters from "../../frontend/shared/dist/tools/urlGetParameters";
export { types, AuthenticatedSessionDescriptorSharedData, WebsocketConnectionParams, subscriptionTypes, shopTypes, wd, currencyLib, shipping, api_decl_backendToUa, api_decl_uaToBackend, availablePages, connectSidHttpHeaderName, urlGetParameters };
export declare const static_dir_path: string;
export declare function doesRequireAuth(pageName: availablePages.PageName): boolean;
export declare const isPageName: (pageName: string) => pageName is "login" | "register" | "manager" | "webphone" | "subscription" | "shop";
export declare function getShopProducts(): shopTypes.Product[];
export declare function getPage(pageName: availablePages.PageName): MapValue<typeof getPage.cache>;
export declare namespace getPage {
    const cache: Map<"login" | "register" | "manager" | "webphone" | "subscription" | "shop", {
        unaltered: Buffer;
        webView: Buffer;
    }>;
}
