/// <reference types="node" />
import * as sip from "sip";
import * as net from "net";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
export declare const regIdKey = "reg-id";
export declare const instanceIdKey = "+sip.instance";
export declare const parseSdp: (rawSdp: string) => any;
export declare const stringifySdp: (sdp: any) => string;
export declare function overwriteGlobalAndAudioAddrInSdpCandidates(sdp: any): void;
export declare function isPlainMessageRequest(sipRequest: sip.Request): boolean;
export declare const makeStreamParser: (handler: (sipPacket: Packet) => void) => ((chunk: Buffer | string) => void);
export declare class Socket {
    private readonly connection;
    readonly evtPacket: SyncEvent<Packet>;
    readonly evtResponse: SyncEvent<Response>;
    readonly evtRequest: SyncEvent<Request>;
    readonly evtClose: SyncEvent<boolean>;
    readonly evtError: SyncEvent<Error>;
    readonly evtConnect: VoidSyncEvent;
    readonly evtPing: VoidSyncEvent;
    private timer;
    readonly evtTimeout: VoidSyncEvent;
    readonly evtData: SyncEvent<string>;
    disablePong: boolean;
    constructor(connection: net.Socket, timeoutDelay?: number);
    private __localPort__;
    private __remotePort__;
    private __localAddress__;
    private __remoteAddress__;
    private fixPortAndAddr();
    readonly setKeepAlive: net.Socket['setKeepAlive'];
    write(sipPacket: Packet): boolean;
    destroy(): void;
    readonly localPort: number;
    readonly localAddress: string;
    readonly remotePort: number;
    readonly remoteAddress: string;
    readonly encrypted: boolean;
    readonly protocol: "TCP" | "TLS";
    addViaHeader(sipRequest: Request, extraParams?: Record<string, string>): string;
    addPathHeader(sipRegisterRequest: Request, host?: string): void;
    private buildRecordRoute(host);
    shiftRouteAndAddRecordRoute(sipRequest: Request, host?: string): void;
    rewriteRecordRoute(sipResponse: Response, host?: string): void;
}
export declare class Store {
    private readonly record;
    private readonly timestampRecord;
    constructor();
    add(key: string, socket: Socket, timestamp?: number): void;
    get(key: string): Socket | undefined;
    readonly keys: string[];
    getAll(): Socket[];
    getTimestamp(key: string): number;
    destroyAll(): void;
}
export declare const stringify: (sipPacket: Packet) => string;
export declare const parseUri: (uri: string) => ParsedUri;
export declare const generateBranch: () => string;
export declare const stringifyUri: (parsedUri: ParsedUri) => string;
export declare const parse: (rawSipPacket: string) => Packet;
export declare function copyMessage<T extends Packet>(sipPacket: T, deep?: boolean): T;
export declare function createParsedUri(): ParsedUri;
export declare function parseUriWithEndpoint(uri: string): ParsedUri & {
    endpoint: string;
};
export declare function updateUri(wrap: {
    uri: string | undefined;
} | undefined, updatedField: Partial<ParsedUri>): void;
export declare function parseOptionTags(headerFieldValue: string | undefined): string[];
export declare function hasOptionTag(headers: Headers, headerField: string, optionTag: string): boolean;
export declare function addOptionTag(headers: Headers, headerField: string, optionTag: string): void;
export declare function matchRequest(sipPacket: Packet): sipPacket is Request;
export declare type TransportProtocol = "TCP" | "UDP" | "TLS" | "WSS";
export interface Via {
    version: string;
    protocol: string;
    host: string;
    port: number;
    params: Record<string, string | null>;
}
export interface ParsedUri {
    schema: string;
    user: string | undefined;
    password: string | undefined;
    host: string | undefined;
    port: number;
    params: Record<string, string | null>;
    headers: Record<string, string>;
}
export declare type UriWrap1 = {
    name: string | undefined;
    uri: string;
    params: Record<string, string | null>;
};
export declare type UriWrap2 = {
    uri: ParsedUri;
    params: Record<string, string | null>;
};
export declare type Headers = {
    via: Via[];
    from: UriWrap1;
    to: UriWrap1;
    cseq: {
        seq: number;
        method: string;
    };
    contact?: UriWrap1[];
    path?: UriWrap2[];
    route?: UriWrap2[];
    "record-route"?: UriWrap2[];
    [key: string]: string | any;
};
export interface PacketBase {
    uri: string;
    version: string;
    headers: Headers;
    content: string;
}
export interface Request extends PacketBase {
    method: string;
}
export interface Response extends PacketBase {
    status: number;
    reason: string;
}
export declare type Packet = Request | Response;
