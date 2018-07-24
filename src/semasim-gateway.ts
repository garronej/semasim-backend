
const version: string= require("../../semasim-gateway/package.json")["version"];

import * as types from "../../semasim-gateway/dist/lib/types";
import * as sipProxyMisc from "../../semasim-gateway/dist/lib/sipProxy/misc";

import * as api_decl_gatewaySockets from "../../semasim-gateway/dist/sip_api_declarations/gatewaySockets";
import * as api_decl_backendSocket from "../../semasim-gateway/dist/sip_api_declarations/backendSocket";

export { 
    version, types, sipProxyMisc, 
    api_decl_gatewaySockets, 
    api_decl_backendSocket, 
};