
import * as apiDeclaration from "../../../sip_api_declarations/clientSideSockets";
import * as sipLibrary from "ts-sip";
import * as gatewaySockets_remoteApi from "../gatewaySockets/remoteApiCaller";
import { waitForUsableDongle as gatewaySockets_localApi_waitForUsableDongle } from "../gatewaySockets/localApiHandlers";
import { types as feTypes } from "../../../semasim-frontend";
import * as db from "../../dbSemasim";
import * as pushNotifications from "../../pushNotifications";
import { types as gwTypes } from "../../../semasim-gateway";

import * as logger from "logger";

const debug = logger.debugFactory();

export const handlers: sipLibrary.api.Server.Handlers = {};

(() => {

    const methodName = apiDeclaration.getDongles.methodName;
    type Params = apiDeclaration.getDongles.Params;
    type Response = apiDeclaration.getDongles.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": ({ gatewaySocketRemoteAddress }) =>
            gatewaySockets_remoteApi.getDongles(gatewaySocketRemoteAddress)
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.unlockDongle.methodName;
    type Params = apiDeclaration.unlockDongle.Params;
    type Response = apiDeclaration.unlockDongle.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async ({ imei, pin, gatewaySocketRemoteAddress, auth }) => {

            let unlockResult = await gatewaySockets_remoteApi.unlockDongle(
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

                var { dongle, simOwner } = await gatewaySockets_localApi_waitForUsableDongle(imei, 30000);

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

    const methodName = apiDeclaration.rebootDongle.methodName;
    type Params = apiDeclaration.rebootDongle.Params;
    type Response = apiDeclaration.rebootDongle.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi, auth }) =>{

            const userSim= (await db.getUserSims(auth))
                .find(({ sim }) => sim.imsi === imsi);

            if( !userSim ){

                debug("User does not have access to this dongle");
                
                return { "isSuccess": false };

            }

            await gatewaySockets_remoteApi.rebootDongle(imsi);

            return { "isSuccess": true };

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
            gatewaySockets_remoteApi.getSipPasswordAndDongle(imsi)
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.reNotifySimOnline.methodName;
    type Params = apiDeclaration.reNotifySimOnline.Params;
    type Response = apiDeclaration.reNotifySimOnline.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi }) =>{
            await gatewaySockets_remoteApi.reNotifySimOnline(imsi);
            return undefined;
        }
    };

    handlers[methodName] = handler;

})();


(() => {

    const methodName = apiDeclaration.createContact.methodName;
    type Params = apiDeclaration.createContact.Params;
    type Response = apiDeclaration.createContact.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi, name, number, auth }) =>{

            const userSim= (await db.getUserSims(auth))
                .find(({ sim }) => sim.imsi === imsi);

            if( !userSim ){

                debug("User does not have access to this sim");
                
                return undefined;

            }

            if( !!userSim.phonebook.find(({ number_raw })=> number_raw === number) ){

                debug("Already a contact with this number");

                return undefined;

            }

            let storageInfos: {
                mem_index: number;
                name_as_stored: string;
                new_storage_digest: string;
            } | undefined = undefined;

            if (userSim.sim.storage.infos.storageLeft !== 0) {

                storageInfos = await gatewaySockets_remoteApi.createContact(imsi, name, number);

            }

            let uasRegisteredToSim: gwTypes.Ua[];

            try {

                uasRegisteredToSim= await db.createOrUpdateSimContact(
                    imsi, name, number, storageInfos
                );

            } catch{

                return undefined;

            }

            await pushNotifications.send( uasRegisteredToSim, "RELOAD CONFIG");

            return storageInfos !== undefined?({ "mem_index": storageInfos.mem_index }):undefined;

        }
    };

    handlers[methodName] = handler;

})();


(() => {

    const methodName = apiDeclaration.updateContactName.methodName;
    type Params = apiDeclaration.updateContactName.Params;
    type Response = apiDeclaration.updateContactName.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi, contactRef, newName, auth }) =>{

            const userSim= (await db.getUserSims(auth))
                .find(({ sim }) => sim.imsi === imsi);

            if( !userSim ){

                debug("User does not have access to this sim");
                
                return { "isSuccess": false };

            }

            let contact : feTypes.UserSim.Contact | undefined;

            if ("mem_index" in contactRef) {

                contact = userSim.phonebook.find(
                    ({ mem_index }) => mem_index === contactRef.mem_index 
                );

            } else {

                contact = userSim.phonebook.find(
                    ({ number_raw }) => number_raw === contactRef.number
                );

            }

            if (!contact) {

                debug(`Referenced contact does not exist does not exist.`);

                return { "isSuccess": false };

            }

            if( contact.name === newName ){

                debug("No need to update contact, name unchanged");

                return { "isSuccess": true };

            }

            let storageInfos: {
                mem_index: number;
                name_as_stored: string;
                new_storage_digest: string;
            } | undefined;

            if (contact.mem_index !== undefined) {

                const resp = await gatewaySockets_remoteApi.updateContactName(imsi, contact.mem_index, newName);

                if (resp) {

                    storageInfos = {
                        "mem_index": contact.mem_index,
                        "name_as_stored": resp.new_name_as_stored,
                        "new_storage_digest": resp.new_storage_digest
                    };

                }else{

                    debug("update contact failed on the gateway");

                    //TODO: the contact should maybe be updated anyway
                    return { "isSuccess": false };

                }

            }else{

                storageInfos= undefined;

            }

            let uasRegisteredToSim: gwTypes.Ua[];

            try {

                uasRegisteredToSim= await db.createOrUpdateSimContact(
                    imsi, newName, contact.number_raw, storageInfos
                );

            } catch{

                return { "isSuccess": false };

            }

            await pushNotifications.send( uasRegisteredToSim, "RELOAD CONFIG");

            return { "isSuccess": true };

        }
    };

    handlers[methodName] = handler;

})();


(() => {

    const methodName = apiDeclaration.deleteContact.methodName;
    type Params = apiDeclaration.deleteContact.Params;
    type Response = apiDeclaration.deleteContact.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi, contactRef, auth }) =>{


            const userSim= (await db.getUserSims(auth))
                .find(({ sim }) => sim.imsi === imsi);

            if( !userSim ){

                debug("User does not have access to this sim");
                
                return { "isSuccess": false };

            }

            let contact : feTypes.UserSim.Contact | undefined;

            if ("mem_index" in contactRef) {

                contact = userSim.phonebook.find(
                    ({ mem_index }) => mem_index === contactRef.mem_index 
                );

            } else {

                contact = userSim.phonebook.find(
                    ({ number_raw }) => number_raw === contactRef.number
                );

            }

            if (!contact) {

                debug(`Referenced contact does not exist does not exist.`);

                return { "isSuccess": false };

            }

            let prQuery: Promise<gwTypes.Ua[]>;

            if( contact.mem_index !== undefined ){

                const resp= await gatewaySockets_remoteApi.deleteContact(imsi, contact.mem_index);

                if( !resp ){
                    return { "isSuccess": false };
                }

                prQuery= db.deleteSimContact(
                    imsi, 
                    { "mem_index": contact.mem_index, "new_storage_digest": resp.new_storage_digest }
                );

            }else{

                prQuery= db.deleteSimContact(imsi, { "number_raw": contact.number_raw });

            }

            let uasRegisteredToSim: gwTypes.Ua[];

            try {

                uasRegisteredToSim= await prQuery;

            } catch{

                return { "isSuccess": false };

            }

            await pushNotifications.send( uasRegisteredToSim, "RELOAD CONFIG");

            return { "isSuccess": true };

        }
    };

    handlers[methodName] = handler;

})();