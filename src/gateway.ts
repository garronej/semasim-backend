
const version: string= require("../../gateway/package.json")["version"];

import * as types from "../../gateway/dist/lib/types";
import { sanityChecks, isValidEmail } from "../../gateway/dist/lib/misc/sanityChecks";
import * as sipRouting from "../../gateway/dist/lib/misc/sipRouting";

import * as api_decl_backendToGateway from "../../gateway/dist/sip_api_declarations/backendToGateway";
import * as api_decl_gatewayToBackend from "../../gateway/dist/sip_api_declarations/gatewayToBackend";

export { 
    version, types, sanityChecks, isValidEmail, sipRouting, 
    api_decl_backendToGateway,
    api_decl_gatewayToBackend
};
