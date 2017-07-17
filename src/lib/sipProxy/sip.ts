import * as sip from "sip";
import * as net from "net";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as md5 from "md5";
import * as _sdp_ from "sip/sdp";






export const regIdKey = "reg-id";
export const instanceIdKey = "+sip.instance";

import * as _debug from "debug";
let debug = _debug("_sipProxy/sip");




export const parseSdp: (rawSdp: string) => any = _sdp_.parse;
export const stringifySdp: (sdp: any) => string = _sdp_.stringify;



/*

{
  "m": [
    {
      "media": "audio",
      "port": 25662,
      "portnum": 1,
      "proto": "RTP/AVP",
      "fmt": [
        8,
        0,
        100
      ],
      "a": [
        "ice-ufrag:626f23b80317e0f227f2b2f30911c6b6",
        "ice-pwd:0abedefc1c343e6d495892ab4772f237",
        "candidate:Hc0a80014 1 UDP 2130706431 192.168.0.20 25662 typ host",
        "candidate:S5140886d 1 UDP 1694498815 81.64.136.109 25662 typ srflx raddr 192.168.0.20 rport 25662",
        "candidate:Hc0a80014 2 UDP 2130706430 192.168.0.20 25663 typ host",
        "candidate:S5140886d 2 UDP 1694498814 81.64.136.109 25663 typ srflx raddr 192.168.0.20 rport 25663",
        "rtpmap:8 PCMA/8000",
        "rtpmap:0 PCMU/8000",
        "ptime:20",
        "maxptime:150",
        "sendrecv",
        "rtpmap:100 telephone-event/8000",
        "fmtp:100 0-16"
      ]
    }
  ],
  "v": "0",
  "o": {
    "username": "-",
    "id": "1549",
    "version": "2955",
    "nettype": "IN",
    "addrtype": "IP4",
    "address": "192.168.0.20"
  },
  "s": "Asterisk",
  "c": {
    "nettype": "IN",
    "addrtype": "IP4",
    "address": "192.168.0.20"
  },
  "t": "0 0"
}


let rawSdp = [
    "v=0",
    "o=- 1549 2955 IN IP4 192.168.0.20",
    "s=Asterisk",
    "c=IN IP4 192.168.0.20",
    "t=0 0",
    "m=audio 25662 RTP/AVP 8 0 100",
    "a=ice-ufrag:626f23b80317e0f227f2b2f30911c6b6",
    "a=ice-pwd:0abedefc1c343e6d495892ab4772f237",
    "a=candidate:Hc0a80014 1 UDP 2130706431 192.168.0.20 25662 typ host",
    "a=candidate:S5140886d 1 UDP 1694498815 81.64.136.109 25662 typ srflx raddr 192.168.0.20 rport 25662",
    "a=candidate:Hc0a80014 2 UDP 2130706430 192.168.0.20 25663 typ host",
    "a=candidate:S5140886d 2 UDP 1694498814 81.64.136.109 25663 typ srflx raddr 192.168.0.20 rport 25663",
    "a=rtpmap:8 PCMA/8000",
    "a=rtpmap:0 PCMU/8000",
    "a=ptime:20",
    "a=maxptime:150",
    "a=sendrecv",
    "a=rtpmap:100 telephone-event/8000",
    "a=fmtp:100 0-16"
].join("\r\n");
*/

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
        
        throw new Error("srflx not found in SDP candidates");

    };

    let srflxAddr= getSrflxAddr();

    sdp.c.address= srflxAddr;

    sdp.o.address= srflxAddr;

    //TODO: see if need to update port in m as well.

}









