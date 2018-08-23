
import * as sipLibrary from "ts-sip";
import * as web from "../../web";

const map = new Map<string, sipLibrary.Socket>();


export function set(
    connectionId: string, 
    auth: web.Auth | undefined,
    clientSocket: sipLibrary.Socket
): void {

    clientSocket.misc["__auth__"]= auth;

    map.set(connectionId, clientSocket);

    clientSocket.evtClose.attachOncePrepend(() => map.delete(connectionId));

}

export function get(connectionId: string): sipLibrary.Socket | undefined {

    return map.get(connectionId);

}
