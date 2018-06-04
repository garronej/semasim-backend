import * as apiDeclaration from "../../../sipApiDeclarations/semasimBackend/gatewaySide/clientSideSockets";
import * as sipLibrary from "ts-sip";
import * as gatewaySockets from "../gatewaySockets/index_sipProxy";
import { types as feTypes } from "../../../../semasim-frontend";
import * as db from "../../../dbSemasim";

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


(() => {

    const methodName = apiDeclaration.createContact.methodName;
    type Params = apiDeclaration.createContact.Params;
    type Response = apiDeclaration.createContact.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "handler": async ({ imsi, name, number, auth }) =>{

            const userSim= (await db.getUserSims(auth.user))
                .find(({ sim }) => sim.imsi === imsi);

            if( !userSim ){

                console.log("User does not have access to this sim");
                
                return undefined;

            }

            if( !!userSim.phonebook.find(({ number_raw })=> number_raw === number) ){

                console.log("Already a contact with this number");

                return undefined;

            }

            let storageInfos: {
                mem_index: number;
                name_as_stored: string;
                new_storage_digest: string;
            } | undefined = undefined;

            if (userSim.sim.storage.infos.storageLeft !== 0) {

                storageInfos = await gatewaySockets.remoteApi.createContact(imsi, name, number);

            }

            try {

                await db.createOrUpdateSimContact(imsi, name, number, storageInfos);

            } catch{

                return undefined;

            }

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

            const userSim= (await db.getUserSims(auth.user))
                .find(({ sim }) => sim.imsi === imsi);

            if( !userSim ){

                console.log("User does not have access to this sim");
                
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

                console.log(`Referenced contact does not exist does not exist.`);

                return { "isSuccess": false };

            }

            if( contact.name === newName ){

                console.log("No need to update contact, name unchanged");

                return { "isSuccess": true };

            }

            let storageInfos: {
                mem_index: number;
                name_as_stored: string;
                new_storage_digest: string;
            } | undefined;

            if (contact.mem_index !== undefined) {

                const resp = await gatewaySockets.remoteApi.updateContactName(imsi, contact.mem_index, newName);

                if (resp) {

                    storageInfos = {
                        "mem_index": contact.mem_index,
                        "name_as_stored": resp.new_name_as_stored,
                        "new_storage_digest": resp.new_storage_digest
                    };

                }else{

                    console.log("update contact failed on the gateway");

                    //TODO: the contact should maybe be updated anyway
                    return { "isSuccess": false };

                }

            }else{

                storageInfos= undefined;

            }

            try {

                await db.createOrUpdateSimContact(
                    imsi, newName, contact.number_raw, storageInfos
                );

            } catch{

                return { "isSuccess": false };

            }

            return { "isSuccess": true };

        }
    };

    handlers[methodName] = handler;

})();