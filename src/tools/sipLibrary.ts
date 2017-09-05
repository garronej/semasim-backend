import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as net from "net";
import * as md5 from "md5";
import * as sip from "sip";
import * as _sdp_ from "sip/sdp";

import * as _debug from "debug";
let debug = _debug("_tools/sipLibrary");

export const regIdKey = "reg-id";
export const instanceIdKey = "+sip.instance";

export const parseSdp: (rawSdp: string) => any = _sdp_.parse;
export const stringifySdp: (sdp: any) => string = _sdp_.stringify;

export function overwriteGlobalAndAudioAddrInSdpCandidates(sdp: any) {

    let getSrflxAddr = (): string => {

        for (let m_i of sdp.m){

            if( m_i.media !== "audio") continue;

            for (let a_i of m_i.a) {

                let match = a_i.match(
                    /^candidate(?:[^\s]+\s){4}((?:[0-9]{1,3}\.){3}[0-9]{1,3})\s(?:[^\s]+\s){2}srflx/
                );

                if( match ) return match[1];

            }
        }

        return "";
        

    };

    let srflxAddr= getSrflxAddr();

    if( !srflxAddr ){
        console.log("No srflx candidate was present in the offer");
        return;
    }

    //TODO: I think linphone is expecting a second c line witch this implementation of SDP parser does not support...
    sdp.c.address= srflxAddr;

    //TODO: we this should be removable
    sdp.o.address= srflxAddr;

    //TODO: see if need to update port in m as well because it may fail on NAT that change port mapping
    /*

    Asterisk sends: 

    v=0
    o=- 947913108 947913108 IN IP4 192.168.0.20
    s=Asterisk
    c=IN IP4 192.168.0.20
    t=0 0
    m=audio 27802 RTP/AVP 8 0 101
    a=ice-ufrag:733aedd91cdc7ff0001e4b0b6a9b0fcc
    a=ice-pwd:4df63e726aeaeb030fdf2945787aba76
    a=candidate:Hc0a80014 1 UDP 2130706431 192.168.0.20 27802 typ host
    a=candidate:S5140886d 1 UDP 1694498815 81.64.136.109 27802 typ srflx raddr 192.168.0.20 rport 27802
    a=candidate:Hc0a80014 2 UDP 2130706430 192.168.0.20 27803 typ host
    a=candidate:S5140886d 2 UDP 1694498814 81.64.136.109 27803 typ srflx raddr 192.168.0.20 rport 27803
    a=rtpmap:8 PCMA/8000
    a=rtpmap:0 PCMU/8000
    a=rtpmap:101 telephone-event/8000
    a=fmtp:101 0-16
    a=ptime:20
    a=maxptime:150
    a=sendrecv

    Linphone sends: 

    v=0
    o=358880032664586 1891 2518 IN IP4 192.168.0.16
    s=Talk
    c=IN IP4 192.168.0.16
    b=AS:380
    t=0 0
    a=ice-pwd:9b07eb9ded44692c868621e7
    a=ice-ufrag:27435913
    m=audio 7076 RTP/AVP 8 0 101
    c=IN IP4 81.64.136.109
    a=rtpmap:101 telephone-event/8000
    a=candidate:1 1 UDP 2130706431 192.168.0.16 7076 typ host
    a=candidate:1 2 UDP 2130706430 192.168.0.16 7077 typ host
    a=candidate:2 1 UDP 1694498815 81.64.136.109 7076 typ srflx raddr 192.168.0.16 rport 7076
    a=candidate:2 2 UDP 1694498814 81.64.136.109 7077 typ srflx raddr 192.168.0.16 rport 7077
    */

}

export function isPlainMessageRequest(sipRequest: sip.Request): boolean {

    return (
        sipRequest.method === "MESSAGE" &&
        sipRequest.headers["content-type"].match(/^text\/plain/)
    );

}




export const makeStreamParser: (
    handler: (sipPacket: Packet) => void, 
    onFlood: ()=> void, 
    maxBytesHeaders: number, 
    maxContentLength: number
) => ((dataAsBinaryString: string) => void) = sip.makeStreamParser;

//TODO: make a function to test if message are well formed: have from, to via ect.
export class Socket {

    public readonly evtPacket = new SyncEvent<Packet>();
    public readonly evtResponse = new SyncEvent<Response>();
    public readonly evtRequest = new SyncEvent<Request>();

    public readonly evtClose = new SyncEvent<boolean>();
    public readonly evtError = new SyncEvent<Error>();
    public readonly evtConnect = new VoidSyncEvent();

    private timer: NodeJS.Timer;
    public readonly evtTimeout = new VoidSyncEvent();

    public readonly evtData = new SyncEvent<string>();

    private static readonly maxBytesHeaders= 7820;
    private static readonly maxContentLength= 24624;


