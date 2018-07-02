
const version: string= require("../../semasim-gateway/package.json")["version"];

import * as types from "../../semasim-gateway/dist/lib/types";
import * as sipProxyMisc from "../../semasim-gateway/dist/lib/sipProxy/misc";

import * as declarationGatewaySocketApi from "../../semasim-gateway/dist/lib/sipApiDeclarations/semasimBackend/gatewaySide/gatewaySockets";
import * as declarationBackendSocketApi from "../../semasim-gateway/dist/lib/sipApiDeclarations/semasimGateway/backendSocket";

export { 
    version, types, sipProxyMisc, 
    declarationGatewaySocketApi, 
    declarationBackendSocketApi, 
};