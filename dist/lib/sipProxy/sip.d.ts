/// <reference types="node" />
import * as net from "net";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
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
    readonly evtData: SyncEvent<string>;
    constructor(connection: net.Socket);
    readonly setKeepAlive: net.Socket['setKeepAlive'];
    write(sipPacket: Packet): boolean;
    destroy(): void;
    readonly localPort: number;
    readonly localAddress: string;
    readonly remotePort: number;
    readonly remoteAddress: string;
    addViaHeader(sipRequest: Request, extraParams?: Record<string, string>): string;
}
export declare class Store {
    private readonly record;
    private readonly timestampRecord;
    constructor();
    add(key: string, socket: Socket, timestamp?: number): void;
    get(key: string): Socket | undefined;
    getTimestamp(key: string): number;
    destroyAll(): void;
}
export declare const stringify: (sipPacket: Packet) => string;
export declare const parseUri: (uri: string) => ParsedUri;
export declare const copyMessage: <T extends Packet>(sipPacket: T) => T;
export declare const generateBranch: () => string;
export declare const stringifyUri: (parsedUri: ParsedUri) => string;
export declare const parse: (rawSipPacket: string) => Packet;
export declare function parseUriWithEndpoint(uri: string): ParsedUri & {
    endpoint: string;
};
export declare function updateContactHeader(sipRequest: Request, host: string, port: number, transport: TransportProtocol, extraParams?: Record<string, string>): void;
export declare function shiftViaHeader(sipResponse: Response): void;
export declare function updateUri(wrap: {
    uri: string;
} | undefined, updatedField: Partial<ParsedUri>): void;
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
export declare type SipHeaders = {
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
    headers: SipHeaders;
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
