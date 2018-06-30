import { types as gwTypes } from "../../../../semasim-gateway";
import * as sipLibrary from "ts-sip";
import { handlers as localApiHandlers } from "./localApiHandlers";
import * as logger from "logger";

const map= new Map<string, sipLibrary.Socket>();

export type Key= { remoteAddress: string; remotePort: number; };

export namespace Key {
    export function getId(key: Key): string {
        return `${key.remoteAddress}:${key.remotePort}`;
    }
}

const idString= "clientSideSocket";

const server = new sipLibrary.api.Server(
    localApiHandlers,
    sipLibrary.api.Server.getDefaultLogger({
        idString,
        "log": logger.log,
        "hideKeepAlive": true
    })
);

/** Make sure the previous socket associate to key is closed before re-assign same key! */
export function set(key: Key, clientSideSocket: sipLibrary.Socket){

    server.startListening(clientSideSocket);

    sipLibrary.api.client.enableKeepAlive(clientSideSocket);

    sipLibrary.api.client.enableErrorLogging(
        clientSideSocket, 
        sipLibrary.api.client.getDefaultErrorLogger({ 
            idString, 
            "log": logger.log 
        })
    );

    let id= Key.getId(key);

    map.set(id, clientSideSocket);

    clientSideSocket.evtClose.attachOnce(
        ()=> map.delete(id)
    );

}

export function get(key: Key ): sipLibrary.Socket | undefined;
export function get(contact: gwTypes.Contact ): sipLibrary.Socket | undefined;
export function get(arg: Key | gwTypes.Contact): sipLibrary.Socket | undefined {

    if( !!(arg as gwTypes.Contact).path ){

        let contact= arg as gwTypes.Contact;

        let { host, port } = sipLibrary.parsePath(contact.path).pop()!.uri;

        return get({ "remoteAddress": host!, "remotePort": port });

    }else{

        let key= arg as Key;

        return map.get(Key.getId(key));

    }

}


export function getAll(): Iterable<sipLibrary.Socket> {
    return map.values();
}

