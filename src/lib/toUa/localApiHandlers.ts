import { apiDeclaration } from "../../sip_api_declarations/backendToUa";
import * as connections from "./connections";
import * as sip from "ts-sip";
import * as dbSemasim from "../dbSemasim";
import { types as feTypes, wd } from "../../frontend";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import * as pushNotifications from "../pushNotifications";
import * as gatewayRemoteApiCaller from "../toGateway/remoteApiCaller";
import * as remoteApiCaller from "./remoteApiCaller";
import * as dbWebphone from "../dbWebphone";
import * as emailSender from "../emailSender";
import * as sessionManager from "../web/sessionManager";
import { types as gwTypes, misc as gwMisc } from "../../gateway";
import * as stripe from "../stripe";

export const handlers: sip.api.Server.Handlers = {};

/** Throw if session object associated with the connection is no longer authenticated. */
function getAuthenticatedSession(socket: sip.Socket): sessionManager.AuthenticatedSession {

    const session = connections.getSession(socket);

    if (!sessionManager.isAuthenticated(session)) {
        throw new Error("Connection authentication no longer valid");
    }

    return session;

}

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

            pushNotifications.send(userUas, { "type": "RELOAD CONFIG" });

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

            if (owner.user === session.user) {

                /*
                notify sim permission lost to every user
                who shared this sim ( the owner of the sim excluded )
                */
                remoteApiCaller.notifySimPermissionLost(
                    imsi,
                    affectedUas
                        .filter(({ platform }) => platform === "web")
                        .map(({ userEmail }) => userEmail)
                        .filter(email => email !== session.shared.email)
                );

            } else {

                remoteApiCaller.notifySharedSimUnregistered(
                    { imsi, "email": session.shared.email },
                    owner.shared.email
                );

            }

            pushNotifications.send(affectedUas, { "type": "RELOAD CONFIG" });

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

    const methodName = apiDeclaration.shareSim.methodName;
    type Params = apiDeclaration.shareSim.Params;
    type Response = apiDeclaration.shareSim.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            !params.emails.find(email => !gwMisc.isValidEmail(email)) &&
            typeof params.message === "string"
        ),
        "handler": async ({ imsi, emails, message }, socket) => {

            const session = getAuthenticatedSession(socket);

            const affectedUsers = await dbSemasim.shareSim(
                session, imsi, emails, message
            );

            dbSemasim.getUserSims(session).then(
                userSims => userSims
                    .filter(feTypes.UserSim.Owned.match)
                    .find(({ sim }) => sim.imsi === imsi)!
            ).then(userSim => emailSender.sharingRequest(
                session.shared.email,
                userSim,
                message, [
                    ...affectedUsers.notRegistered.map(email => ({ email, "isRegistered": false })),
                    ...affectedUsers.registered.map(({ shared: { email } }) => ({ email, "isRegistered": true }))
                ]
            ));

            for (const auth of affectedUsers.registered) {

                dbSemasim.getUserSims(auth)
                    .then(userSims => userSims
                        .filter(feTypes.UserSim.Shared.NotConfirmed.match)
                        .find(({ sim }) => sim.imsi === imsi)!
                    ).then(
                        userSim => remoteApiCaller.notifySimSharingRequest(userSim, auth.shared.email)
                    )
                    ;

            }

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.stopSharingSim.methodName;
    type Params = apiDeclaration.stopSharingSim.Params;
    type Response = apiDeclaration.stopSharingSim.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            !params.emails.find(email => !gwMisc.isValidEmail(email))
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

            remoteApiCaller.notifySimPermissionLost(imsi, emails);

            pushNotifications.send(noLongerRegisteredUas, { "type": "RELOAD CONFIG" });

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

            pushNotifications.send(userUas, { "type": "RELOAD CONFIG" });

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.acceptSharingRequest.methodName;
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

            pushNotifications.send(userUas, { "type": "RELOAD CONFIG" });

            return dbSemasim.getUserSims(session)
                .then(userSims => userSims
                    .filter(feTypes.UserSim.Shared.Confirmed.match)
                    .find(({ sim }) => sim.imsi === imsi)!
                ).then(({ ownership: { ownerEmail }, password }) => {

                    remoteApiCaller.notifySharingRequestResponse(
                        { imsi, "email": session.shared.email, "isAccepted": true },
                        ownerEmail
                    )

                    return { password };

                })
                ;

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
                owner.shared.email
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

            pushNotifications.send(uasRegisteredToSim, { "type": "RELOAD CONFIG" });

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
                uasRegisteredToSim
                    .filter(({ platform }) => platform === "web")
                    .map(({ userEmail }) => userEmail)
                    .filter(email => email !== session.shared.email)
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

    const methodName = apiDeclaration.updateContactName.methodName;
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

            pushNotifications.send(uasRegisteredToSim, { "type": "RELOAD CONFIG" });

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
                uasRegisteredToSim
                    .filter(({ platform }) => platform === "web")
                    .map(({ userEmail }) => userEmail)
                    .filter(email => email !== session.shared.email)
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
                uasRegisteredToSim
                    .filter(({ platform }) => platform === "web")
                    .map(({ userEmail }) => userEmail)
                    .filter(email => email !== session.shared.email)
            );

            pushNotifications.send(uasRegisteredToSim, { "type": "RELOAD CONFIG" });

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




//Web UA data

