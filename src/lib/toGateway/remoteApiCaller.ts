import * as sip from "ts-sip";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import { apiDeclaration } from "../../sip_api_declarations/gatewayToBackend";
import * as backendRemoteApiCaller from "../toBackend/remoteApiCaller";
//@ts-ignore, to avoid warnings
import { types as dcTypes } from "chan-dongle-extended-client";

export const getDongle = (() => {

    const methodName = apiDeclaration.getDongle.methodName;
    type Params = apiDeclaration.getDongle.Params;
    type Response = apiDeclaration.getDongle.Response;

    return (imei: string, gatewaySocket: sip.Socket): Promise<Response> => {

        return sip.api.client.sendRequest<Params, Response>(
            gatewaySocket,
            methodName,
            { imei },
            {
                "timeout": 5 * 1000,
                "sanityCheck": response => (
                    response === undefined ||
                    dcSanityChecks.dongle(response)
                )
            }
        ).catch(()=> undefined);

    };

})();

export const getDongleSipPasswordAndTowardSimEncryptKeyStr = (() => {

    const methodName = apiDeclaration.getDongleSipPasswordAndTowardSimEncryptKeyStr.methodName;
    type Params = apiDeclaration.getDongleSipPasswordAndTowardSimEncryptKeyStr.Params;
    type Response = apiDeclaration.getDongleSipPasswordAndTowardSimEncryptKeyStr.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => (
                response === undefined
                ||
                (
                    response instanceof Object &&
                    dcSanityChecks.dongleUsable(response.dongle) &&
                    typeof response.sipPassword === "string" &&
                    !!response.sipPassword.match(/^[0-9a-f]{32}$/) &&
                    typeof response.towardSimEncryptKeyStr === "string"
                )
            );

        return sanityCheck;

    })();

    return (imsi: string): Promise<Response> => {

        return backendRemoteApiCaller.forwardRequest<Params, Response>(
            { "target": "GATEWAY", imsi },
            methodName,
            { imsi },
            { "timeout": 10 * 1000 }
        ).catch(()=> undefined);

    };

})();

export const unlockSim = (() => {

    /* 
    NOTE: There is no need to unbind the socket from imei
    as soon as the request to unlock is send.
    When a locked dongle goes online every user logged on the LAN 
    will be asked to unlock the SIM. 
    If two user or more try to unlock it we will have no funky
    business like two AT command send or thing like that.
    Only the first user will receive a unlock result 
    the others will get undefined.
    */

    const methodName = apiDeclaration.unlockSim.methodName;
    type Params = apiDeclaration.unlockSim.Params;
    type Response = apiDeclaration.unlockSim.Response;

    /** Callable from anywhere */
    function f(imei: string, pin: string, gatewayAddress: string): Promise<Response>;
    /** Callable only on process holding the connection */
    function f(imei: string, pin: string, gatewaySocket: sip.Socket): Promise<Response>;
    function f(imei: string, pin: string, arg: string | sip.Socket): Promise<Response> {

        const params: Params = { imei, pin };

        if (typeof arg === "string") {

            const gatewayAddress = arg;

            return backendRemoteApiCaller.unlockSimProxy(
                imei, pin, gatewayAddress
            );

        } else {

            const gatewaySocket = arg;

            return sip.api.client.sendRequest<Params, Response>(
                gatewaySocket,
                methodName,
                params,
                {
                    "sanityCheck": response =>
                        response === undefined ?
                            true : dcSanityChecks.unlockResult(response)
                }
            ).catch(() => undefined);

        }

    }

    return f;

})();

export const rebootDongle = (() => {

    const methodName = apiDeclaration.rebootDongle.methodName;
    type Params = apiDeclaration.rebootDongle.Params;
    type Response = apiDeclaration.rebootDongle.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => (
                response instanceof Object &&
                typeof response.isSuccess === "boolean"
            );

        return sanityCheck;

    })();

    return (imsi: string): Promise<Response> => {

        return backendRemoteApiCaller.forwardRequest<Params, Response>(
            { "target": "GATEWAY", imsi },
            methodName,
            { imsi },
            { "timeout": 5 * 1000 }
        ).catch(()=> ({ "isSuccess": false }))

    };

})();

export const reNotifySimOnline = (() => {

    const methodName = apiDeclaration.reNotifySimOnline.methodName;
    type Params = apiDeclaration.reNotifySimOnline.Params;
    type Response = apiDeclaration.reNotifySimOnline.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (imsi: string): Promise<Response> => {

        return backendRemoteApiCaller.forwardRequest<Params, Response>(
            { "target": "GATEWAY", imsi },
            methodName,
            { imsi },
            { "timeout": 5 * 1000 }
        ).catch(()=> undefined );

    };

})();

export const createContact = (() => {

    const methodName = apiDeclaration.createContact.methodName;
    type Params = apiDeclaration.createContact.Params;
    type Response = apiDeclaration.createContact.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => (
                response === undefined ||
                (
                    response instanceof Object &&
                    typeof response.mem_index === "number" &&
                    typeof response.name_as_stored === "string" &&
                    dcSanityChecks.md5(response.new_storage_digest)
                )
            );

        return sanityCheck;

    })();

    return (imsi: string, name: string, number: string): Promise<Response> => {

        return backendRemoteApiCaller.forwardRequest<Params, Response>(
            { "target": "GATEWAY", imsi },
            methodName,
            { imsi, name, number },
            { "timeout": 6 * 1000 }
        ).catch(()=> undefined);

    };

})();

export const updateContactName = (() => {

    const methodName = apiDeclaration.updateContactName.methodName;
    type Params = apiDeclaration.updateContactName.Params;
    type Response = apiDeclaration.updateContactName.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => (
                response === undefined ||
                (
                    response instanceof Object &&
                    typeof response.new_name_as_stored === "string" &&
                    dcSanityChecks.md5(response.new_storage_digest)
                )
            );

        return sanityCheck;

    })();

    return (imsi: string, mem_index: number, newName: string): Promise<Response> => {

        return backendRemoteApiCaller.forwardRequest<Params, Response>(
            { "target": "GATEWAY", imsi },
            methodName,
            { imsi, mem_index, newName },
            { "timeout": 6 * 1000 }
        ).catch(()=> undefined );

    };

})();

export const deleteContact = (() => {

    const methodName = apiDeclaration.deleteContact.methodName;
    type Params = apiDeclaration.deleteContact.Params;
    type Response = apiDeclaration.deleteContact.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => (
                response === undefined ||
                (
                    response instanceof Object &&
                    dcSanityChecks.md5(response.new_storage_digest)
                )
            );

        return sanityCheck;

    })();

    return (imsi: string, mem_index: number): Promise<Response> => {

        return backendRemoteApiCaller.forwardRequest<Params, Response>(
            { "target": "GATEWAY", imsi },
            methodName,
            { imsi, mem_index },
            { "timeout": 6 * 1000 }
        ).catch(()=> undefined );

    };

})();
