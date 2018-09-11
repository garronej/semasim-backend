
const version: string= require("../../semasim-gateway/package.json")["version"];

import * as types from "../../semasim-gateway/dist/lib/types";
import * as misc from "../../semasim-gateway/dist/lib/misc";

import * as api_decl_backendToGateway from "../../semasim-gateway/dist/sip_api_declarations/backendToGateway";
import * as api_decl_gatewayToBackend from "../../semasim-gateway/dist/sip_api_declarations/gatewayToBackend";

export { 
    version, types, misc, 
    api_decl_backendToGateway,
    api_decl_gatewayToBackend
};
