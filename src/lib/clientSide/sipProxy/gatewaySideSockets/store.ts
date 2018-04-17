import * as sipLibrary from "ts-sip";
import { handlers as localApiHandlers } from "./localApiHandlers";

const byRemoteAddress= new Map<string, Set<sipLibrary.Socket>>();
const byImsi = new Map<string, sipLibrary.Socket>();

export type Key= Key.GatewaySocketRemoteAddress | Key.Imsi;

export namespace Key {

    export type GatewaySocketRemoteAddress= {
        gatewaySocketRemoteAddress: string;
    };

    export type Imsi= { imsi: string; }

    export namespace Imsi {
        export function match(key: Key): key is Imsi {
            return (key as Imsi).imsi !== undefined;
        }
    }


}

const __set_of_imsi__= " set of imsi ";
const __set_of_gatewaySocketRemoteAddress__= " set of gatewaySocketRemoteAddress ";

const idString= "gatewaySideSocket";

const server = new sipLibrary.api.Server(
    localApiHandlers,
    sipLibrary.api.Server.getDefaultLogger({
        idString,
        "hideKeepAlive": true
    })
);

export function add(gatewaySideSocket: sipLibrary.Socket): void {

    server.startListening(gatewaySideSocket);

    sipLibrary.api.client.enableKeepAlive(gatewaySideSocket);

    sipLibrary.api.client.enableErrorLogging(
        gatewaySideSocket, 
        sipLibrary.api.client.getDefaultErrorLogger({ idString })
    );

    gatewaySideSocket.misc[__set_of_imsi__]= new Set<string>();
    gatewaySideSocket.misc[__set_of_gatewaySocketRemoteAddress__]= new Set<string>();

    gatewaySideSocket.evtClose.attachOnce(()=> {

        for( 
            let imsi  
            of 
            (gatewaySideSocket.misc[__set_of_imsi__] as Set<string>) 
        ){

            unbind({ imsi }, gatewaySideSocket);

        }

        for( 
            let gatewaySocketRemoteAddress  
            of 
            (gatewaySideSocket.misc[__set_of_gatewaySocketRemoteAddress__] as Set<string>) 
        ){

            unbind({ gatewaySocketRemoteAddress }, gatewaySideSocket);

        }

    });

}

export function bind(
    key: Key.Imsi,
    gatewaySideSocket: sipLibrary.Socket
): void;
export function bind(
    key: Key.GatewaySocketRemoteAddress,
    gatewaySideSocket: sipLibrary.Socket
): void;
export function bind(
    key: Key,
    gatewaySideSocket: sipLibrary.Socket
): void;
export function bind(
    key: Key,
    gatewaySideSocket: sipLibrary.Socket
): void {

    if (Key.Imsi.match(key)) {

        let { imsi } = key;

        byImsi.set(imsi, gatewaySideSocket);

        gatewaySideSocket.misc[__set_of_imsi__].add(imsi);

    } else {

        let { gatewaySocketRemoteAddress } = key;

        let set = byRemoteAddress.get(gatewaySocketRemoteAddress) || (() => {

            let newSet = new Set();

            byRemoteAddress.set(gatewaySocketRemoteAddress, newSet);

            return newSet;

        })();

        set.add(gatewaySideSocket);

        gatewaySideSocket.misc[__set_of_gatewaySocketRemoteAddress__].add(gatewaySocketRemoteAddress);

    }

}

export function unbind(
    key: Key.Imsi,
    gatewaySideSocket: sipLibrary.Socket
): void;
export function unbind(
    key: Key.GatewaySocketRemoteAddress,
    gatewaySideSocket: sipLibrary.Socket
): void;
export function unbind(
    key: Key,
    gatewaySideSocket: sipLibrary.Socket
): void;
export function unbind(
    key: Key,
    gatewaySideSocket: sipLibrary.Socket
): void {

    if (Key.Imsi.match(key)) {

        let { imsi } = key;

        gatewaySideSocket.misc[__set_of_imsi__].delete(imsi);

        //TODO: should be unnecessary
        if( byImsi.get(imsi) !== gatewaySideSocket ){
            return;
        }

        byImsi.delete(imsi);

    } else {

        let { gatewaySocketRemoteAddress } = key;

        gatewaySideSocket.misc[__set_of_gatewaySocketRemoteAddress__].delete(
            gatewaySocketRemoteAddress
        );

        let set= byRemoteAddress.get(gatewaySocketRemoteAddress)!;

        set.delete(gatewaySideSocket);

        if( !set.size ){

            byRemoteAddress.delete(gatewaySocketRemoteAddress);

        }

    }

}

export function get(
    key: Key.Imsi
): sipLibrary.Socket | undefined;
export function get(
    key: Key.GatewaySocketRemoteAddress,
): Set<sipLibrary.Socket>;
export function get(
    key: Key,
): sipLibrary.Socket | undefined | Set<sipLibrary.Socket> {

    if (Key.Imsi.match(key)) {

        let { imsi } = key;

        return byImsi.get(imsi);

    } else {

        let { gatewaySocketRemoteAddress } = key;

        return byRemoteAddress.get(gatewaySocketRemoteAddress) || new Set();

    }

}
