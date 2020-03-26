
import { api_decl_backendToUa as apiDeclaration} from "../../../frontend/sip_api";
import * as sip from "ts-sip";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import { getAuthenticatedSession } from "../socketSession";
import { logger } from "../../../tools/logger";

const debug= logger.debugFactory();


export type SessionInfos = { user: number; uaInstanceId: string; };

export type FakeSocket = { sessionInfos: SessionInfos; };

export function getSocketForIntegrationTests(sessionInfos: SessionInfos): FakeSocket & sip.Socket {

    const socket: FakeSocket = { sessionInfos };

    return socket as any;

}

function getSessionInfos(socket: sip.Socket | FakeSocket): SessionInfos {

    if( !(socket instanceof sip.Socket) ){
        return socket.sessionInfos;
    }

    const { user, shared: { uaInstanceId } } = getAuthenticatedSession(socket);

    return { user, uaInstanceId };

}


export function getHandlers(
    dbWebphoneData: ReturnType<typeof import("../../dbWebphoneData/impl").getApi>,
    dbSemasim: { getUserUas: (typeof import("../../dbSemasim"))["getUserUas"]; },
    uaRemoteApiCaller: Pick<typeof import("../remoteApiCaller"), "wd_notifyActionFromOtherUa">,
    debug_resolveOnlyOnceOtherUaHaveBeenNotified = false
): sip.api.Server.Handlers {

    const makeDbRequestAndNotifyOtherUas = async (
        methodNameAndParams: Parameters<(typeof uaRemoteApiCaller)["wd_notifyActionFromOtherUa"]>[0]["methodNameAndParams"],
        socket: sip.Socket,
        dbRequest: (sessionInfos: SessionInfos) => Promise<{ isUnchanged: boolean; }>
    ): Promise<undefined> => {

        const sessionInfos = getSessionInfos(socket);

        const { isUnchanged } = await dbRequest(sessionInfos);

        if (isUnchanged) {
            return undefined;
        }

        const pr= dbSemasim.getUserUas(sessionInfos.user)
            .then(
                uas => uaRemoteApiCaller.wd_notifyActionFromOtherUa({
                    methodNameAndParams,
                    "uas": uas.filter(({ instance }) => instance !== sessionInfos.uaInstanceId)
                })
            )
            .catch(error => debug(error))
            ;

        if( debug_resolveOnlyOnceOtherUaHaveBeenNotified ){
            await pr;
        }

        return undefined;

    };

    const handlers: sip.api.Server.Handlers = {};

    {

        const { methodName } = apiDeclaration.wd_getUserSimChats;
        type Params = apiDeclaration.wd_getUserSimChats.Params;
        type Response = apiDeclaration.wd_getUserSimChats.Response;

        const handler: sip.api.Server.Handler<Params, Response> = {
            "sanityCheck": params => (
                params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.maxMessageCountByChat === "number"
            ),
            "handler": (params, socket) => dbWebphoneData.getUserSimChats(
                getSessionInfos(socket).user,
                params.imsi,
                params.maxMessageCountByChat
            )
        };

        handlers[methodName] = handler;

    }

    {

        const { methodName } = apiDeclaration.wd_newChat;
        type Params = apiDeclaration.wd_newChat.Params;
        type Response = apiDeclaration.wd_newChat.Response;

        const handler: sip.api.Server.Handler<Params, Response> = {
            "sanityCheck": params => (
                params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                params.contactNumber instanceof Object &&
                typeof params.contactNumber.encrypted_string === "string" &&
                params.contactName instanceof Object &&
                typeof params.contactName.encrypted_string === "string" &&
                params.contactIndexInSim instanceof Object &&
                typeof params.contactIndexInSim.encrypted_number_or_null === "string"
            ),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas(
                { methodName, params },
                socket,
                ({ user }) => dbWebphoneData.newChat(
                    user,
                    params.imsi,
                    params.chatRef,
                    params.contactNumber,
                    params.contactName,
                    params.contactIndexInSim
                )
            )
        };

        handlers[methodName] = handler;

    }

    {

        const { methodName } = apiDeclaration.wd_fetchOlderMessages;
        type Params = apiDeclaration.wd_fetchOlderMessages.Params;
        type Response = apiDeclaration.wd_fetchOlderMessages.Response;

        const handler: sip.api.Server.Handler<Params, Response> = {
            "sanityCheck": params => (
                params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                typeof params.olderThanTime === "number" &&
                typeof params.maxMessageCount === "number"
            ),
            "handler": (params, socket) =>
                dbWebphoneData.fetchOlderMessages(
                    getSessionInfos(socket).user,
                    params.imsi,
                    params.chatRef,
                    params.olderThanTime,
                    params.maxMessageCount
                )
        };

        handlers[methodName] = handler;

    }

    {

        const { methodName } = apiDeclaration.wd_updateChatLastMessageSeen;
        type Params = apiDeclaration.wd_updateChatLastMessageSeen.Params;
        type Response = apiDeclaration.wd_updateChatLastMessageSeen.Response;

        const handler: sip.api.Server.Handler<Params, Response> = {
            "sanityCheck": params => (
                params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                typeof params.refOfLastMessageSeen === "string"
            ),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas(
                { methodName, params },
                socket,
                ({ user }) => dbWebphoneData.updateChatLastMessageSeen(
                    user,
                    params.imsi,
                    params.chatRef,
                    params.refOfLastMessageSeen
                )
            )
        };

        handlers[methodName] = handler;

    }

    {

        const { methodName } = apiDeclaration.wd_updateChatContactInfos;
        type Params = apiDeclaration.wd_updateChatContactInfos.Params;
        type Response = apiDeclaration.wd_updateChatContactInfos.Response;

        const handler: sip.api.Server.Handler<Params, Response> = {
            "sanityCheck": params => (
                params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                (
                    params.contactIndexInSim === undefined ||
                    params.contactIndexInSim instanceof Object &&
                    typeof params.contactIndexInSim.encrypted_number_or_null === "string"
                ) && (
                    params.contactName === undefined ||
                    params.contactName instanceof Object &&
                    typeof params.contactName.encrypted_string === "string"
                )
            ),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas(
                { methodName, params },
                socket,
                ({ user }) => dbWebphoneData.updateChatContactNameOrIndexInSim(
                    user,
                    params.imsi,
                    params.chatRef,
                    params.contactIndexInSim,
                    params.contactName
                )
            )
        };

        handlers[methodName] = handler;

    }

    {

        const { methodName } = apiDeclaration.wd_destroyChat;
        type Params = apiDeclaration.wd_destroyChat.Params;
        type Response = apiDeclaration.wd_destroyChat.Response;

        const handler: sip.api.Server.Handler<Params, Response> = {
            "sanityCheck": params => (
                params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string"
            ),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas(
                { methodName, params },
                socket,
                ({ user }) => dbWebphoneData.destroyChat(
                    user,
                    params.imsi,
                    params.chatRef
                )
            )
        };

        handlers[methodName] = handler;

    }

    {

        const { methodName } = apiDeclaration.wd_newMessage;
        type Params = apiDeclaration.wd_newMessage.Params;
        type Response = apiDeclaration.wd_newMessage.Response;

        const handler: sip.api.Server.Handler<Params, Response> = {
            "sanityCheck": params => (
                params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" && (
                    params.message instanceof Object &&
                    typeof params.message.ref === "string" &&
                    typeof params.message.time === "number" &&
                    params.message.text instanceof Object &&
                    typeof params.message.text.encrypted_string === "string" &&
                    (
                        (
                            params.message.direction === "INCOMING" &&
                            typeof params.message.isNotification === "boolean"
                        )
                        ||
                        (
                            params.message.direction === "OUTGOING" &&
                            params.message.status === "PENDING"
                        )
                    )
                )
            ),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas(
                { methodName, params },
                socket,
                ({ user }) => dbWebphoneData.newMessage(
                    user,
                    params.imsi,
                    params.chatRef,
                    params.message
                )
            )
        };

        handlers[methodName] = handler;

    }

    {

        const { methodName } = apiDeclaration.wd_notifySendReportReceived;
        type Params = apiDeclaration.wd_notifySendReportReceived.Params;
        type Response = apiDeclaration.wd_notifySendReportReceived.Response;

        const handler: sip.api.Server.Handler<Params, Response> = {
            "sanityCheck": params => (
                params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                typeof params.messageRef === "string" &&
                typeof params.isSentSuccessfully === "boolean"
            ),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas(
                { methodName, params },
                socket,
                ({ user }) => dbWebphoneData.updateMessageOnSendReport(
                    user,
                    params.imsi,
                    params.chatRef,
                    params.messageRef,
                    params.isSentSuccessfully
                )
            )
        };

        handlers[methodName] = handler;

    }

    {

        const { methodName } = apiDeclaration.wd_notifyStatusReportReceived;
        type Params = apiDeclaration.wd_notifyStatusReportReceived.Params;
        type Response = apiDeclaration.wd_notifyStatusReportReceived.Response;

        const handler: sip.api.Server.Handler<Params, Response> = {
            "sanityCheck": params => (
                params instanceof Object &&
                dcSanityChecks.imsi(params.imsi) &&
                typeof params.chatRef === "string" &&
                typeof params.messageRef === "string" &&
                (
                    typeof params.deliveredTime === "number" ||
                    params.deliveredTime === null
                ) &&
                params.sentBy instanceof Object &&
                (
                    params.sentBy.who === "USER" ||
                    params.sentBy.who === "OTHER" &&
                    params.sentBy.email instanceof Object &&
                    typeof params.sentBy.email.encrypted_string === "string"
                )
            ),
            "handler": (params, socket) => makeDbRequestAndNotifyOtherUas(
                { methodName, params },
                socket,
                ({ user }) => dbWebphoneData.updateMessageOnStatusReport(
                    user,
                    params.imsi,
                    params.chatRef,
                    params.messageRef,
                    params.deliveredTime,
                    params.sentBy
                )
            )
        };

        handlers[methodName] = handler;

    }

    return handlers;

}
