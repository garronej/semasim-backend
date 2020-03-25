
import { api_decl_backendToUa as apiDeclaration } from "../../../frontend/sip_api";
import * as feTypes from "../../../frontend/types";
import * as sip from "ts-sip";
import * as dbSemasim from "../../dbSemasim";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import * as gatewayRemoteApiCaller from "../../toGateway/remoteApiCaller";
import * as remoteApiCaller from "../remoteApiCaller";
import * as emailSender from "../../emailSender";
import { types as gwTypes, isValidEmail } from "../../../gateway";
import * as stripe from "../../stripe";
import { buildNoThrowProxyFunction } from "../../../tools/noThrow";
import { getAuthenticatedSession } from "../socketSession";
import { assert, reducers as _, typeGuard } from "../../../frontend/tools";


const getUserUas = buildNoThrowProxyFunction(dbSemasim.getUserUas, dbSemasim);
const getUserSims = buildNoThrowProxyFunction(dbSemasim.getUserSims, dbSemasim);


export const handlers: sip.api.Server.Handlers = {};


{

    const { methodName } = apiDeclaration.getUserSims;
    type Params = apiDeclaration.getUserSims.Params;
    type Response = apiDeclaration.getUserSims.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.includeContacts === "boolean"
        ),
        "handler": async ({ includeContacts }, socket) => {

            const session = getAuthenticatedSession(socket);

            const userSims = await dbSemasim.getUserSims(session);

            if (!includeContacts) {

                userSims.forEach(userSim => {
                    userSim.sim.storage.contacts = [];
                    userSim.phonebook = [];
                });

            }

            return userSims;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.unlockSim;
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

    const { methodName } = apiDeclaration.registerSim;
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

            const dongleSipPasswordAndTowardSimEncryptKeyStr =
                await gatewayRemoteApiCaller.getDongleSipPasswordAndTowardSimEncryptKeyStr(imsi);

            assert(dongleSipPasswordAndTowardSimEncryptKeyStr, "Dongle not found");

            const {
                dongle, sipPassword, towardSimEncryptKeyStr
            } = dongleSipPasswordAndTowardSimEncryptKeyStr;

            assert(dongle.imei === imei, "Attack prevented");

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

            getUserSims(session).then(userSims => {

                const userSim = userSims.find(({ sim }) => sim.imsi === imsi);

                assert(!!userSim && feTypes.UserSim.Owned.match(userSim));

                remoteApiCaller.notifyUserSimChange({
                    "params": {
                        "type": "NEW",
                        userSim
                    },
                    "uas": userUas
                });

            });

            //TODO: this should be an api method
            //pushNotifications.sendSafe(userUas, { "type": "RELOAD CONFIG" });

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.unregisterSim;
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

            const [userUas, otherUsersUas] =
            affectedUas
            .reduce(..._.partition<gwTypes.Ua>(({ userEmail }) => userEmail === session.shared.email))
            ;


            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "DELETE",
                    "cause": "USER UNREGISTER SIM",
                    imsi
                },
                "uas": userUas
            });

            remoteApiCaller.notifyUserSimChange({
                "params":
                {
                    imsi,
                    ...session.user === owner.user ? ({
                        "type": "DELETE",
                        "cause": "PERMISSION LOSS",
                    }) : ({
                        "type": "SHARED USER SET CHANGE",
                        "action": "REMOVE",
                        "targetSet": "CONFIRMED USERS",
                        "email": session.shared.email
                    })
                },
                "uas": otherUsersUas
            });


            gatewayRemoteApiCaller.reNotifySimOnline(imsi);

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.rebootDongle;
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

            assert(isAllowedTo, "user not allowed to reboot this dongle");

            const { isSuccess } = await gatewayRemoteApiCaller.rebootDongle(imsi);

            assert(isSuccess, "Reboot dongle error");

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.shareSim;
    type Params = apiDeclaration.shareSim.Params;
    type Response = apiDeclaration.shareSim.Response;


    /** Assert user email not in the list and list not empty */
    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            params.emails.reduce(..._.and<string>([
                arr => arr
                    .reduce(..._.every<string>(e => isValidEmail(e, "MUST BE LOWER CASE"))),
                arr => arr.length !== 0,
                arr => arr
                    .reduce(..._.removeDuplicates<string>())
                    .reduce(..._.sameAs(arr))
            ])) &&
            typeof params.message === "string"
        ),
        "handler": async ({ imsi, emails, message }, socket) => {

            const session = getAuthenticatedSession(socket);

            assert(!emails.includes(session.shared.email));

            const affectedUsers = await dbSemasim.shareSim(
                session, imsi, emails, message
            );

            getUserSims(session).then(async userSims => {

                const userSim = userSims.find(({ sim }) => sim.imsi === imsi);

                assert(!!userSim && feTypes.UserSim.Owned.match(userSim));

                emailSender.sharingRequestSafe(
                    session.shared.email,
                    userSim,
                    message,
                    [
                        ...affectedUsers.notRegistered
                            .map(email => ({ email, "isRegistered": false })),
                        ...affectedUsers.registered
                            .map(({ shared: { email } }) => ({ email, "isRegistered": true }))
                    ]
                );

                const newNotConfirmedEmails = [
                    ...affectedUsers.notRegistered,
                    ...affectedUsers.registered.map(({ shared: { email } }) => email)
                ];

                const { sharedWith } = userSim.ownership;

                const uas = await Promise.all(
                    [
                        session.shared.email,
                        ...[
                            ...sharedWith.confirmed,
                            ...sharedWith.notConfirmed,
                        ].filter(email => !newNotConfirmedEmails.includes(email))
                    ].map(email => getUserUas(email))
                ).then(arr => arr
                    .reduce<gwTypes.Ua[]>((prev, curr) => [...curr, ...prev], [])
                );


                newNotConfirmedEmails.forEach(email =>
                    remoteApiCaller.notifyUserSimChange({
                        "params": {
                            "type": "SHARED USER SET CHANGE",
                            imsi,
                            "action": "ADD",
                            "targetSet": "NOT CONFIRMED USERS",
                            "email": email
                        },
                        uas
                    })
                );



            });

            affectedUsers.registered.forEach(auth => Promise.all([
                getUserSims(auth),
                getUserUas(auth.user)
            ]).then(([userSims, uas]) => {

                const userSim = userSims.find(({ sim }) => sim.imsi === imsi);

                assert(
                    !!userSim &&
                    feTypes.UserSim.Shared.NotConfirmed.match(userSim)
                );

                remoteApiCaller.notifyUserSimChange({
                    "params": {
                        "type": "NEW",
                        userSim
                    },
                    uas
                });


            }));

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
            params.emails.reduce(..._.and<string>([
                arr => arr
                    .reduce(..._.every<string>(e => isValidEmail(e, "MUST BE LOWER CASE"))),
                arr => arr.length !== 0,
                arr => arr
                    .reduce(..._.removeDuplicates<string>())
                    .reduce(..._.sameAs(arr))
            ]))
        ),
        "handler": async ({ imsi, emails }, socket) => {

            const session = getAuthenticatedSession(socket);

            const sharedWithBeforeConfirmed = await (async () => {

                const userSim = (await dbSemasim.getUserSims(session))
                    .find(({ sim }) => sim.imsi === imsi)
                    ;

                assert(typeGuard<feTypes.UserSim.Owned>(userSim));

                assert(
                    emails.every(email =>
                        [
                            ...userSim.ownership.sharedWith.confirmed,
                            ...userSim.ownership.sharedWith.notConfirmed
                        ].includes(email)
                    ), 
                    "Can only stop sharing with users that share the SIM"
                );

                return userSim.ownership.sharedWith.confirmed;

            })();

            const uasOfUsersThatNoLongerHaveAccessToTheSim = await dbSemasim.stopSharingSim(
                session,
                imsi,
                emails
            );

            if (uasOfUsersThatNoLongerHaveAccessToTheSim.length !== 0) {

                //NOTE: Will cause the sip password to be renewed and 
                //notified to all users that still own the sim.
                gatewayRemoteApiCaller.reNotifySimOnline(imsi);

            }

            getUserSims(session).then(async userSims => {

                const userSim = userSims.find(({ sim }) => sim.imsi === imsi);

                assert(typeGuard<feTypes.UserSim.Owned>(userSim));

                const uas = await Promise.all(
                    [
                        session.shared.email,
                        ...userSim.ownership.sharedWith.confirmed,
                        ...userSim.ownership.sharedWith.notConfirmed
                    ].map(email => getUserUas(email))
                ).then(arr => arr
                    .reduce<gwTypes.Ua[]>((prev, curr) => [...curr, ...prev], [])
                );

                uasOfUsersThatNoLongerHaveAccessToTheSim
                    .map(({ userEmail }) => userEmail)
                    .reduce(..._.concat(emails))
                    .reduce(..._.removeDuplicates<string>())
                    .forEach(email => remoteApiCaller.notifyUserSimChange({
                        "params": {
                            "type": "SHARED USER SET CHANGE",
                            imsi,
                            "action": "REMOVE",
                            "targetSet": sharedWithBeforeConfirmed.includes(email) ?
                                "CONFIRMED USERS" : "NOT CONFIRMED USERS",
                            email
                        },
                        uas
                    }))
                    ;

            });

            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "DELETE",
                    "cause": "PERMISSION LOSS",
                    imsi
                },
                "uas": uasOfUsersThatNoLongerHaveAccessToTheSim
            });

            return undefined;


        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.changeSimFriendlyName;
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

            const { uasOfUsersThatHaveAccessToTheSim } = await dbSemasim.setSimFriendlyName(
                session,
                imsi,
                friendlyName
            );

            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "FRIENDLY NAME CHANGE",
                    imsi,
                    friendlyName
                },
                "uas": uasOfUsersThatHaveAccessToTheSim
                    .filter(({ userEmail }) => userEmail === session.shared.email)
            });

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

            const { uasOfUsersThatHaveAccessToTheSim } = await dbSemasim.setSimFriendlyName(
                session,
                imsi,
                friendlyName
            );


            const [userUas, otherUsersUas] = uasOfUsersThatHaveAccessToTheSim
                .reduce(..._.partition<gwTypes.Ua>(({ userEmail }) => userEmail === session.shared.email));


            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "SHARED USER SET CHANGE",
                    imsi,
                    "action": "MOVE TO CONFIRMED",
                    "targetSet": "CONFIRMED USERS",
                    "email": session.shared.email
                },
                "uas": otherUsersUas
            });


            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "IS NOW CONFIRMED",
                    imsi,
                    friendlyName
                },
                "uas": userUas
            });

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.rejectSharingRequest;
    type Params = apiDeclaration.rejectSharingRequest.Params;
    type Response = apiDeclaration.rejectSharingRequest.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": async ({ imsi }, socket) => {

            const session = getAuthenticatedSession(socket);

            const { affectedUas } = await dbSemasim.unregisterSim(session, imsi);

            const [userUas, otherUsersUas] = affectedUas
                .reduce(..._.partition<gwTypes.Ua>(({ userEmail }) => userEmail === session.shared.email))
                ;

            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "SHARED USER SET CHANGE",
                    imsi,
                    "action": "REMOVE",
                    "targetSet": "NOT CONFIRMED USERS",
                    "email": session.shared.email
                },
                "uas": otherUsersUas
            });


            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "DELETE",
                    "cause": "REJECT SHARING REQUEST",
                    imsi
                },
                "uas": userUas
            });

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.createContact;
    type Params = apiDeclaration.createContact.Params;
    type Response = apiDeclaration.createContact.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.name === "string" &&
            typeof params.number_raw === "string"
        ),
        "handler": async ({ imsi, name, number_raw }, socket) => {

            const session = getAuthenticatedSession(socket);

            const userSim = await dbSemasim.getUserSims(session)
                .then(userSims => userSims
                    .filter(feTypes.UserSim.Usable.match)
                    .find(({ sim }) => sim.imsi === imsi)
                );


            if (!userSim) {

                throw new Error("User does not have access to this sim");

            }

            if (!!userSim.phonebook.find(contact => contact.number_raw === number_raw)) {

                throw new Error("Already a contact with this number");

            }

            const storageInfos = await (
                userSim.sim.storage.infos.storageLeft === 0 ?
                    undefined
                    :
                    gatewayRemoteApiCaller.createContact(
                        imsi, name, number_raw
                    ).then(resp => {

                        if (resp === undefined) {
                            return undefined;
                        }

                        const { new_storage_digest, ...rest } = resp;

                        return { ...rest, "new_digest": new_storage_digest };

                    })
            );

            const uas = await dbSemasim.createOrUpdateSimContact(
                imsi, name, number_raw, storageInfos
            );

            //pushNotifications.sendSafe(uasRegisteredToSim, { "type": "RELOAD CONFIG" });

            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "CONTACT CREATED OR UPDATED",
                    imsi,
                    name,
                    number_raw,
                    "storage": storageInfos ?? undefined
                },
                uas
            });

            return undefined;


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

                return undefined;

            }

            let storageInfos: {
                mem_index: number;
                name_as_stored: string;
                new_digest: string;
            } | undefined;

            if (contact.mem_index !== undefined) {

                const resp = await gatewayRemoteApiCaller.updateContactName(
                    imsi, contact.mem_index, newName
                );

                if (!resp) {
                    //TODO: the contact should maybe be updated anyway
                    throw new Error("update contact failed on the gateway");
                }

                storageInfos = {
                    "mem_index": contact.mem_index,
                    "name_as_stored": resp.new_name_as_stored,
                    "new_digest": resp.new_storage_digest
                };

            } else {

                storageInfos = undefined;

            }

            const uas = await dbSemasim.createOrUpdateSimContact(
                imsi, newName, contact.number_raw, storageInfos
            );

            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "CONTACT CREATED OR UPDATED",
                    imsi,
                    "name": newName,
                    "number_raw": contact.number_raw,
                    "storage": storageInfos ?? undefined
                },
                uas
            });

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.deleteContact;
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

            const uas = await prQuery;

            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "CONTACT DELETED",
                    imsi,
                    "number_raw": contact.number_raw,
                    storage
                },
                "uas": uas
            });

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.shouldAppendPromotionalMessage;
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


