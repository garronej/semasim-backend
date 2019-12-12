
import { apiDeclaration } from "../../../sip_api_declarations/backendToUa";
import * as sip from "ts-sip";
import * as dbSemasim from "../../dbSemasim";
import { types as feTypes } from "../../../frontend";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import * as pushNotifications from "../../pushNotifications";
import * as gatewayRemoteApiCaller from "../../toGateway/remoteApiCaller";
import * as remoteApiCaller from "../remoteApiCaller";
import * as emailSender from "../../emailSender";
import { types as gwTypes, isValidEmail } from "../../../gateway";
import * as stripe from "../../stripe";
import { buildNoThrowProxyFunction } from "../../../tools/noThrow";
import { getAuthenticatedSession } from "../socketSession";

export const handlers: sip.api.Server.Handlers = {};



{

    const methodName = apiDeclaration.getUsableUserSims.methodName;
    type Params = apiDeclaration.getUsableUserSims.Params;
    type Response = apiDeclaration.getUsableUserSims.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.includeContacts === "boolean"
        ),
        "handler": async ({ includeContacts }, socket) => {

            const session = getAuthenticatedSession(socket);

            //TODO: Create a SQL request that pull only usable sims
            const userSims = await dbSemasim.getUserSims(session)
                .then(userSims => userSims.filter(feTypes.UserSim.Usable.match));

            if (!includeContacts) {

                for (const userSim of userSims) {

                    userSim.sim.storage.contacts = [];
                    userSim.phonebook = [];

                }

            }

            return userSims;

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.unlockSim.methodName;
    type Params = apiDeclaration.unlockSim.Params;
    type Response = apiDeclaration.unlockSim.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imei(params.imei) &&
            typeof params.pin === "string" &&
            !!params.pin.match(/^[0-9]{4}$/)
        ),
        "handler": ({ imei, pin }, socket) =>
            gatewayRemoteApiCaller.unlockSim(
                imei, pin, socket.remoteAddress
            )
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.registerSim.methodName;
    type Params = apiDeclaration.registerSim.Params;
    type Response = apiDeclaration.registerSim.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            dcSanityChecks.imei(params.imei) &&
            typeof params.friendlyName === "string"
        ),
        "handler": async ({ imsi, imei, friendlyName }, socket) => {

            const session = getAuthenticatedSession(socket);

            const dongleSipPasswordAndTowardSimEncryptKeyStr= 
                await gatewayRemoteApiCaller.getDongleSipPasswordAndTowardSimEncryptKeyStr(imsi);

            if( !dongleSipPasswordAndTowardSimEncryptKeyStr ){
                throw new Error("Dongle not found");
            }

            const {
                dongle, sipPassword, towardSimEncryptKeyStr
            } = dongleSipPasswordAndTowardSimEncryptKeyStr;

            if (dongle.imei !== imei) {

                throw new Error("Attack prevented");

            }

            //NOTE: The user may have changer ip since he received the request
            //in this case the query will crash... not a big deal.
            const userUas = await dbSemasim.registerSim(
                session,
                dongle.sim,
                friendlyName,
                sipPassword,
                towardSimEncryptKeyStr,
                dongle,
                socket.remoteAddress,
                dongle.isGsmConnectivityOk,
                dongle.cellSignalStrength
            );

            //TODO: this should be an api method
            pushNotifications.sendSafe(userUas, { "type": "RELOAD CONFIG" });

            //NOTE: Here we break the rule of gathering all db request
            //but as sim registration is not a so common operation it's not
            //a big deal.
            return dbSemasim.getUserSims(session)
                .then(userSims => userSims
                    .filter(feTypes.UserSim.Owned.match)
                    .find(({ sim }) => sim.imsi === imsi)!
                );

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.unregisterSim.methodName;
    type Params = apiDeclaration.unregisterSim.Params;
    type Response = apiDeclaration.unregisterSim.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": async ({ imsi }, socket) => {

            const session = getAuthenticatedSession(socket);

            const { affectedUas, owner } = await dbSemasim.unregisterSim(
                session,
                imsi
            );

            //TODO: We should have a different method for the ua that lost perm and the ua that have got the sim unregistered by the user.
            remoteApiCaller.notifySimPermissionLost(
                imsi,
                affectedUas.filter(
                    ({ instance }) => session.shared.uaInstanceId !== instance
                )
            );

            if (owner.user !== session.user) {

                const getUserUas = buildNoThrowProxyFunction(dbSemasim.getUserUas, dbSemasim);

                const { ownership: { sharedWith: { confirmed } } } = (await dbSemasim.getUserSims(owner))
                    .find(({ sim }) => sim.imsi === imsi)! as feTypes.UserSim.Owned;

                Promise.all(
                    [owner.shared.email, ...confirmed].map(email => getUserUas(email))
                )
                    .then(arrOfUas => arrOfUas.reduce((prev, curr) => [...prev, ...curr], [] as gwTypes.Ua[]))
                    .then(uas =>
                        remoteApiCaller.notifyOtherSimUserUnregisteredSim(
                            { imsi, "email": session.shared.email },
                            uas
                        )
                    );

            }

            pushNotifications.sendSafe(affectedUas, { "type": "RELOAD CONFIG" });

            gatewayRemoteApiCaller.reNotifySimOnline(imsi);

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.rebootDongle.methodName;
    type Params = apiDeclaration.rebootDongle.Params;
    type Response = apiDeclaration.rebootDongle.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": async ({ imsi }, socket) => {

            const session = getAuthenticatedSession(socket);

            //TODO: Reboot dongle should be by imei

            const isAllowedTo = await dbSemasim.getUserSims(session)
                .then(userSims => !!userSims.find(({ sim }) => sim.imsi === imsi))
                ;

            if (!isAllowedTo) {
                throw new Error("user not allowed to reboot this dongle");
            }

            const { isSuccess } = await gatewayRemoteApiCaller.rebootDongle(imsi);

            if (!isSuccess) {
                throw new Error("Reboot dongle error");
            }

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.shareSim;
    type Params = apiDeclaration.shareSim.Params;
    type Response = apiDeclaration.shareSim.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            !params.emails.find(email => !isValidEmail(email)) &&
            typeof params.message === "string"
        ),
        "handler": async ({ imsi, emails, message }, socket) => {

            const session = getAuthenticatedSession(socket);

            const affectedUsers = await dbSemasim.shareSim(
                session, imsi, emails, message
            );

            const getUserSims = buildNoThrowProxyFunction(dbSemasim.getUserSims, dbSemasim);
            const getUserUas = buildNoThrowProxyFunction(dbSemasim.getUserUas, dbSemasim);


            getUserSims(session).then(
                userSims => userSims
                    .filter(feTypes.UserSim.Owned.match)
                    .find(({ sim }) => sim.imsi === imsi)!
            ).then(userSim => emailSender.sharingRequestSafe(
                session.shared.email,
                userSim,
                message,
                [
                    ...affectedUsers.notRegistered.map(email => ({ email, "isRegistered": false })),
                    ...affectedUsers.registered.map(({ shared: { email } }) => ({ email, "isRegistered": true }))
                ]
            ));

            for (const auth of affectedUsers.registered) {

                Promise.all([
                    getUserSims(auth)
                        .then(userSims => userSims
                            .filter(feTypes.UserSim.Shared.NotConfirmed.match)
                            .find(({ sim }) => sim.imsi === imsi)!
                        ),
                    getUserUas(auth.user)
                ]).then(([userSim, uas]) => remoteApiCaller.notifySimSharingRequest(userSim, uas));

            }

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.stopSharingSim;
    type Params = apiDeclaration.stopSharingSim.Params;
    type Response = apiDeclaration.stopSharingSim.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            !params.emails.find(email => !isValidEmail(email))
        ),
        "handler": async ({ imsi, emails }, socket) => {

            const session = getAuthenticatedSession(socket);

            const noLongerRegisteredUas = await dbSemasim.stopSharingSim(
                session,
                imsi,
                emails
            );

            if (noLongerRegisteredUas.length !== 0) {

                gatewayRemoteApiCaller.reNotifySimOnline(imsi);

            }

            remoteApiCaller.notifySimPermissionLost(
                imsi,
                [
                    ...noLongerRegisteredUas,
                    ...await dbSemasim.getUserUas(session.user)
                ]
            );

            //TODO: Other ua should be notified that no longer sharing.
            pushNotifications.sendSafe(noLongerRegisteredUas, { "type": "RELOAD CONFIG" });

            return undefined;


        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.changeSimFriendlyName.methodName;
    type Params = apiDeclaration.changeSimFriendlyName.Params;
    type Response = apiDeclaration.changeSimFriendlyName.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.friendlyName === "string"
        ),
        "handler": async ({ imsi, friendlyName }, socket) => {

            const session = getAuthenticatedSession(socket);

            const userUas = await dbSemasim.setSimFriendlyName(
                session,
                imsi,
                friendlyName
            );

            pushNotifications.sendSafe(userUas, { "type": "RELOAD CONFIG" });

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.acceptSharingRequest;
    type Params = apiDeclaration.acceptSharingRequest.Params;
    type Response = apiDeclaration.acceptSharingRequest.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.friendlyName === "string"
        ),
        "handler": async ({ imsi, friendlyName }, socket) => {

            const session = getAuthenticatedSession(socket);

            const userUas = await dbSemasim.setSimFriendlyName(
                session,
                imsi,
                friendlyName
            );


            //TODO: Send notification to other user ua that there is a new sim
            pushNotifications.sendSafe(userUas, { "type": "RELOAD CONFIG" });

            const {
                ownership: { ownerEmail, otherUserEmails },
                password
            } = await dbSemasim.getUserSims(session)
                .then(userSims => userSims
                    .filter(feTypes.UserSim.Shared.Confirmed.match)
                    .find(({ sim }) => sim.imsi === imsi)!
                );


            const getUserUas = buildNoThrowProxyFunction(dbSemasim.getUserUas, dbSemasim);

            Promise.all(
                [ownerEmail, ...otherUserEmails].map(email => getUserUas(email))
            )
                .then(arrOfUas => arrOfUas.reduce((prev, curr) => [...prev, ...curr], [] as gwTypes.Ua[]))
                .then(uas => remoteApiCaller.notifySharingRequestResponse(
                    { imsi, "email": session.shared.email, "isAccepted": true },
                    uas
                ));


            return { password };

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.rejectSharingRequest.methodName;
    type Params = apiDeclaration.rejectSharingRequest.Params;
    type Response = apiDeclaration.rejectSharingRequest.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": async ({ imsi }, socket) => {

            const session = getAuthenticatedSession(socket);

            const { owner } = await dbSemasim.unregisterSim(session, imsi);

            remoteApiCaller.notifySharingRequestResponse(
                { imsi, "email": session.shared.email, "isAccepted": false },
                await dbSemasim.getUserUas(owner.user)
            );

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.createContact.methodName;
    type Params = apiDeclaration.createContact.Params;
    type Response = apiDeclaration.createContact.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.name === "string" &&
            typeof params.number === "string"
        ),
        "handler": async ({ imsi, name, number }, socket) => {

            const session = getAuthenticatedSession(socket);

            const userSim = await dbSemasim.getUserSims(session)
                .then(userSims => userSims
                    .filter(feTypes.UserSim.Usable.match)
                    .find(({ sim }) => sim.imsi === imsi)
                );


            if (!userSim) {

                throw new Error("User does not have access to this sim");

            }

            if (!!userSim.phonebook.find(({ number_raw }) => number_raw === number)) {

                throw new Error("Already a contact with this number");

            }

            const storageInfos = await Promise.resolve((() => {

                if (userSim.sim.storage.infos.storageLeft !== 0) {

                    return gatewayRemoteApiCaller.createContact(
                        imsi, name, number
                    );

                }

                return undefined;

            })());


            //TODO: this function should return number local format.
            const uasRegisteredToSim = await dbSemasim.createOrUpdateSimContact(
                imsi, name, number, storageInfos
            );

            pushNotifications.sendSafe(uasRegisteredToSim, { "type": "RELOAD CONFIG" });

            remoteApiCaller.notifyContactCreatedOrUpdated(
                {
                    imsi,
                    name,
                    "number_raw": number,
                    "storage": storageInfos !== undefined ? ({
                        "mem_index": storageInfos.mem_index,
                        "name_as_stored": storageInfos.name_as_stored,
                        "new_digest": storageInfos.new_storage_digest
                    }) : undefined
                },
                uasRegisteredToSim.filter(
                    ({ instance }) => session.shared.uaInstanceId !== instance
                )
            );

            //TODO: see wtf with number local format here why the hell there isn't new_digest.
            return storageInfos !== undefined ? ({
                "mem_index": storageInfos.mem_index,
                "name_as_stored_in_sim": storageInfos.name_as_stored,
                "new_digest": storageInfos.new_storage_digest
            }) : undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.updateContactName;
    type Params = apiDeclaration.updateContactName.Params;
    type Response = apiDeclaration.updateContactName.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.contactRef instanceof Object &&
            (
                typeof params.contactRef["mem_index"] === "number" ||
                typeof params.contactRef["number"] === "string"
            ) &&
            typeof params.newName === "string" &&
            params.newName !== ""
        ),
        "handler": async ({ imsi, contactRef, newName }, socket) => {

            const session = getAuthenticatedSession(socket);

            const userSim = await dbSemasim.getUserSims(session)
                .then(userSims => userSims
                    .filter(feTypes.UserSim.Usable.match)
                    .find(({ sim }) => sim.imsi === imsi)
                );


            if (!userSim) {

                throw new Error("User does not have access to this sim");

            }

            let contact: feTypes.UserSim.Contact | undefined;

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

                throw new Error("Referenced contact does not exist does not exist.");

            }

            if (contact.name === newName) {

                //No need to update contact, name unchanged

                return contact.mem_index !== undefined ?
                    ({
                        "name_as_stored_in_sim": userSim.sim.storage.contacts
                            .find(({ index }) => index === contact!.mem_index)!.name,
                        "new_digest": userSim.sim.storage.digest
                    }) : undefined;

            }

            let storageInfos: {
                mem_index: number;
                name_as_stored: string;
                new_storage_digest: string;
            } | undefined;

            if (contact.mem_index !== undefined) {

                const resp = await gatewayRemoteApiCaller.updateContactName(
                    imsi, contact.mem_index, newName
                );

                if (resp) {

                    storageInfos = {
                        "mem_index": contact.mem_index,
                        "name_as_stored": resp.new_name_as_stored,
                        "new_storage_digest": resp.new_storage_digest
                    };

                } else {

                    //TODO: the contact should maybe be updated anyway
                    throw new Error("update contact failed on the gateway");


                }

            } else {

                storageInfos = undefined;

            }

            const uasRegisteredToSim =
                await dbSemasim.createOrUpdateSimContact(
                    imsi, newName, contact.number_raw, storageInfos
                );

            pushNotifications.sendSafe(uasRegisteredToSim, { "type": "RELOAD CONFIG" });

            remoteApiCaller.notifyContactCreatedOrUpdated(
                {
                    imsi,
                    "name": newName,
                    "number_raw": contact.number_raw,
                    "storage": storageInfos !== undefined ? ({
                        "mem_index": storageInfos.mem_index,
                        "name_as_stored": storageInfos.name_as_stored,
                        "new_digest": storageInfos.new_storage_digest
                    }) : undefined
                },
                uasRegisteredToSim.filter(
                    ({ instance }) => session.shared.uaInstanceId !== instance
                )
            );

            return storageInfos !== undefined ?
                ({
                    "name_as_stored_in_sim": storageInfos.name_as_stored,
                    "new_digest": storageInfos.new_storage_digest
                }) : undefined;


        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.deleteContact.methodName;
    type Params = apiDeclaration.deleteContact.Params;
    type Response = apiDeclaration.deleteContact.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.contactRef instanceof Object &&
            (
                typeof params.contactRef["mem_index"] === "number" ||
                typeof params.contactRef["number"] === "string"
            )
        ),
        "handler": async ({ imsi, contactRef }, socket) => {

            const session = getAuthenticatedSession(socket);

            const userSim = await dbSemasim.getUserSims(session)
                .then(userSims => userSims
                    .filter(feTypes.UserSim.Usable.match)
                    .find(({ sim }) => sim.imsi === imsi)
                );


            if (!userSim) {

                throw new Error("User does not have access to this sim");

            }

            let contact: feTypes.UserSim.Contact | undefined;

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

                throw new Error("Referenced contact does not exist does not exist.");

            }

            let prQuery: Promise<gwTypes.Ua[]>;

            let storage: {
                mem_index: number;
                new_digest: string;
            } | undefined;

            if (contact.mem_index !== undefined) {

                //TODO: avoid var
                const resp = await gatewayRemoteApiCaller.deleteContact(
                    imsi, contact.mem_index
                );

                if (!resp) {
                    throw new Error("Delete contact failed on dongle");
                }

                storage = {
                    "mem_index": contact.mem_index,
                    "new_digest": resp.new_storage_digest
                };

                prQuery = dbSemasim.deleteSimContact(
                    imsi,
                    {
                        "mem_index": contact.mem_index,
                        "new_storage_digest": resp.new_storage_digest
                    }
                );

            } else {

                storage = undefined;

                prQuery = dbSemasim.deleteSimContact(
                    imsi,
                    { "number_raw": contact.number_raw }
                );

            }

            const uasRegisteredToSim = await prQuery;

            remoteApiCaller.notifyContactDeleted(
                {
                    imsi,
                    "number_raw": contact.number_raw,
                    storage
                },
                uasRegisteredToSim.filter(
                    ({ instance }) => session.shared.uaInstanceId !== instance
                )
            );

            pushNotifications.sendSafe(uasRegisteredToSim, { "type": "RELOAD CONFIG" });

            return { "new_digest": storage !== undefined ? storage.new_digest : undefined };

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.shouldAppendPromotionalMessage.methodName;
    type Params = apiDeclaration.shouldAppendPromotionalMessage.Params;
    type Response = apiDeclaration.shouldAppendPromotionalMessage.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => params === undefined,
        "handler": async (_params, socket) => {

            const session = getAuthenticatedSession(socket);

            return !(await stripe.isUserSubscribed(session));

        }
    };

    handlers[methodName] = handler;

}


