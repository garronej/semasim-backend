//USELESS

import * as tls from "tls";
import * as sipProxy from "./sipProxy";

export function launch({server, spoofedLocal}: {
    server: tls.Server,
    spoofedLocal: { address: string; port: number; }
}): void {

    sipProxy.launch({ server, spoofedLocal });

}