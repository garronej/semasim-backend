//USELESS

import * as tls from "tls";
import * as sipProxy from "./sipProxy";

export function beforeExit(): Promise<void>{
    return sipProxy.beforeExit();
}

export function launch({server, spoofedLocal}: {
    server: tls.Server,
    spoofedLocal: { address: string; port: number; }
}): void {

    sipProxy.launch({ server, spoofedLocal });

}