

import { apiDeclaration } from "../../sip_api_declarations/backendToUa";
import * as connections from "./connections";
import * as sip from "ts-sip";
import * as dbSemasim from "../dbSemasim";
import { types as feTypes } from "../../semasim-frontend";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import * as pushNotifications from "../pushNotifications";
import * as gatewayRemoteApiCaller from "../toGateway/remoteApiCaller";
import * as remoteApiCaller from "./remoteApiCaller";
import * as dbWebphone from "../dbWebphone";
const uuidv3 = require("uuid/v3");

import { types as gwTypes, misc as gwMisc } from "../../semasim-gateway";

export const handlers: sip.api.Server.Handlers = {};

{

    const methodName = apiDeclaration.getUsableUserSims.methodName;
    type Params = apiDeclaration.getUsableUserSims.Params;
    type Response = apiDeclaration.getUsableUserSims.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => params === undefined,
        "handler": async (_params, socket) => {

            const auth = connections.getAuth(socket);

            const userSims = await dbSemasim.getUserSims(auth);

            //TODO: Create a SQL request that pull only usable sims
            return userSims.filter(feTypes.UserSim.Usable.match);

            //TODO: the sharing request should be sent

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

            const auth = connections.getAuth(socket);

            const {
                dongle, sipPassword
            } = await gatewayRemoteApiCaller.getDongleAndSipPassword(imsi)
                .then(resp => {

                    if (!!resp) {
                        return resp;
                    } else {
                        throw new Error("Dongle not found");
                    }

                });

            if (dongle.imei !== imei) {

                throw new Error("Attack detected");

            }

            //NOTE: The user may have changer ip since he received the request
            //in this case the query will crash... not a big deal.
            const userUas = await dbSemasim.registerSim(
                auth,
                dongle.sim,
                friendlyName,
                sipPassword,
                dongle,
                socket.remoteAddress
            );

            pushNotifications.send(userUas, "RELOAD CONFIG");

            //NOTE: Here we break the rule of gathering all db request
            //but as sim registration is not a so common operation it's not
            //a big deal.
            return dbSemasim.getUserSims(auth)
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

            const auth = connections.getAuth(socket);

            const affectedUas = await dbSemasim.unregisterSim(
                auth,
                imsi
            );

            remoteApiCaller.notifySimPermissionLost(
                imsi,
                affectedUas
                    .filter(({ platform }) => platform === "web")
                    .map(({ userEmail }) => userEmail)
                    .filter(email => email !== auth.email)
            );

            pushNotifications.send(affectedUas, "RELOAD CONFIG");

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

            const auth = connections.getAuth(socket);

            //TODO: Reboot dongle should be by imei

            const isAllowedTo = await dbSemasim.getUserSims(auth)
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

            const auth = connections.getAuth(socket);

            const affectedUsers = await dbSemasim.shareSim(
                auth, imsi, emails, message
            );

            for (const auth of affectedUsers.registered) {

                dbSemasim.getUserSims(auth)
                    .then(userSims => userSims
                        .filter(feTypes.UserSim.Shared.NotConfirmed.match)
                        .find(({ sim }) => sim.imsi === imsi)!
                    ).then(
                        userSim => remoteApiCaller.notifySimSharingRequest(userSim, auth.email)
                    )
                    ;

            }

            //TODO: send emails to notify new sim shared

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

            const auth = connections.getAuth(socket);

            const noLongerRegisteredUas = await dbSemasim.stopSharingSim(
                auth,
                imsi,
                emails
            );

            if (noLongerRegisteredUas.length !== 0) {

                gatewayRemoteApiCaller.reNotifySimOnline(imsi);

            }

            remoteApiCaller.notifySimPermissionLost(imsi, emails);

            pushNotifications.send(noLongerRegisteredUas, "RELOAD CONFIG");


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

            const auth = connections.getAuth(socket);

            const userUas = await dbSemasim.setSimFriendlyName(
                auth,
                imsi,
                friendlyName
            );

            pushNotifications.send(userUas, "RELOAD CONFIG");

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

            const auth = connections.getAuth(socket);

            const userUas = await dbSemasim.setSimFriendlyName(
                auth,
                imsi,
                friendlyName
            );

            pushNotifications.send(userUas, "RELOAD CONFIG");

            return dbSemasim.getUserSims(auth)
                .then(userSims => userSims
                    .filter(feTypes.UserSim.Shared.Confirmed.match)
                    .find(({ sim }) => sim.imsi === imsi)!
                ).then(({ ownership: { ownerEmail }, password }) => {

                    remoteApiCaller.notifySharingRequestResponse(
                        { imsi, "email": auth.email, "isAccepted": true },
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

            const auth = connections.getAuth(socket);

            await dbSemasim.unregisterSim(auth, imsi);

            dbSemasim.getSimOwner(imsi)
                .then(auth => auth!)
                .then(({ email: ownerEmail }) =>
                    remoteApiCaller.notifySharingRequestResponse(
                        { imsi, "email": auth.email, "isAccepted": false },
                        ownerEmail
                    )
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

            const auth = connections.getAuth(socket);

            const userSim = await dbSemasim.getUserSims(auth)
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

            pushNotifications.send(uasRegisteredToSim, "RELOAD CONFIG");

            remoteApiCaller.notifyContactCreatedOrUpdated(
                {
                    imsi,
                    name,
                    "number_raw": number,
                    "number_local_format": "",
                    "storage": storageInfos !== undefined ? ({
                        "mem_index": storageInfos.mem_index,
                        "name_as_stored": storageInfos.name_as_stored,
                        "new_digest": storageInfos.new_storage_digest
                    }) : undefined
                },
                uasRegisteredToSim
                    .filter(({ platform }) => platform === "web")
                    .map(({ userEmail }) => userEmail)
                    .filter(email => email !== auth.email)
            );

            return storageInfos !== undefined ? ({
                "mem_index": storageInfos.mem_index,
                "number_local_format": "",
                "name_as_stored_in_sim": storageInfos.name_as_stored
            }) : ({
                "mem_index": null,
                "number_local_format": ""
            });

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

            const auth = connections.getAuth(socket);

            const userSim = await dbSemasim.getUserSims(auth)
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

            const uasRegisteredToSim: gwTypes.Ua[] =
                await dbSemasim.createOrUpdateSimContact(
                    imsi, newName, contact.number_raw, storageInfos
                );


            pushNotifications.send(uasRegisteredToSim, "RELOAD CONFIG");

            remoteApiCaller.notifyContactCreatedOrUpdated(
                {
                    imsi,
                    "name": newName,
                    "number_raw": contact.number_raw,
                    "number_local_format": contact.number_local_format,
                    "storage": storageInfos !== undefined ? ({
                        "mem_index": storageInfos.mem_index,
                        "name_as_stored": storageInfos.name_as_stored,
                        "new_digest": storageInfos.new_storage_digest
                    }) : undefined
                },
                uasRegisteredToSim
                    .filter(({ platform }) => platform === "web")
                    .map(({ userEmail }) => userEmail)
                    .filter(email => email !== auth.email)
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

            const auth = connections.getAuth(socket);

            const userSim = await dbSemasim.getUserSims(auth)
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
                    .filter(email => email !== auth.email)
            );

            pushNotifications.send(uasRegisteredToSim, "RELOAD CONFIG");

            return { "new_digest": storage !== undefined ? storage.new_digest : undefined };

        }
    };

    handlers[methodName] = handler;

}

//Web UA data

export function getUserWebUaInstanceId(user: number): string {

    return `uuid:${uuidv3(`${user}`, "5e9906d0-07cc-11e8-83d5-fbdd176f7bb9")}`;

}

{

    const methodName = apiDeclaration.getUaInstanceIdAndEmail.methodName;
    type Params = apiDeclaration.getUaInstanceIdAndEmail.Params;
    type Response = apiDeclaration.getUaInstanceIdAndEmail.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => params === undefined,
        "handler": (_params, socket) => {

            const auth = connections.getAuth(socket);

            return Promise.resolve({
                "uaInstanceId": getUserWebUaInstanceId(auth.user),
                "email": auth.email
            });


        }
    };

    handlers[methodName] = handler;

}

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
            connections.getAuth(socket), imsi
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
            typeof params.contactNumber === "string" &&
            typeof params.contactName === "string" &&
            (
                typeof params.contactIndexInSim === "number" ||
                params.contactIndexInSim === null
            )
        ),
        "handler": (params, socket) => dbWebphone.newChat(
            connections.getAuth(socket),
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
                connections.getAuth(socket),
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
            typeof params.chat_id === "number" && (
                params.contactIndexInSim === undefined ||
                params.contactIndexInSim === null ||
                typeof params.contactIndexInSim === "number"
            ) && (
                params.contactName === undefined ||
                typeof params.contactName === "string"
            ) && (
                params.idOfLastMessageSeen === undefined ||
                params.idOfLastMessageSeen === null ||
                typeof params.idOfLastMessageSeen === "number"
            )
        ),
        "handler": (params, socket) => dbWebphone.updateChat(
            connections.getAuth(socket),
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
            connections.getAuth(socket),
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
            typeof params.chat_id === "number" && (() => {

                const m = params.message as feTypes.webphoneData.Message;

                return (
                    m instanceof Object &&
                    typeof m.time === "number" &&
                    typeof m.text === "string" &&
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
                                                typeof m.sentBy.email === "string"
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
            connections.getAuth(socket),
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
                connections.getAuth(socket),
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
                connections.getAuth(socket),
                message_id,
                deliveredTime
            ).then(() => undefined)
    };

    handlers[methodName] = handler;

}
