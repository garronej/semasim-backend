
import * as sipLibrary from "ts-sip";
import { apiDeclaration } from "../../sip_api_declarations/loadBalancerSocket";
import { types as lbTypes } from "../../semasim-load-balancer";
import { SyncEvent } from "ts-events-extended";

export const handlers: sipLibrary.api.Server.Handlers = {};

export const evtInstanceUp= new SyncEvent<lbTypes.RunningInstance>();

(() => {

    const methodName = apiDeclaration.notifyInstanceUp.methodName;
    type Params = apiDeclaration.notifyInstanceUp.Params;
    type Response = apiDeclaration.notifyInstanceUp.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async params => {

            evtInstanceUp.post(params);

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();

export const evtInstanceDown= new SyncEvent<apiDeclaration.notifyInstanceDown.Params>();

(() => {

    const methodName = apiDeclaration.notifyInstanceDown.methodName;
    type Params = apiDeclaration.notifyInstanceDown.Params;
    type Response = apiDeclaration.notifyInstanceDown.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async params => {

            evtInstanceDown.post(params);

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();
