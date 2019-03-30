"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const backendToUa_1 = require("../../sip_api_declarations/backendToUa");
const connections = require("./connections");
const dbSemasim = require("../dbSemasim");
const frontend_1 = require("../../frontend");
const dcSanityChecks = require("chan-dongle-extended-client/dist/lib/sanityChecks");
const pushNotifications = require("../pushNotifications");
const gatewayRemoteApiCaller = require("../toGateway/remoteApiCaller");
const remoteApiCaller = require("./remoteApiCaller");
const dbWebphone = require("../dbWebphone");
const emailSender = require("../emailSender");
const uuidv3 = require("uuid/v3");
const gateway_1 = require("../../gateway");
const stripe = require("../stripe");
exports.handlers = {};
{
    const methodName = backendToUa_1.apiDeclaration.getUsableUserSims.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            typeof params.includeContacts === "boolean"),
        "handler": ({ includeContacts }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            //TODO: Create a SQL request that pull only usable sims
            const userSims = yield dbSemasim.getUserSims(auth)
                .then(userSims => userSims.filter(frontend_1.types.UserSim.Usable.match));
            if (!includeContacts) {
                for (const userSim of userSims) {
                    userSim.sim.storage.contacts = [];
                    userSim.phonebook = [];
                }
            }
            return userSims;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.unlockSim.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imei(params.imei) &&
            typeof params.pin === "string" &&
            !!params.pin.match(/^[0-9]{4}$/)),
        "handler": ({ imei, pin }, socket) => gatewayRemoteApiCaller.unlockSim(imei, pin, socket.remoteAddress)
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.registerSim.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            dcSanityChecks.imei(params.imei) &&
            typeof params.friendlyName === "string"),
        "handler": ({ imsi, imei, friendlyName }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            const { dongle, sipPassword } = yield gatewayRemoteApiCaller.getDongleAndSipPassword(imsi)
                .then(resp => {
                if (!!resp) {
                    return resp;
                }
                else {
                    throw new Error("Dongle not found");
                }
            });
            if (dongle.imei !== imei) {
                throw new Error("Attack detected");
            }
            //NOTE: The user may have changer ip since he received the request
            //in this case the query will crash... not a big deal.
            const userUas = yield dbSemasim.registerSim(auth, dongle.sim, friendlyName, sipPassword, dongle, socket.remoteAddress);
            pushNotifications.send(userUas, { "type": "RELOAD CONFIG" });
            //NOTE: Here we break the rule of gathering all db request
            //but as sim registration is not a so common operation it's not
            //a big deal.
            return dbSemasim.getUserSims(auth)
                .then(userSims => userSims
                .filter(frontend_1.types.UserSim.Owned.match)
                .find(({ sim }) => sim.imsi === imsi));
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.unregisterSim.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)),
        "handler": ({ imsi }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            const { affectedUas, owner } = yield dbSemasim.unregisterSim(auth, imsi);
            if (owner.user === auth.user) {
                /*
                notify sim permission lost to every user
                who shared this sim ( the owner of the sim excluded )
                */
                remoteApiCaller.notifySimPermissionLost(imsi, affectedUas
                    .filter(({ platform }) => platform === "web")
                    .map(({ userEmail }) => userEmail)
                    .filter(email => email !== auth.email));
            }
            else {
                remoteApiCaller.notifySharedSimUnregistered({ imsi, "email": auth.email }, owner.email);
            }
            pushNotifications.send(affectedUas, { "type": "RELOAD CONFIG" });
            gatewayRemoteApiCaller.reNotifySimOnline(imsi);
            return undefined;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.rebootDongle.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)),
        "handler": ({ imsi }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            //TODO: Reboot dongle should be by imei
            const isAllowedTo = yield dbSemasim.getUserSims(auth)
                .then(userSims => !!userSims.find(({ sim }) => sim.imsi === imsi));
            if (!isAllowedTo) {
                throw new Error("user not allowed to reboot this dongle");
            }
            const { isSuccess } = yield gatewayRemoteApiCaller.rebootDongle(imsi);
            if (!isSuccess) {
                throw new Error("Reboot dongle error");
            }
            return undefined;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.shareSim.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            !params.emails.find(email => !gateway_1.misc.isValidEmail(email)) &&
            typeof params.message === "string"),
        "handler": ({ imsi, emails, message }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            const affectedUsers = yield dbSemasim.shareSim(auth, imsi, emails, message);
            dbSemasim.getUserSims(auth).then(userSims => userSims
                .filter(frontend_1.types.UserSim.Owned.match)
                .find(({ sim }) => sim.imsi === imsi)).then(userSim => emailSender.sharingRequest(auth, userSim, message, [
                ...affectedUsers.notRegistered.map(email => ({ email, "isRegistered": false })),
                ...affectedUsers.registered.map(({ email }) => ({ email, "isRegistered": true }))
            ]));
            for (const auth of affectedUsers.registered) {
                dbSemasim.getUserSims(auth)
                    .then(userSims => userSims
                    .filter(frontend_1.types.UserSim.Shared.NotConfirmed.match)
                    .find(({ sim }) => sim.imsi === imsi)).then(userSim => remoteApiCaller.notifySimSharingRequest(userSim, auth.email));
            }
            return undefined;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.stopSharingSim.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            !params.emails.find(email => !gateway_1.misc.isValidEmail(email))),
        "handler": ({ imsi, emails }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            const noLongerRegisteredUas = yield dbSemasim.stopSharingSim(auth, imsi, emails);
            if (noLongerRegisteredUas.length !== 0) {
                gatewayRemoteApiCaller.reNotifySimOnline(imsi);
            }
            remoteApiCaller.notifySimPermissionLost(imsi, emails);
            pushNotifications.send(noLongerRegisteredUas, { "type": "RELOAD CONFIG" });
            return undefined;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.changeSimFriendlyName.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.friendlyName === "string"),
        "handler": ({ imsi, friendlyName }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            const userUas = yield dbSemasim.setSimFriendlyName(auth, imsi, friendlyName);
            pushNotifications.send(userUas, { "type": "RELOAD CONFIG" });
            return undefined;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.acceptSharingRequest.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.friendlyName === "string"),
        "handler": ({ imsi, friendlyName }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            const userUas = yield dbSemasim.setSimFriendlyName(auth, imsi, friendlyName);
            pushNotifications.send(userUas, { "type": "RELOAD CONFIG" });
            return dbSemasim.getUserSims(auth)
                .then(userSims => userSims
                .filter(frontend_1.types.UserSim.Shared.Confirmed.match)
                .find(({ sim }) => sim.imsi === imsi)).then(({ ownership: { ownerEmail }, password }) => {
                remoteApiCaller.notifySharingRequestResponse({ imsi, "email": auth.email, "isAccepted": true }, ownerEmail);
                return { password };
            });
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.rejectSharingRequest.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)),
        "handler": ({ imsi }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            const { owner } = yield dbSemasim.unregisterSim(auth, imsi);
            remoteApiCaller.notifySharingRequestResponse({ imsi, "email": auth.email, "isAccepted": false }, owner.email);
            return undefined;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.createContact.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.name === "string" &&
            typeof params.number === "string"),
        "handler": ({ imsi, name, number }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            const userSim = yield dbSemasim.getUserSims(auth)
                .then(userSims => userSims
                .filter(frontend_1.types.UserSim.Usable.match)
                .find(({ sim }) => sim.imsi === imsi));
            if (!userSim) {
                throw new Error("User does not have access to this sim");
            }
            if (!!userSim.phonebook.find(({ number_raw }) => number_raw === number)) {
                throw new Error("Already a contact with this number");
            }
            const storageInfos = yield Promise.resolve((() => {
                if (userSim.sim.storage.infos.storageLeft !== 0) {
                    return gatewayRemoteApiCaller.createContact(imsi, name, number);
                }
                return undefined;
            })());
            //TODO: this function should return number local format.
            const uasRegisteredToSim = yield dbSemasim.createOrUpdateSimContact(imsi, name, number, storageInfos);
            pushNotifications.send(uasRegisteredToSim, { "type": "RELOAD CONFIG" });
            remoteApiCaller.notifyContactCreatedOrUpdated({
                imsi,
                name,
                "number_raw": number,
                "storage": storageInfos !== undefined ? ({
                    "mem_index": storageInfos.mem_index,
                    "name_as_stored": storageInfos.name_as_stored,
                    "new_digest": storageInfos.new_storage_digest
                }) : undefined
            }, uasRegisteredToSim
                .filter(({ platform }) => platform === "web")
                .map(({ userEmail }) => userEmail)
                .filter(email => email !== auth.email));
            //TODO: see wtf with number local format here why the hell there isn't new_digest.
            return storageInfos !== undefined ? ({
                "mem_index": storageInfos.mem_index,
                "name_as_stored_in_sim": storageInfos.name_as_stored,
                "new_digest": storageInfos.new_storage_digest
            }) : undefined;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.updateContactName.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.contactRef instanceof Object &&
            (typeof params.contactRef["mem_index"] === "number" ||
                typeof params.contactRef["number"] === "string") &&
            typeof params.newName === "string" &&
            params.newName !== ""),
        "handler": ({ imsi, contactRef, newName }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            const userSim = yield dbSemasim.getUserSims(auth)
                .then(userSims => userSims
                .filter(frontend_1.types.UserSim.Usable.match)
                .find(({ sim }) => sim.imsi === imsi));
            if (!userSim) {
                throw new Error("User does not have access to this sim");
            }
            let contact;
            if ("mem_index" in contactRef) {
                contact = userSim.phonebook.find(({ mem_index }) => mem_index === contactRef.mem_index);
            }
            else {
                contact = userSim.phonebook.find(({ number_raw }) => number_raw === contactRef.number);
            }
            if (!contact) {
                throw new Error("Referenced contact does not exist does not exist.");
            }
            if (contact.name === newName) {
                //No need to update contact, name unchanged
                return contact.mem_index !== undefined ?
                    ({
                        "name_as_stored_in_sim": userSim.sim.storage.contacts
                            .find(({ index }) => index === contact.mem_index).name,
                        "new_digest": userSim.sim.storage.digest
                    }) : undefined;
            }
            let storageInfos;
            if (contact.mem_index !== undefined) {
                const resp = yield gatewayRemoteApiCaller.updateContactName(imsi, contact.mem_index, newName);
                if (resp) {
                    storageInfos = {
                        "mem_index": contact.mem_index,
                        "name_as_stored": resp.new_name_as_stored,
                        "new_storage_digest": resp.new_storage_digest
                    };
                }
                else {
                    //TODO: the contact should maybe be updated anyway
                    throw new Error("update contact failed on the gateway");
                }
            }
            else {
                storageInfos = undefined;
            }
            const uasRegisteredToSim = yield dbSemasim.createOrUpdateSimContact(imsi, newName, contact.number_raw, storageInfos);
            pushNotifications.send(uasRegisteredToSim, { "type": "RELOAD CONFIG" });
            remoteApiCaller.notifyContactCreatedOrUpdated({
                imsi,
                "name": newName,
                "number_raw": contact.number_raw,
                "storage": storageInfos !== undefined ? ({
                    "mem_index": storageInfos.mem_index,
                    "name_as_stored": storageInfos.name_as_stored,
                    "new_digest": storageInfos.new_storage_digest
                }) : undefined
            }, uasRegisteredToSim
                .filter(({ platform }) => platform === "web")
                .map(({ userEmail }) => userEmail)
                .filter(email => email !== auth.email));
            return storageInfos !== undefined ?
                ({
                    "name_as_stored_in_sim": storageInfos.name_as_stored,
                    "new_digest": storageInfos.new_storage_digest
                }) : undefined;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.deleteContact.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.contactRef instanceof Object &&
            (typeof params.contactRef["mem_index"] === "number" ||
                typeof params.contactRef["number"] === "string")),
        "handler": ({ imsi, contactRef }, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            const userSim = yield dbSemasim.getUserSims(auth)
                .then(userSims => userSims
                .filter(frontend_1.types.UserSim.Usable.match)
                .find(({ sim }) => sim.imsi === imsi));
            if (!userSim) {
                throw new Error("User does not have access to this sim");
            }
            let contact;
            if ("mem_index" in contactRef) {
                contact = userSim.phonebook.find(({ mem_index }) => mem_index === contactRef.mem_index);
            }
            else {
                contact = userSim.phonebook.find(({ number_raw }) => number_raw === contactRef.number);
            }
            if (!contact) {
                throw new Error("Referenced contact does not exist does not exist.");
            }
            let prQuery;
            let storage;
            if (contact.mem_index !== undefined) {
                //TODO: avoid var
                const resp = yield gatewayRemoteApiCaller.deleteContact(imsi, contact.mem_index);
                if (!resp) {
                    throw new Error("Delete contact failed on dongle");
                }
                storage = {
                    "mem_index": contact.mem_index,
                    "new_digest": resp.new_storage_digest
                };
                prQuery = dbSemasim.deleteSimContact(imsi, {
                    "mem_index": contact.mem_index,
                    "new_storage_digest": resp.new_storage_digest
                });
            }
            else {
                storage = undefined;
                prQuery = dbSemasim.deleteSimContact(imsi, { "number_raw": contact.number_raw });
            }
            const uasRegisteredToSim = yield prQuery;
            remoteApiCaller.notifyContactDeleted({
                imsi,
                "number_raw": contact.number_raw,
                storage
            }, uasRegisteredToSim
                .filter(({ platform }) => platform === "web")
                .map(({ userEmail }) => userEmail)
                .filter(email => email !== auth.email));
            pushNotifications.send(uasRegisteredToSim, { "type": "RELOAD CONFIG" });
            return { "new_digest": storage !== undefined ? storage.new_digest : undefined };
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.shouldAppendPromotionalMessage.methodName;
    const handler = {
        "sanityCheck": params => params === undefined,
        "handler": (_params, socket) => __awaiter(this, void 0, void 0, function* () {
            const auth = connections.getAuth(socket);
            return !(yield stripe.isUserSubscribed(auth));
        })
    };
    exports.handlers[methodName] = handler;
}
//Web UA data
/**
 format: `"<urn:uuid:f0c12631-a721-3da9-aa41-7122952b90ba>"`
*/
function getUserWebUaInstanceId(user) {
    return `"<urn:uuid:${uuidv3(`${user}`, "5e9906d0-07cc-11e8-83d5-fbdd176f7bb9")}>"`;
}
exports.getUserWebUaInstanceId = getUserWebUaInstanceId;
{
    const methodName = backendToUa_1.apiDeclaration.getUaInstanceId.methodName;
    const handler = {
        "sanityCheck": params => params === undefined,
        "handler": (_params, socket) => {
            const auth = connections.getAuth(socket);
            return Promise.resolve({
                "uaInstanceId": getUserWebUaInstanceId(auth.user),
                "email": auth.email
            });
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.getOrCreateInstance.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)),
        "handler": ({ imsi }, socket) => dbWebphone.getOrCreateInstance(connections.getAuth(socket), imsi)
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.newChat.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            typeof params.instance_id === "number" &&
            typeof params.contactNumber === "string" &&
            typeof params.contactName === "string" &&
            (typeof params.contactIndexInSim === "number" ||
                params.contactIndexInSim === null)),
        "handler": (params, socket) => dbWebphone.newChat(connections.getAuth(socket), params.instance_id, params.contactNumber, params.contactName, params.contactIndexInSim)
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.fetchOlderMessages.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            typeof params.chat_id === "number" &&
            typeof params.olderThanMessageId === "number"),
        "handler": ({ chat_id, olderThanMessageId }, socket) => dbWebphone.fetchOlderMessages(connections.getAuth(socket), chat_id, olderThanMessageId)
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.updateChat.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            typeof params.chat_id === "number" && (params.contactIndexInSim === undefined ||
            params.contactIndexInSim === null ||
            typeof params.contactIndexInSim === "number") && (params.contactName === undefined ||
            typeof params.contactName === "string") && (params.idOfLastMessageSeen === undefined ||
            params.idOfLastMessageSeen === null ||
            typeof params.idOfLastMessageSeen === "number")),
        "handler": (params, socket) => dbWebphone.updateChat(connections.getAuth(socket), params.chat_id, params.contactIndexInSim, params.contactName, params.idOfLastMessageSeen).then(() => undefined)
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.destroyChat.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            typeof params.chat_id === "number"),
        "handler": ({ chat_id }, socket) => dbWebphone.destroyChat(connections.getAuth(socket), chat_id).then(() => undefined)
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.newMessage.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            typeof params.chat_id === "number" && (() => {
            const m = params.message;
            return (m instanceof Object &&
                typeof m.time === "number" &&
                typeof m.text === "string" &&
                ((m.direction === "INCOMING" &&
                    typeof m.isNotification === "boolean")
                    ||
                        (m.direction === "OUTGOING" && ((m.status === "PENDING" &&
                            true) || (m.status === "SEND REPORT RECEIVED" &&
                            typeof m.isSentSuccessfully === "boolean") || (m.status === "STATUS REPORT RECEIVED" &&
                            (typeof m.deliveredTime === "number" ||
                                m.deliveredTime === null) && (m.sentBy instanceof Object &&
                            (m.sentBy.who === "USER" ||
                                (m.sentBy.who === "OTHER" &&
                                    typeof m.sentBy.email === "string"))))))));
        })()),
        "handler": ({ chat_id, message }, socket) => dbWebphone.newMessage(connections.getAuth(socket), chat_id, message)
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.notifySendReportReceived.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            typeof params.message_id === "number" &&
            typeof params.isSentSuccessfully === "boolean"),
        "handler": ({ message_id, isSentSuccessfully }, socket) => dbWebphone.updateMessageOnSendReport(connections.getAuth(socket), message_id, isSentSuccessfully).then(() => undefined)
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.notifyStatusReportReceived.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            typeof params.message_id === "number" &&
            (typeof params.deliveredTime === "number" ||
                params.deliveredTime === null)),
        "handler": ({ message_id, deliveredTime }, socket) => dbWebphone.updateMessageOnStatusReport(connections.getAuth(socket), message_id, deliveredTime).then(() => undefined)
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToUa_1.apiDeclaration.notifyStatusReportReceived.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            typeof params.message_id === "number" &&
            (typeof params.deliveredTime === "number" ||
                params.deliveredTime === null)),
        "handler": ({ message_id, deliveredTime }, socket) => dbWebphone.updateMessageOnStatusReport(connections.getAuth(socket), message_id, deliveredTime).then(() => undefined)
    };
    exports.handlers[methodName] = handler;
}