    constructor(
        private readonly connection: net.Socket,
        timeoutDelay?: number
    ) {

        let streamParser = makeStreamParser(
            sipPacket => {

                this.evtPacket.post(sipPacket);

                if (matchRequest(sipPacket))
                    this.evtRequest.post(sipPacket);
                else
                    this.evtResponse.post(sipPacket);

            },
            () => this.destroy(),
            Socket.maxBytesHeaders,
            Socket.maxContentLength
        );

        connection.on("data", (data: Buffer) => {

            if (timeoutDelay) {

                clearTimeout(this.timer);

                this.timer = setTimeout(() => this.evtTimeout.post(), timeoutDelay);

            }

            let dataAsBinaryString = data.toString("binary");

            this.evtData.post(dataAsBinaryString);

            streamParser(dataAsBinaryString);

        })
            .once("close", had_error => {
                if (timeoutDelay) clearTimeout(this.timer);
                this.evtClose.post(had_error);
            })
            .once("error", error => this.evtError.post(error))
            .setMaxListeners(Infinity);

        if (this.encrypted)
            connection.once("secureConnect", () => {
                this.fixPortAndAddr();
                this.evtConnect.post();
            });
        else
            connection.once("connect", () => {
                this.fixPortAndAddr();
                this.evtConnect.post();
            });


    }

    private __localPort__: number = NaN;
    private __remotePort__: number = NaN;
    private __localAddress__: string | undefined = undefined;
    private __remoteAddress__: string | undefined = undefined;

    private fixPortAndAddr() {

        this.__localPort__ = this.connection.localPort;
        this.__remotePort__ = this.connection.remotePort;
        this.__localAddress__ = this.connection.localAddress;
        this.__remoteAddress__ = this.connection.remoteAddress;

    }

    public readonly setKeepAlive: net.Socket['setKeepAlive'] =
    (...inputs) => this.connection.setKeepAlive.apply(this.connection, inputs);

    public write(sipPacket: Packet): boolean {

        if (this.evtClose.postCount) return false;

        if (matchRequest(sipPacket) && parseInt(sipPacket.headers["max-forwards"]) < 0)
            return false;

        return this.connection.write(
            new Buffer(stringify(sipPacket), "binary")
        );

    }


    public destroy() {

        /*
        this.evtData.detach();
        this.evtPacket.detach();
        this.evtResponse.detach();
        this.evtRequest.detach();
        */

        this.connection.destroy();

    }

    public get localPort(): number {
        let localPort = this.__localPort__ || this.connection.localPort;

        if (typeof localPort !== "number" || isNaN(localPort))
            throw new Error("LocalPort not yet set");

        return localPort;
    }
    public get localAddress(): string {
        let localAddress = this.__localAddress__ || this.connection.localAddress;

        if (!localAddress) throw new Error("LocalAddress not yet set");

        return localAddress;
    }

    public get remotePort(): number {
        let remotePort = this.__remotePort__ || this.connection.remotePort;

        if (typeof remotePort !== "number" || isNaN(remotePort))
            throw new Error("Remote port not yet set");

        return remotePort;

    }
    public get remoteAddress(): string {

        let remoteAddress = this.__remoteAddress__ || this.connection.remoteAddress;

        if (!remoteAddress) throw new Error("Remote address not yes set");

        return remoteAddress;
    }

    public get encrypted(): boolean {

        return this.connection["encrypted"] ? true : false;

    }

    public get protocol(): "TCP" | "TLS" {
        return this.encrypted ? "TLS" : "TCP";
    }

    //TODO: need validate or crash
    public addViaHeader(
        sipRequest: Request,
        extraParams?: Record<string, string>
    ): string {

        let branch = (() => {

            let via = sipRequest.headers.via;

            if (!via.length) return generateBranch();

            sipRequest.headers["max-forwards"] = `${parseInt(sipRequest.headers["max-forwards"]) - 1}`;

            let previousBranch = via[0].params["branch"]!;

            return `z9hG4bK-${md5(previousBranch)}`;

        })();

        let params = { ...(extraParams || {}), branch, "rport": null };

        sipRequest.headers.via.unshift({
            "version": "2.0",
            "protocol": this.protocol,
            "host": this.localAddress,
            "port": this.localPort,
            params
        });

        return branch;

    }


    public addPathHeader(
        sipRegisterRequest: Request,
        host?: string,
        extraParams?: Record<string, string>
    ) {

        let parsedUri = createParsedUri();

        parsedUri.host = host || this.localAddress;

        parsedUri.port = this.localPort;

        parsedUri.params = { ...(extraParams || {}), "transport": this.protocol, "lr": null };

        if (!sipRegisterRequest.headers.path)
            sipRegisterRequest.headers.path = [];

        sipRegisterRequest.headers.path!.unshift({
            "uri": parsedUri,
            "params": {}
        });

    }


