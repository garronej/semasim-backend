"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const sip_api_1 = require("../../../frontend/sip_api");
const feTypes = require("../../../frontend/types");
const dbSemasim = require("../../dbSemasim");
const dcSanityChecks = require("chan-dongle-extended-client/dist/lib/sanityChecks");
const gatewayRemoteApiCaller = require("../../toGateway/remoteApiCaller");
const remoteApiCaller = require("../remoteApiCaller");
const emailSender = require("../../emailSender");
const gateway_1 = require("../../../gateway");
const stripe = require("../../stripe");
const noThrow_1 = require("../../../tools/noThrow");
const socketSession_1 = require("../socketSession");
const tools_1 = require("../../../frontend/tools");
const getUserUas = noThrow_1.buildNoThrowProxyFunction(dbSemasim.getUserUas, dbSemasim);
const getUserSims = noThrow_1.buildNoThrowProxyFunction(dbSemasim.getUserSims, dbSemasim);
exports.handlers = {};
{
    const { methodName } = sip_api_1.api_decl_backendToUa.getUserSims;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            typeof params.includeContacts === "boolean"),
        "handler": async ({ includeContacts }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
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
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.unlockSim;
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
    const { methodName } = sip_api_1.api_decl_backendToUa.registerSim;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            dcSanityChecks.imei(params.imei) &&
            typeof params.friendlyName === "string"),
        "handler": async ({ imsi, imei, friendlyName }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            const dongleSipPasswordAndTowardSimEncryptKeyStr = await gatewayRemoteApiCaller.getDongleSipPasswordAndTowardSimEncryptKeyStr(imsi);
            tools_1.assert(dongleSipPasswordAndTowardSimEncryptKeyStr, "Dongle not found");
            const { dongle, sipPassword, towardSimEncryptKeyStr } = dongleSipPasswordAndTowardSimEncryptKeyStr;
            tools_1.assert(dongle.imei === imei, "Attack prevented");
            //NOTE: The user may have changer ip since he received the request
            //in this case the query will crash... not a big deal.
            const userUas = await dbSemasim.registerSim(session, dongle.sim, friendlyName, sipPassword, towardSimEncryptKeyStr, dongle, socket.remoteAddress, dongle.isGsmConnectivityOk, dongle.cellSignalStrength);
            getUserSims(session).then(userSims => {
                const userSim = userSims.find(({ sim }) => sim.imsi === imsi);
                tools_1.assert(!!userSim && feTypes.UserSim.Owned.match(userSim));
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
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.unregisterSim;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)),
        "handler": async ({ imsi }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            const { affectedUas, owner } = await dbSemasim.unregisterSim(session, imsi);
            const [userUas, otherUsersUas] = affectedUas
                .reduce(...tools_1.reducers.partition(({ userEmail }) => userEmail === session.shared.email));
            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "DELETE",
                    "cause": "USER UNREGISTER SIM",
                    imsi
                },
                "uas": userUas
            });
            remoteApiCaller.notifyUserSimChange({
                "params": Object.assign({ imsi }, session.user === owner.user ? ({
                    "type": "DELETE",
                    "cause": "PERMISSION LOSS",
                }) : ({
                    "type": "SHARED USER SET CHANGE",
                    "action": "REMOVE",
                    "targetSet": "CONFIRMED USERS",
                    "email": session.shared.email
                })),
                "uas": otherUsersUas
            });
            gatewayRemoteApiCaller.reNotifySimOnline(imsi);
            return undefined;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.rebootDongle;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)),
        "handler": async ({ imsi }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            //TODO: Reboot dongle should be by imei
            const isAllowedTo = await dbSemasim.getUserSims(session)
                .then(userSims => !!userSims.find(({ sim }) => sim.imsi === imsi));
            tools_1.assert(isAllowedTo, "user not allowed to reboot this dongle");
            const { isSuccess } = await gatewayRemoteApiCaller.rebootDongle(imsi);
            tools_1.assert(isSuccess, "Reboot dongle error");
            return undefined;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.shareSim;
    /** Assert user email not in the list and list not empty */
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            params.emails.reduce(...tools_1.reducers.and([
                arr => arr
                    .reduce(...tools_1.reducers.every(e => gateway_1.isValidEmail(e, "MUST BE LOWER CASE"))),
                arr => arr.length !== 0,
                arr => arr
                    .reduce(...tools_1.reducers.removeDuplicates())
                    .reduce(...tools_1.reducers.sameAs(arr))
            ])) &&
            typeof params.message === "string"),
        "handler": async ({ imsi, emails, message }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            tools_1.assert(!emails.includes(session.shared.email));
            const affectedUsers = await dbSemasim.shareSim(session, imsi, emails, message);
            getUserSims(session).then(async (userSims) => {
                const userSim = userSims.find(({ sim }) => sim.imsi === imsi);
                tools_1.assert(!!userSim && feTypes.UserSim.Owned.match(userSim));
                emailSender.sharingRequestSafe(session.shared.email, userSim, message, [
                    ...affectedUsers.notRegistered
                        .map(email => ({ email, "isRegistered": false })),
                    ...affectedUsers.registered
                        .map(({ shared: { email } }) => ({ email, "isRegistered": true }))
                ]);
                const newNotConfirmedEmails = [
                    ...affectedUsers.notRegistered,
                    ...affectedUsers.registered.map(({ shared: { email } }) => email)
                ];
                const { sharedWith } = userSim.ownership;
                const uas = await Promise.all([
                    session.shared.email,
                    ...[
                        ...sharedWith.confirmed,
                        ...sharedWith.notConfirmed,
                    ].filter(email => !newNotConfirmedEmails.includes(email))
                ].map(email => getUserUas(email))).then(arr => arr
                    .reduce((prev, curr) => [...curr, ...prev], []));
                newNotConfirmedEmails.forEach(email => remoteApiCaller.notifyUserSimChange({
                    "params": {
                        "type": "SHARED USER SET CHANGE",
                        imsi,
                        "action": "ADD",
                        "targetSet": "NOT CONFIRMED USERS",
                        "email": email
                    },
                    uas
                }));
            });
            affectedUsers.registered.forEach(auth => Promise.all([
                getUserSims(auth),
                getUserUas(auth.user)
            ]).then(([userSims, uas]) => {
                const userSim = userSims.find(({ sim }) => sim.imsi === imsi);
                tools_1.assert(!!userSim &&
                    feTypes.UserSim.Shared.NotConfirmed.match(userSim));
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
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.stopSharingSim;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            params.emails.reduce(...tools_1.reducers.and([
                arr => arr
                    .reduce(...tools_1.reducers.every(e => gateway_1.isValidEmail(e, "MUST BE LOWER CASE"))),
                arr => arr.length !== 0,
                arr => arr
                    .reduce(...tools_1.reducers.removeDuplicates())
                    .reduce(...tools_1.reducers.sameAs(arr))
            ]))),
        "handler": async ({ imsi, emails }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            tools_1.assert(!emails.includes(session.shared.email));
            const sharedWithBeforeConfirmed = await (async () => {
                const userSim = (await dbSemasim.getUserSims(session))
                    .find(({ sim }) => sim.imsi === imsi);
                tools_1.assert(!!userSim &&
                    feTypes.UserSim.Owned.match(userSim));
                return userSim.ownership.sharedWith.confirmed;
            })();
            const uasOfUsersThatNoLongerHaveAccessToTheSim = await dbSemasim.stopSharingSim(session, imsi, emails);
            if (uasOfUsersThatNoLongerHaveAccessToTheSim.length !== 0) {
                //NOTE: Will cause the sip password to be renewed and 
                //notified to all users that still own the sim.
                gatewayRemoteApiCaller.reNotifySimOnline(imsi);
            }
            getUserSims(session).then(async (userSims) => {
                const userSim = userSims.find(({ sim }) => sim.imsi === imsi);
                tools_1.assert(!!userSim &&
                    feTypes.UserSim.Owned.match(userSim));
                const uas = await Promise.all([
                    session.shared.email,
                    ...userSim.ownership.sharedWith.confirmed,
                    ...userSim.ownership.sharedWith.notConfirmed
                ].map(email => getUserUas(email))).then(arr => arr
                    .reduce((prev, curr) => [...curr, ...prev], []));
                uasOfUsersThatNoLongerHaveAccessToTheSim
                    .map(({ userEmail }) => userEmail)
                    .reduce(...tools_1.reducers.removeDuplicates())
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
                }));
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
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.changeSimFriendlyName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.friendlyName === "string"),
        "handler": async ({ imsi, friendlyName }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            const { uasOfUsersThatHaveAccessToTheSim } = await dbSemasim.setSimFriendlyName(session, imsi, friendlyName);
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
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.acceptSharingRequest;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.friendlyName === "string"),
        "handler": async ({ imsi, friendlyName }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            const { uasOfUsersThatHaveAccessToTheSim } = await dbSemasim.setSimFriendlyName(session, imsi, friendlyName);
            const [userUas, otherUsersUas] = uasOfUsersThatHaveAccessToTheSim
                .reduce(...tools_1.reducers.partition(({ userEmail }) => userEmail === session.shared.email));
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
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.rejectSharingRequest;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)),
        "handler": async ({ imsi }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            const { affectedUas } = await dbSemasim.unregisterSim(session, imsi);
            const [userUas, otherUsersUas] = affectedUas
                .reduce(...tools_1.reducers.partition(({ userEmail }) => userEmail === session.shared.email));
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
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.createContact;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.name === "string" &&
            typeof params.number_raw === "string"),
        "handler": async ({ imsi, name, number_raw }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            const userSim = await dbSemasim.getUserSims(session)
                .then(userSims => userSims
                .filter(feTypes.UserSim.Usable.match)
                .find(({ sim }) => sim.imsi === imsi));
            if (!userSim) {
                throw new Error("User does not have access to this sim");
            }
            if (!!userSim.phonebook.find(contact => contact.number_raw === number_raw)) {
                throw new Error("Already a contact with this number");
            }
            const storageInfos = await (userSim.sim.storage.infos.storageLeft === 0 ?
                undefined
                :
                    gatewayRemoteApiCaller.createContact(imsi, name, number_raw).then(resp => {
                        if (resp === undefined) {
                            return undefined;
                        }
                        const { new_storage_digest } = resp, rest = __rest(resp, ["new_storage_digest"]);
                        return Object.assign(Object.assign({}, rest), { "new_digest": new_storage_digest });
                    }));
            const uas = await dbSemasim.createOrUpdateSimContact(imsi, name, number_raw, storageInfos);
            //pushNotifications.sendSafe(uasRegisteredToSim, { "type": "RELOAD CONFIG" });
            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "CONTACT CREATED OR UPDATED",
                    imsi,
                    name,
                    number_raw,
                    "storage": storageInfos !== null && storageInfos !== void 0 ? storageInfos : undefined
                },
                uas
            });
            return undefined;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.updateContactName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.contactRef instanceof Object &&
            (typeof params.contactRef["mem_index"] === "number" ||
                typeof params.contactRef["number"] === "string") &&
            typeof params.newName === "string" &&
            params.newName !== ""),
        "handler": async ({ imsi, contactRef, newName }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            const userSim = await dbSemasim.getUserSims(session)
                .then(userSims => userSims
                .filter(feTypes.UserSim.Usable.match)
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
                return undefined;
            }
            let storageInfos;
            if (contact.mem_index !== undefined) {
                const resp = await gatewayRemoteApiCaller.updateContactName(imsi, contact.mem_index, newName);
                if (!resp) {
                    //TODO: the contact should maybe be updated anyway
                    throw new Error("update contact failed on the gateway");
                }
                storageInfos = {
                    "mem_index": contact.mem_index,
                    "name_as_stored": resp.new_name_as_stored,
                    "new_digest": resp.new_storage_digest
                };
            }
            else {
                storageInfos = undefined;
            }
            const uas = await dbSemasim.createOrUpdateSimContact(imsi, newName, contact.number_raw, storageInfos);
            remoteApiCaller.notifyUserSimChange({
                "params": {
                    "type": "CONTACT CREATED OR UPDATED",
                    imsi,
                    "name": newName,
                    "number_raw": contact.number_raw,
                    "storage": storageInfos !== null && storageInfos !== void 0 ? storageInfos : undefined
                },
                uas
            });
            return undefined;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.deleteContact;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.contactRef instanceof Object &&
            (typeof params.contactRef["mem_index"] === "number" ||
                typeof params.contactRef["number"] === "string")),
        "handler": async ({ imsi, contactRef }, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            const userSim = await dbSemasim.getUserSims(session)
                .then(userSims => userSims
                .filter(feTypes.UserSim.Usable.match)
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
                const resp = await gatewayRemoteApiCaller.deleteContact(imsi, contact.mem_index);
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
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = sip_api_1.api_decl_backendToUa.shouldAppendPromotionalMessage;
    const handler = {
        "sanityCheck": params => params === undefined,
        "handler": async (_params, socket) => {
            const session = socketSession_1.getAuthenticatedSession(socket);
            return !(await stripe.isUserSubscribed(session));
        }
    };
    exports.handlers[methodName] = handler;
}
