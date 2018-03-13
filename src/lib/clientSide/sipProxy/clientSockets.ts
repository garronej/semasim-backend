
import { sipLibrary } from "../../../semasim-gateway";

const map = new Map<string, sipLibrary.Socket>();

export function set(connectionId: string, clientSocket: sipLibrary.Socket): void {

    map.set(connectionId, clientSocket);

    clientSocket.evtClose.attachOncePrepend(() => map.delete(connectionId));

}

export function get(connectionId: string): sipLibrary.Socket | undefined {

    return map.get(connectionId);

}