    private buildRecordRoute(host: string | undefined): AoRWithParsedUri {

        let parsedUri = createParsedUri();

        parsedUri.host = host || this.localAddress;

        parsedUri.port = this.localPort;

        parsedUri.params["transport"] = this.protocol;

        parsedUri.params["lr"] = null;

        return { "uri": parsedUri, "params": {} };

    }

    public shiftRouteAndAddRecordRoute(sipRequest: Request, host?: string) {

        if (sipRequest.headers.route)
            sipRequest.headers.route.shift();

        if (!sipRequest.headers.contact) return;

        if (!sipRequest.headers["record-route"])
            sipRequest.headers["record-route"] = [];

        (sipRequest.headers["record-route"] as Headers["record-route"])!.unshift(
            this.buildRecordRoute(host)
        );

    }


    public rewriteRecordRoute(sipResponse: Response, host?: string) {

        if (sipResponse.headers.cseq.method === "REGISTER") return;

        let lastHopAddr = sipResponse.headers.via[0].host;

        if (lastHopAddr === this.localAddress)
            sipResponse.headers["record-route"] = undefined;

        if (!sipResponse.headers.contact) return;

        if (!sipResponse.headers["record-route"])
            sipResponse.headers["record-route"] = [];

        (sipResponse.headers["record-route"] as Headers["record-route"])!.push(
            this.buildRecordRoute(host)
        );

    }


}

export class Store {

    private readonly record: Record<string, Socket> = {};

    constructor() { }

    public add(key: string, socket: Socket) {

        this.record[key] = socket;

        socket.evtClose.attachOnce(() => {
            delete this.record[key];
        });

    }

    public get(key: string): Socket | undefined {
        return this.record[key];
    }

    public get keys(): string[] {

        return Object.keys(this.record);

    }

    public getAll(): Socket[] {

        let out: Socket[] = [];

        for (let key of Object.keys(this.record))
            out.push(this.record[key]);

        return out;

    }

    public destroyAll() {

        for (let key of Object.keys(this.record))
            this.record[key].destroy();

    }

}


export const stringify: (sipPacket: Packet) => string = sip.stringify;
export const parseUri: (uri: string) => ParsedUri = sip.parseUri;
export const generateBranch: () => string = sip.generateBranch;
export const stringifyUri: (parsedUri: ParsedUri) => string = sip.stringifyUri;
export const parse: (rawSipPacket: string) => Packet = sip.parse;



export function copyMessage<T extends Packet>(sipPacket: T, deep?: boolean): T {

    return parse(stringify(sipPacket)) as T;

}

export function createParsedUri(): ParsedUri {
    return parseUri(`sip:127.0.0.1`);
}

export function parsePath(path: string): AoRWithParsedUri[] {

    const message = sip.parse([
        `DUMMY _ SIP/2.0`,
        `Path: ${path}`,
        "\r\n"
    ].join("\r\n")) as Request;

    return message.headers.path!;

}


export function parseOptionTags(headerFieldValue: string | undefined): string[] {

    if (!headerFieldValue) return [];

    return headerFieldValue.split(",").map(optionTag => optionTag.replace(/\s/g, ""));

}

export function hasOptionTag(
    headers: Headers,
    headerField: string,
    optionTag: string
): boolean {

    let headerFieldValue = headers[headerField];

    let optionTags = parseOptionTags(headerFieldValue);

    return optionTags.indexOf(optionTag) >= 0;

}

export function addOptionTag(
    headers: Headers,
    headerField: string,
    optionTag: string
) {

    if (hasOptionTag(headers, headerField, optionTag))
        return;

    let optionTags = parseOptionTags(headers[headerField]);

    optionTags.push(optionTag);

    headers[headerField] = optionTags.join(", ");

}



export function matchRequest(sipPacket: Packet): sipPacket is Request {
    return "method" in sipPacket;
}

export type TransportProtocol = "TCP" | "UDP" | "TLS" | "WSS";

export interface Via {
    version: string;
    protocol: string;
    host: string;
    port: number;
    params: Record<string, string | null>
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

export type AoR = {
    name: string | undefined;
    uri: string;
    params: Record<string, string | null>
};

export type AoRWithParsedUri = {
    uri: ParsedUri;
    params: Record<string, string | null>
}


export type Headers = {
    via: Via[];
    from: AoR;
    to: AoR;
    cseq: { seq: number; method: string; }
    contact?: AoR[];
    path?: AoRWithParsedUri[];
    route?: AoRWithParsedUri[];
    "record-route"?: AoRWithParsedUri[];
    [key: string]: string | any;
}

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

export type Packet = Request | Response;