export function purgeCandidates(sdp: any, toPurge: { host: boolean; srflx: boolean; relay: boolean }) {

    for (let m_i of sdp.m) {

        let new_a: string[] = [];

        for (let a_i of m_i.a) {

            if (a_i.match(/^candidate.*host$/)) {

                if (toPurge.host) {

                    console.log("==========================================> purged", a_i);
                    continue;

                }

            } else if (a_i.match(/^candidate.*srflx/)) {

                if (toPurge.srflx) {

                    console.log("==========================================> purged", a_i);
                    continue;

                }

            } else if (a_i.match(/^candidate/)) {

                if (toPurge.relay) {

                    console.log("==========================================> purged", a_i);
                    continue;

                }

            }

            new_a.push(a_i);

        }

        m_i.a = new_a;

    }



}

export const makeStreamParser: (handler: (sipPacket: Packet) => void) => ((chunk: Buffer | string) => void) = sip.makeStreamParser;

//TODO: make a function to test if message are well formed: have from, to via ect.
export class Socket {

    public readonly evtPacket = new SyncEvent<Packet>();
    public readonly evtResponse = new SyncEvent<Response>();
    public readonly evtRequest = new SyncEvent<Request>();

    public readonly evtClose = new SyncEvent<boolean>();
    public readonly evtError = new SyncEvent<Error>();
    public readonly evtConnect = new VoidSyncEvent();
    public readonly evtPing = new VoidSyncEvent();

    public readonly evtData = new SyncEvent<string>();

    public disablePong = false;

    constructor(
        private readonly connection: net.Socket
    ) {

        let streamParser = makeStreamParser(sipPacket => {

            this.evtPacket.post(sipPacket);

            if (matchRequest(sipPacket))
                this.evtRequest.post(sipPacket);
            else
                this.evtResponse.post(sipPacket);

        });

        connection.on("data", (chunk: Buffer | string) => {

            let rawStr = (chunk as Buffer).toString("utf8");

            this.evtData.post(rawStr);

            if (rawStr === "\r\n\r\n") {

                this.evtPing.post();

                if (this.disablePong) {

                    console.log("pong disabled");

                    return;

                }

                this.connection.write("\r\n");

                return;

            }

            streamParser(rawStr);

        })
            .once("close", had_error => this.evtClose.post(had_error))
            .once("error", error => this.evtError.post(error))
            .setMaxListeners(Infinity);

        if (this.encrypted)
            connection.once("secureConnect", () => this.evtConnect.post());
        else
            connection.once("connect", () => this.evtConnect.post());


    }

    public readonly setKeepAlive: net.Socket['setKeepAlive'] =
    (...inputs) => this.connection.setKeepAlive.apply(this.connection, inputs);

    public write(sipPacket: Packet): boolean {

        if (this.evtClose.postCount) return false;

        //TODO: wait response of: https://support.counterpath.com/topic/what-is-the-use-of-the-first-options-request-send-before-registration
        if (matchRequest(sipPacket) && parseInt(sipPacket.headers["max-forwards"]) < 0)
            return false;

        try {

            return this.connection.write(stringify(sipPacket));

        } catch (error) {

            console.log("error while stringifying: ", sipPacket);

            throw error;

        }

    }

    public overrideContact(sipPacket: Packet) {


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
        let localPort = this.connection.localPort;

        if (typeof localPort !== "number" || isNaN(localPort))
            throw new Error("LocalPort not yet set");

        return localPort;
    }
    public get localAddress(): string {
        let localAddress = this.connection.localAddress;

        if (!localAddress) throw new Error("LocalAddress not yet set");

        return localAddress;
    }

    public get remotePort(): number {
        let remotePort = this.connection.remotePort;

        if (typeof remotePort !== "number" || isNaN(remotePort))
            throw new Error("Remote port not yet set");

        return remotePort;

    }
    public get remoteAddress(): string {

        let remoteAddress = this.connection.remoteAddress;

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

        sipRequest.headers["max-forwards"] = `${parseInt(sipRequest.headers["max-forwards"]) - 1}`;

        return branch;

    }