{

    const methodName = apiDeclaration.getOrCreateInstance.methodName;
    type Params = apiDeclaration.getOrCreateInstance.Params;
    type Response = apiDeclaration.getOrCreateInstance.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": ({ imsi }, socket) => dbWebphone.getOrCreateInstance(
            getAuthenticatedSession(socket).user, 
            imsi
        )
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.newChat.methodName;
    type Params = apiDeclaration.newChat.Params;
    type Response = apiDeclaration.newChat.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.instance_id === "number" &&
            params.contactNumber instanceof Object &&
            typeof params.contactNumber.encrypted_string === "string" &&
            params.contactName instanceof Object &&
            typeof params.contactName.encrypted_string === "string" &&
            params.contactIndexInSim instanceof Object &&
            typeof params.contactIndexInSim.encrypted_number_or_null === "string"
        ),
        "handler": (params, socket) => dbWebphone.newChat(
            getAuthenticatedSession(socket).user,
            params.instance_id,
            params.contactNumber,
            params.contactName,
            params.contactIndexInSim
        )
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.fetchOlderMessages.methodName;
    type Params = apiDeclaration.fetchOlderMessages.Params;
    type Response = apiDeclaration.fetchOlderMessages.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.chat_id === "number" &&
            typeof params.olderThanMessageId === "number"
        ),
        "handler": ({ chat_id, olderThanMessageId }, socket) =>
            dbWebphone.fetchOlderMessages(
                getAuthenticatedSession(socket).user,
                chat_id,
                olderThanMessageId
            )
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.updateChat.methodName;
    type Params = apiDeclaration.updateChat.Params;
    type Response = apiDeclaration.updateChat.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.chat_id === "number" &&
            (
                params.contactIndexInSim === undefined ||
                params.contactIndexInSim instanceof Object &&
                typeof params.contactIndexInSim.encrypted_number_or_null === "string"
            ) && (
                params.contactName === undefined ||
                params.contactName instanceof Object &&
                typeof params.contactName.encrypted_string === "string"
            ) && (
                params.idOfLastMessageSeen === undefined ||
                params.idOfLastMessageSeen === null ||
                typeof params.idOfLastMessageSeen === "number"
            )
        ),
        "handler": (params, socket) => dbWebphone.updateChat(
            getAuthenticatedSession(socket).user,
            params.chat_id,
            params.contactIndexInSim,
            params.contactName,
            params.idOfLastMessageSeen
        ).then(() => undefined)
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.destroyChat.methodName;
    type Params = apiDeclaration.destroyChat.Params;
    type Response = apiDeclaration.destroyChat.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.chat_id === "number"
        ),
        "handler": ({ chat_id }, socket) => dbWebphone.destroyChat(
            getAuthenticatedSession(socket).user,
            chat_id
        ).then(() => undefined)
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.newMessage.methodName;
    type Params = apiDeclaration.newMessage.Params;
    type Response = apiDeclaration.newMessage.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.chat_id === "number" &&
            (() => {

                const m = params.message as wd.Message<"ENCRYPTED">;

                return (
                    m instanceof Object &&
                    typeof m.time === "number" &&
                    m.text instanceof Object &&
                    typeof m.text.encrypted_string === "string" &&
                    (
                        (
                            m.direction === "INCOMING" &&
                            typeof m.isNotification === "boolean"
                        )
                        ||
                        (
                            m.direction === "OUTGOING" && (
                                (
                                    m.status === "PENDING" &&
                                    true
                                ) || (
                                    m.status === "SEND REPORT RECEIVED" &&
                                    typeof m.isSentSuccessfully === "boolean"
                                ) || (
                                    m.status === "STATUS REPORT RECEIVED" &&
                                    (
                                        typeof m.deliveredTime === "number" ||
                                        m.deliveredTime === null
                                    ) && (
                                        m.sentBy instanceof Object &&
                                        (
                                            m.sentBy.who === "USER" ||
                                            (
                                                m.sentBy.who === "OTHER" &&
                                                m.sentBy.email instanceof Object &&
                                                typeof m.sentBy.email.encrypted_string === "string"
                                            )
                                        )
                                    )

                                )
                            )
                        )
                    )
                );

            })()
        ),
        "handler": ({ chat_id, message }, socket) => dbWebphone.newMessage(
            getAuthenticatedSession(socket).user,
            chat_id,
            message
        )
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.notifySendReportReceived.methodName;
    type Params = apiDeclaration.notifySendReportReceived.Params;
    type Response = apiDeclaration.notifySendReportReceived.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.message_id === "number" &&
            typeof params.isSentSuccessfully === "boolean"
        ),
        "handler": ({ message_id, isSentSuccessfully }, socket) =>
            dbWebphone.updateMessageOnSendReport(
                getAuthenticatedSession(socket).user,
                message_id,
                isSentSuccessfully
            ).then(() => undefined)
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.notifyStatusReportReceived.methodName;
    type Params = apiDeclaration.notifyStatusReportReceived.Params;
    type Response = apiDeclaration.notifyStatusReportReceived.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.message_id === "number" &&
            (
                typeof params.deliveredTime === "number" ||
                params.deliveredTime === null
            )
        ),
        "handler": ({ message_id, deliveredTime }, socket) =>
            dbWebphone.updateMessageOnStatusReport(
                getAuthenticatedSession(socket).user,
                message_id,
                deliveredTime
            ).then(() => undefined)
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.notifyStatusReportReceived.methodName;
    type Params = apiDeclaration.notifyStatusReportReceived.Params;
    type Response = apiDeclaration.notifyStatusReportReceived.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.message_id === "number" &&
            (
                typeof params.deliveredTime === "number" ||
                params.deliveredTime === null
            )
        ),
        "handler": ({ message_id, deliveredTime }, socket) =>
            dbWebphone.updateMessageOnStatusReport(
                getAuthenticatedSession(socket).user,
                message_id,
                deliveredTime
            ).then(() => undefined)
    };

    handlers[methodName] = handler;

}
