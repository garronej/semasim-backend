import * as sip from "sip";
import * as net from "net";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";

import * as _debug from "debug";
let debug = _debug("_sipProxy/sip");

export const makeStreamParser: (handler: (sipPacket: Packet)=> void) => ((chunk: Buffer | string)=> void)= sip.makeStreamParser;

//TODO: make a function to test if message are well formed: have from, to via ect.
export class Socket {

    public readonly evtPacket= new SyncEvent<Packet>();
    public readonly evtResponse= new SyncEvent<Response>();
    public readonly evtRequest= new SyncEvent<Request>();

    public readonly evtClose= new SyncEvent<boolean>();
    public readonly evtError= new SyncEvent<Error>();
    public readonly evtConnect= new VoidSyncEvent();
    public readonly evtPing= new VoidSyncEvent();

    public readonly evtData=new SyncEvent<string>();

    constructor(
        private readonly connection: net.Socket
    ){

        let streamParser= makeStreamParser(sipPacket => {

            this.evtPacket.post(sipPacket);

            if( matchRequest(sipPacket) ) 
                this.evtRequest.post(sipPacket);
            else 
                this.evtResponse.post(sipPacket);

        });

        connection.on("data", (chunk: Buffer | string) => {

            let rawStr= (chunk as Buffer).toString("utf8");

            this.evtData.post(rawStr);

            if( rawStr === "\r\n\r\n" ){

                this.evtPing.post();

                this.connection.write("\r\n");

                return;

            }

            streamParser(rawStr);

        })
        .once("close", had_error => this.evtClose.post(had_error))
        .once("error", error => this.evtError.post(error))
        .once("connect", ()=> this.evtConnect.post())
        .setMaxListeners(Infinity);
        

    }

    public readonly setKeepAlive: net.Socket['setKeepAlive']=
    (...inputs)=> this.connection.setKeepAlive.apply(this.connection, inputs);

    public write(sipPacket: Packet): boolean{

        if( this.evtClose.postCount ) return false;

        return this.connection.write(stringify(sipPacket));
    }

    public destroy(){

        /*
        this.evtData.detach();
        this.evtPacket.detach();
        this.evtResponse.detach();
        this.evtRequest.detach();
        */

        this.connection.destroy();

    }

    public get localPort(): number {
        let localPort= this.connection.localPort;

        if( typeof localPort !== "number" || isNaN(localPort) )
            throw new Error("LocalPort not yet set");
        
        return localPort;
    }
    public get localAddress(): string {
        let localAddress= this.connection.localAddress;

        if( !localAddress ) throw new Error("LocalAddress not yet set");

        return localAddress;
    }

    public get remotePort(): number {
        let remotePort= this.connection.remotePort;

        if( typeof remotePort !== "number" || isNaN(remotePort) )
            throw new Error("Remote port not yet set");
        
        return remotePort;

    }
    public get remoteAddress(): string {

        let remoteAddress= this.connection.remoteAddress;

        if( !remoteAddress ) throw new Error("Remote address not yes set");

        return remoteAddress;
    }

    public addViaHeader(
    sipRequest: Request,
    extraParams?: Record<string, string>
    ): string {

        let branch= generateBranch();

        let params = { ...extraParams, branch, "rport": null };

        sipRequest.headers.via.splice(0, 0, {
            "version": "2.0",
            "protocol": "TCP",
            "host": this.localAddress, 
            "port": this.localPort, 
            params
        });

        sipRequest.headers["max-forwards"]= `${parseInt(sipRequest.headers["max-forwards"]) - 1}`;

        return branch;

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
export const copyMessage: <T extends Packet>(sipPacket: T) => T = sip.copyMessage;
export const generateBranch: () => string = sip.generateBranch;
export const stringifyUri: (parsedUri: ParsedUri) => string = sip.stringifyUri;
export const parse: (rawSipPacket: string) => Packet = sip.parse;

export function parseUriWithEndpoint(uri: string): ParsedUri & { endpoint: string } {

    let match = uri.match(/^([^\/]+)\/(.*)$/)!;

    return {
        ...parseUri(match[2]),
        "endpoint": match[1]
    };

}

export function updateContactHeader(
    sipRequest: Request,
    host: string,
    port: number,
    transport: TransportProtocol,
    extraParams?: Record<string, string>
) {

    if (!sipRequest.headers.contact) return;

    let parsedContact = {
        ...parseUri(sipRequest.headers.contact[0].uri),
        host, port
    };

    parsedContact.params = {
        ...parsedContact.params,
        ...extraParams,
        transport
    };

    sipRequest.headers.contact[0].uri = stringifyUri(parsedContact);

}

export function shiftViaHeader(sipResponse: Response) {
    sipResponse.headers.via.shift();
}

export function updateUri( wrap: { uri: string } | undefined, updatedField: Partial<ParsedUri>){

    if(!wrap) return;

    let parsedUri= parseUri(wrap.uri);

    for( let key of [ "schema", "user", "password", "host", "port" ])
        if (key in updatedField)
            parsedUri[key]= updatedField[key];
        
    if( "params" in updatedField )
        parsedUri.params= { ...parsedUri.params, ...updatedField.params };

    wrap.uri= stringifyUri(parsedUri);

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


export type SipHeaders = {
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

export type Packet = Request | Response;

