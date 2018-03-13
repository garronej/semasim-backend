import * as apiDeclaration from "../../../sipApiDeclarations/semasimBackend/gatewaySide/clientSideSockets";
import { sipLibrary } from "../../../../semasim-gateway";
import * as gatewaySockets from "../gatewaySockets/index_sipProxy";
import { types as feTypes } from "../../../../semasim-frontend";

export const handlers: sipLibrary.api.Server.Handlers = {};

(() => {

    const methodName = apiDeclaration.getDongles.methodName;
    type Params = apiDeclaration.getDongles.Params;
    type Response = apiDeclaration.getDongles.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": ({ gatewaySocketRemoteAddress }) =>
            gatewaySockets.remoteApi.getDongles(gatewaySocketRemoteAddress)
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.unlockDongle.methodName;
    type Params = apiDeclaration.unlockDongle.Params;
    type Response = apiDeclaration.unlockDongle.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async ({ imei, pin, gatewaySocketRemoteAddress, auth }) => {

            let unlockResult = await gatewaySockets.remoteApi.unlockDongle(
                gatewaySocketRemoteAddress, imei, pin
            );

            if (!unlockResult) {
                return undefined;
            }

            if (!unlockResult.success) {
                return {
                    "wasPinValid": false,
                    "pinState": unlockResult.pinState,
                    "tryLeft": unlockResult.tryLeft
                };
            }

            try {

                var { dongle, simOwner } = await gatewaySockets.remoteApi.waitForUsableDongle(imei, 30000);

            } catch{

                return undefined;

            }

            if (!simOwner) {

                let resp: feTypes.UnlockResult.ValidPin.Registerable = {
                    "wasPinValid": true,
                    "isSimRegisterable": true,
                    dongle
                };

                return resp;

            } else {

                let resp: feTypes.UnlockResult.ValidPin.NotRegisterable = {
                    "wasPinValid": true,
                    "isSimRegisterable": false,
                    "simRegisteredBy": (simOwner.user === auth.user) ?
                        ({ "who": "MYSELF" }) :
                        ({ "who": "OTHER USER", "email": simOwner.email })
                };

                return resp;

            }

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.getSipPasswordAndDongle.methodName;
    type Params = apiDeclaration.getSipPasswordAndDongle.Params;
    type Response = apiDeclaration.getSipPasswordAndDongle.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": ({ imsi }) =>
            gatewaySockets.remoteApi.getSipPasswordAndDongle(imsi)
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.reNotifySimOnline.methodName;
    type Params = apiDeclaration.reNotifySimOnline.Params;
    type Response = apiDeclaration.reNotifySimOnline.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi }) =>{
            await gatewaySockets.remoteApi.reNotifySimOnline(imsi);
            return undefined;
        }
    };

    handlers[methodName] = handler;

})();