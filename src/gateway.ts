
const version: string= require("../../gateway/package.json")["version"];

import * as types from "../../gateway/dist/lib/types";
import * as misc from "../../gateway/dist/lib/misc";

import * as api_decl_backendToGateway from "../../gateway/dist/sip_api_declarations/backendToGateway";
import * as api_decl_gatewayToBackend from "../../gateway/dist/sip_api_declarations/gatewayToBackend";

export { 
    version, types, misc, 
    api_decl_backendToGateway,
    api_decl_gatewayToBackend
};
