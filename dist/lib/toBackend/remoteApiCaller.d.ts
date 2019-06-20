import * as apiDeclaration from "../../sip_api_declarations/backendToBackend";
import { types as gwTypes } from "../../gateway";
import { types as dcTypes } from "chan-dongle-extended-client";
/**
 *
 * In the case we target a UA user email or
 * a gateway by imsi this method save us the
 * trouble of writing a proxy method.
 *
 * An API request to an UA or a gateway can
 * only be done from the node process that hold
 * the socket connection to the target.
 *
 * This method behave like sip.api.client.sendRequest
 * except that instead of directly sending the request
 * to a given socket the request will be forwarded
 * to the process the target UA or gateway is connected to.
 *
 * An other difference is that SanityCheck can't be serialized
 * so they must be defined statically in SanityCheck_.store
 *
 * If the current node process has the route to the ua
 * or gateway the request is performed directly.
 *
 * throw as sendRequest would or if no route was found.
 *
 * */
export declare const forwardRequest: <Params_, Response_>(route: apiDeclaration.forwardRequest.Route, methodName_: string, params_: Params_, extra: {
    timeout: number;
}) => Promise<Response_>;
export declare type SanityCheck_<Response_> = (response_: Response_) => boolean;
export declare namespace SanityCheck_ {
    /**
     * We wrap the store into a proxy so
     * in the future we have the same method name
     * for a gateway and a UA method we will see it right away.
     * */
    const store: {
        [methodName_: string]: SanityCheck_<any>;
    };
}
/** Never throw, if nothing to send the request is not sent */
export declare const notifyRoute: (params: apiDeclaration.notifyRoute.Params) => Promise<void>;
export declare const qualifyContact: (contact: gwTypes.Contact) => Promise<boolean>;
/** Don't throw */
export declare const destroyUaSocket: (contact: gwTypes.Contact) => Promise<void>;
/**
 * return all dongles connected from a
 * given address that can potentially be
 * unlocked or registered by a specific user.
 *
 * Meaning that it will return
 * -all the locked dongles holding a sim with unreadable iccid.
 * -all the locked dongles holding a sim with readable iccid
 * and that sim is either registered by the user or not registered.
 * -all the usable dongle holding a sim that is not yet registered.
 *
 * gatewayAddress: get only from this address
 * auth: id of the user used to exclude the dongle he should not have access to
 * */
export declare const collectDonglesOnLan: (gatewayAddress: string, auth: import("../web/sessionManager").UserAuthentication) => Promise<dcTypes.Dongle[]>;
/** Don't throw */
export declare const notifyDongleOnLanProxy: (dongle: dcTypes.Dongle, gatewayAddress: string) => Promise<undefined>;
export declare const notifyLoggedFromOtherTabProxy: (email: string) => Promise<void>;
export declare const unlockSimProxy: (imei: string, pin: string, gatewayAddress: string) => Promise<apiDeclaration.unlockSimProxy.Response>;
