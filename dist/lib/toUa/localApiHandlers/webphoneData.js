"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sip_api_1 = require("../../../frontend/sip_api");
const sip = require("ts-sip");
const dcSanityChecks = require("chan-dongle-extended-client/dist/lib/sanityChecks");
const socketSession_1 = require("../socketSession");
const logger_1 = require("../../../tools/logger");
const debug = logger_1.logger.debugFactory();
function getSocketForIntegrationTests(sessionInfos) {
    const socket = { sessionInfos };
    return socket;
}
exports.getSocketForIntegrationTests = getSocketForIntegrationTests;
function getSessionInfos(socket) {
    if (!(socket instanceof sip.Socket)) {
        return socket.sessionInfos;
    }
    const { user, shared: { uaInstanceId } } = socketSession_1.getAuthenticatedSession(socket);
    return { user, uaInstanceId };
}
function getHandlers(dbWebphoneData, dbSemasim, uaRemoteApiCaller, debug_resolveOnlyOnceOtherUaHaveBeenNotified = false) {
    const makeDbRequestAndNotifyOtherUas = async (methodNameAndParams, socket, dbRequest) => {
        const sessionInfos = getSessionInfos(socket);
        const { isUnchanged } = await dbRequest(sessionInfos);
        if (isUnchanged) {
            return undefined;
        }
        const pr = dbSemasim.getUserUas(sessionInfos.user)
            .then(uas => uaRemoteApiCaller.wd_notifyActionFromOtherUa({
            methodNameAndParams,
            "uas": uas.filter(({ instance }) => instance !== sessionInfos.uaInstanceId)
        }))
            .catch(error => debug(error));
        if (debug_resolveOnlyOnceOtherUaHaveBeenNotified) {
            await pr;
        }
        return undefined;
    };
    const handlers = {};
    {
        const { methodName } = sip_api_1.api_decl_backendToUa.wd_getUserSimChats;
        const handler = {
            "sanityCheck": params => (params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.maxMessageCountByChat === "number"),
            "handler": (params, socket) => dbWebphoneData.getUserSimChats(getSessionInfos(socket).user, params.imsi, params.maxMessageCountByChat)
        };
        handlers[methodName] = handler;
    }
    {
        const { methodName } = sip_api_1.api_decl_backendToUa.wd_newChat;
        const handler = {
            "sanityCheck": params => (params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                params.contactNumber instanceof Object &&
                typeof params.contactNumber.encrypted_string === "string" &&
                params.contactName instanceof Object &&
                typeof params.contactName.encrypted_string === "string" &&
                params.contactIndexInSim instanceof Object &&
                typeof params.contactIndexInSim.encrypted_number_or_null === "string"),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas({ methodName, params }, socket, ({ user }) => dbWebphoneData.newChat(user, params.imsi, params.chatRef, params.contactNumber, params.contactName, params.contactIndexInSim))
        };
        handlers[methodName] = handler;
    }
    {
        const { methodName } = sip_api_1.api_decl_backendToUa.wd_fetchOlderMessages;
        const handler = {
            "sanityCheck": params => (params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                typeof params.olderThanTime === "number" &&
                typeof params.maxMessageCount === "number"),
            "handler": (params, socket) => dbWebphoneData.fetchOlderMessages(getSessionInfos(socket).user, params.imsi, params.chatRef, params.olderThanTime, params.maxMessageCount)
        };
        handlers[methodName] = handler;
    }
    {
        const { methodName } = sip_api_1.api_decl_backendToUa.wd_updateChatLastMessageSeen;
        const handler = {
            "sanityCheck": params => (params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                typeof params.refOfLastMessageSeen === "string"),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas({ methodName, params }, socket, ({ user }) => dbWebphoneData.updateChatLastMessageSeen(user, params.imsi, params.chatRef, params.refOfLastMessageSeen))
        };
        handlers[methodName] = handler;
    }
    {
        const { methodName } = sip_api_1.api_decl_backendToUa.wd_updateChatContactInfos;
        const handler = {
            "sanityCheck": params => (params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                (params.contactIndexInSim === undefined ||
                    params.contactIndexInSim instanceof Object &&
                        typeof params.contactIndexInSim.encrypted_number_or_null === "string") && (params.contactName === undefined ||
                params.contactName instanceof Object &&
                    typeof params.contactName.encrypted_string === "string")),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas({ methodName, params }, socket, ({ user }) => dbWebphoneData.updateChatContactNameOrIndexInSim(user, params.imsi, params.chatRef, params.contactIndexInSim, params.contactName))
        };
        handlers[methodName] = handler;
    }
    {
        const { methodName } = sip_api_1.api_decl_backendToUa.wd_destroyChat;
        const handler = {
            "sanityCheck": params => (params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string"),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas({ methodName, params }, socket, ({ user }) => dbWebphoneData.destroyChat(user, params.imsi, params.chatRef))
        };
        handlers[methodName] = handler;
    }
    {
        const { methodName } = sip_api_1.api_decl_backendToUa.wd_newMessage;
        const handler = {
            "sanityCheck": params => (params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" && (params.message instanceof Object &&
                typeof params.message.ref === "string" &&
                typeof params.message.time === "number" &&
                params.message.text instanceof Object &&
                typeof params.message.text.encrypted_string === "string" &&
                ((params.message.direction === "INCOMING" &&
                    typeof params.message.isNotification === "boolean")
                    ||
                        (params.message.direction === "OUTGOING" &&
                            params.message.status === "PENDING")))),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas({ methodName, params }, socket, ({ user }) => dbWebphoneData.newMessage(user, params.imsi, params.chatRef, params.message))
        };
        handlers[methodName] = handler;
    }
    {
        const { methodName } = sip_api_1.api_decl_backendToUa.wd_notifySendReportReceived;
        const handler = {
            "sanityCheck": params => (params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                typeof params.messageRef === "string" &&
                typeof params.isSentSuccessfully === "boolean"),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas({ methodName, params }, socket, ({ user }) => dbWebphoneData.updateMessageOnSendReport(user, params.imsi, params.chatRef, params.messageRef, params.isSentSuccessfully))
        };
        handlers[methodName] = handler;
    }
    {
        const { methodName } = sip_api_1.api_decl_backendToUa.wd_notifyStatusReportReceived;
        const handler = {
            "sanityCheck": params => (params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                typeof params.messageRef === "string" &&
                (typeof params.deliveredTime === "number" ||
                    params.deliveredTime === null) &&
                params.sentBy instanceof Object &&
                (params.sentBy.who === "USER" ||
                    params.sentBy.who === "OTHER" &&
                        params.sentBy.email instanceof Object &&
                        typeof params.sentBy.email.encrypted_string === "string")),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas({ methodName, params }, socket, ({ user }) => dbWebphoneData.updateMessageOnStatusReport(user, params.imsi, params.chatRef, params.messageRef, params.deliveredTime, params.sentBy))
        };
        handlers[methodName] = handler;
    }
    return handlers;
}
exports.getHandlers = getHandlers;