    public addPathHeader(sipRequest: Request, host?: string) {

        let parsedUri = createParsedUri();

        parsedUri.host = host || this.localAddress;

        parsedUri.port = this.localPort;

        parsedUri.params["transport"] = this.protocol;

        parsedUri.params["lr"] = null;

        if (!sipRequest.headers.path)
            sipRequest.headers.path = [];

        sipRequest.headers.path!.unshift({
            "uri": parsedUri,
            "params": {}
        });

    }


    private buildRecordRoute(host: string | undefined): UriWrap2 {

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
    private readonly timestampRecord: Record<string, number> = {};

    constructor() { }

    public add(key: string, socket: Socket, timestamp?: number) {

        if (timestamp === undefined) timestamp = Date.now();

        this.record[key] = socket;
        this.timestampRecord[key] = timestamp;

        socket.evtClose.attachOnce(() => {
            delete this.record[key];
        });

    }

    public get(key: string): Socket | undefined {
        return this.record[key];
    }

    public getTimestamp(key: string): number {
        return this.timestampRecord[key] || -1;
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


/*
export const copyMessage: <T extends Packet>(sipPacket: T, deep?: boolean) => T = sip.copyMessage;
REGISTER sip:semasim.com SIP/2.0
Via: SIP/2.0/TCP 172.31.31.1:8883;flowtoken=582faf054f660bbdd9e14c32bdb71e89;branch=z9hG4bK578943;rport
Via: SIP/2.0/TCP 100.122.234.122:60006;branch=z9hG4bK-524287-1---6093e050d634776b;rport;alias
Max-Forwards: 69
Contact:  <sip:358880032664586@100.122.234.122:60006;rinstance=c2b1e3c576ad2cf8;transport=tcp>;+sip.instance="<urn:uuid:26388600-1cde-40aa-8eba-5802edfa3322>";reg-id=1
To:  <sip:358880032664586@semasim.com>
From:  <sip:358880032664586@semasim.com>;tag=8ee6bf48
Call-ID: ZGZmMzllZjNhODIzZDQxMDlmOTA4YTY5ZWE3NGRlN2M
CSeq: 1 REGISTER
Expires: 900
Allow: INVITE, ACK, CANCEL, BYE, REFER, INFO, NOTIFY, OPTIONS, UPDATE, PRACK, MESSAGE, SUBSCRIBE
Supported: outbound, path
User-Agent: Bria iOS release 3.9.5 stamp 38501.38502
Content-Length: 0
*/

export function copyMessage<T extends Packet>(sipPacket: T, deep?: boolean): T {

    return parse(stringify(sipPacket)) as T;

}

export function createParsedUri(): ParsedUri {
    return parseUri(`sip:127.0.0.1`);
}



export function parseUriWithEndpoint(uri: string): ParsedUri & { endpoint: string } {

    let match = uri.match(/^([^\/]+)\/(.*)$/)!;

    return {
        ...parseUri(match[2]),
        "endpoint": match[1]
    };

}


export function updateUri(
    wrap: { uri: string | undefined } | undefined,
    updatedField: Partial<ParsedUri>
) {

    if (!wrap || !wrap.uri) return;


    let parsedUri = parseUri(wrap.uri);

    for (let key of ["schema", "user", "password", "host", "port"])
        if (key in updatedField)
            parsedUri[key] = updatedField[key];

    if (updatedField.params)
        parsedUri.params = { ...parsedUri.params, ...updatedField.params };

    for (let key of Object.keys(parsedUri.params))
        if (parsedUri.params[key] === "")
            delete parsedUri.params[key];

    wrap.uri = stringifyUri(parsedUri);

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

export type UriWrap1 = {
    name: string | undefined;
    uri: string;
    params: Record<string, string | null>
};

export type UriWrap2 = {
    uri: ParsedUri;
    params: Record<string, string | null>
}


export type Headers = {
    via: Via[];
    from: UriWrap1;
    to: UriWrap1;
    cseq: { seq: number; method: string; }
    contact?: UriWrap1[];
    path?: UriWrap2[];
    route?: UriWrap2[];
    "record-route"?: UriWrap2[];
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



