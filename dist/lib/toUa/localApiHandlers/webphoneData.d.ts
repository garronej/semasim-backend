import * as sip from "ts-sip";
export declare type SessionInfos = {
    user: number;
    uaInstanceId: string;
};
export declare type FakeSocket = {
    sessionInfos: SessionInfos;
};
export declare function getSocketForIntegrationTests(sessionInfos: SessionInfos): FakeSocket & sip.Socket;
export declare function getHandlers(dbWebphoneData: ReturnType<typeof import("../../dbWebphoneData/impl").getApi>, dbSemasim: {
    getUserUas: (typeof import("../../dbSemasim"))["getUserUas"];
}, uaRemoteApiCaller: {
    wd_notifyActionFromOtherUa: (typeof import("../remoteApiCaller"))["wd_notifyActionFromOtherUa"];
}, debug_resolveOnlyOnceOtherUaHaveBeenNotified?: boolean): sip.api.Server.Handlers;
