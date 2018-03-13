
import * as dns from "dns";
import * as network from "network";
import * as stun from "stun";
import * as dgram from "dgram";
import { networkTools } from "../semasim-gateway";
import * as os from "os";
import * as ipRangeCheck from "ip-range-check";

export const resolveSrv=networkTools.resolveSrv;

export function resolve4(hostname: string): Promise<string> {

    return new Promise<string>(
        (resolve, reject) => dns.resolve4(hostname,
            (error, addresses) => {
                (error || !addresses.length) ? reject(error || new Error("no record")) : resolve(addresses[0])
            }
        )
    );

}


export function stunBindingRequest(
    stunServer: string,
    port: number,
    interfaceIp?: string,
    srcPort?: number
) {

    return new Promise<{ ip: string; port: number; }>(
        (resolve, reject) => {

            let socket = dgram.createSocket("udp4");

            socket.bind(srcPort, interfaceIp);

            let server = stun.createServer(socket);

            let { STUN_BINDING_REQUEST, STUN_ATTR_XOR_MAPPED_ADDRESS } = stun.constants

            let timer = setTimeout(() => {

                server.close();

                reject(new Error("Stun binding request timeout"));

            }, 2000);

            server.once("bindingResponse", stunMsg => {

                clearTimeout(timer);

                try {

                    let { address, port } = stunMsg.getAttribute(STUN_ATTR_XOR_MAPPED_ADDRESS).value;

                    resolve({ "ip": address, port });

                } catch{

                    reject(new Error("Invalid response"));

                }

                socket.close();

            });

            server.send(stun.createMessage(STUN_BINDING_REQUEST), port, stunServer);

        }
    );

}

export function getStunServer(): Promise<{ ip: string; port: number; }> {

    if (getStunServer.previousResult) {
        return Promise.resolve(getStunServer.previousResult);
    }

    return getStunServer.run();

}

export namespace getStunServer {

    export let domain: string | undefined = undefined;

    export async function defineUpdateInterval(delay: number = 3600000) {

        setInterval(() => run(), delay);

        await run();

    }

    export let previousResult: { ip: string; port: number; } | undefined = undefined;

    // cSpell:disable
    export let knownStunServers = [
        { "name": "stun.l.google.com", "port": 19302 },
        { "name": "stun1.l.google.com", "port": 19302 },
        { "name": "stun2.l.google.com", "port": 19302 },
        { "name": "stun3.l.google.com", "port": 19302 },
        { "name": "stun4.l.google.com", "port": 19302 },
        { "name": "numb.viagenie.ca", "port": 3478 }
    ];
    /* cSpell:enable */

    export async function run(): Promise<{ ip: string; port: number; }> {

        let dnsSrvRecord: { name: string; port: number }[];

        try {

            if (!domain) throw new Error();

            dnsSrvRecord = await resolveSrv(`_stun._udp.${domain}`);

        } catch{

            dnsSrvRecord = knownStunServers;

        }

        let tasks: Promise<{ ip: string; port: number; }>[] = [];

        for (let { name, port } of dnsSrvRecord) {

            tasks[tasks.length] = (async () => {

                try {

                    let ip = await resolve4(name);

                    await stunBindingRequest(ip, port);

                    return { ip, port };

                } catch {

                    return new Promise<any>(() => { });

                }

            })();

        }

        tasks[tasks.length] = new Promise((_, reject) => setTimeout(() => reject(new Error("stun resolution timeout")), 2000));

        previousResult = await Promise.race(tasks);

        return previousResult;

    }

}

export function getInterfaceIps() {

    return new Promise<string[]>(
        (resolve, reject) =>
            network.get_interfaces_list(
                (error, list) => {

                    if (error || !list.length) {
                        reject(error || new Error("no interface"));
                        return;
                    }

                    resolve(list.map(({ ip_address }) => ip_address));

                }
            )
    );

}

/**
 * Return the address associated with a host name alongside
 * with the address of the interface who has this public address.
 * 
 * This is used so we do not have to maintain the constants to match
 * the DNS.
 * 
 * How it's done:
 * 
 * A sip.semasim.com => 52.57.54.73	
 * STUN from 172.31.19.1 => 52.58.64.189 (mismatch)
 * STUN from 172.31.19.2 => 52.57.54.73 (match)
 * 
 * sip.semasim.com => interfaceIp: 172.31.19.2; publicIp: 52.57.54.73
 * 
 */
export async function retrieveIpsFromHostname(
    hostname: string
): Promise<{
    interfaceIp: string;
    publicIp: string;
}> {

    let stunServer = await getStunServer();

    let publicIp = await resolve4(hostname);

    let tasks: Promise<string>[] = [];

    for (let interfaceIp of await getInterfaceIps()) {

        tasks[tasks.length] = (async () => {

            try {

                let stunResponse = await stunBindingRequest(stunServer.ip, stunServer.port, interfaceIp);

                if (stunResponse.ip !== publicIp) {
                    throw new Error();
                }

                return interfaceIp;

            } catch{

                return new Promise<any>(() => { });

            }

        })();

    }

    let timer!: NodeJS.Timer;

    tasks[tasks.length] = new Promise(
        (_, reject) => {
            timer= setTimeout(() => reject(new Error("Service does not point to this host")), 3000)
        }
    );

    let interfaceIp = await Promise.race(tasks);

    clearTimeout(timer);

    return { publicIp, interfaceIp };

}

export function getInterfaceAddressInRange(ipRange: string): string {

    let ifs= os.networkInterfaces();

    for( let ifName in ifs ){

        let { address }= ifs[ifName].find(({ family })=> family === "IPv4")!;

        if( ipRangeCheck(address, ipRange) ){
            return address;
        }

    }

    throw new Error(`No interface in range ${ipRange}`);

}


/*
import * as dns from "dns";
import * as network from "network";
import * as stun from "stun";
import * as dgram from "dgram";
import { networkTools } from "../semasim-gateway";

export const resolveSrv=networkTools.resolveSrv;

export function resolve4(hostname: string): Promise<string> {

    return new Promise<string>(
        (resolve, reject) => dns.resolve4(hostname,
            (error, addresses) => {
                (error || !addresses.length) ? reject(error || new Error("no record")) : resolve(addresses[0])
            }
        )
    );

}


export function stunBindingRequest(
    stunServer: string,
    port: number,
    interfaceIp?: string,
    srcPort?: number
) {

    return new Promise<{ ip: string; port: number; }>(
        (resolve, reject) => {

            let socket = dgram.createSocket("udp4");

            socket.bind(srcPort, interfaceIp);

            let server = stun.createServer(socket);

            let { STUN_BINDING_REQUEST, STUN_ATTR_XOR_MAPPED_ADDRESS } = stun.constants

            let timer = setTimeout(() => {

                server.close();

                reject(new Error("Stun binding request timeout"));

            }, 2000);

            server.once("bindingResponse", stunMsg => {

                clearTimeout(timer);

                try {

                    let { address, port } = stunMsg.getAttribute(STUN_ATTR_XOR_MAPPED_ADDRESS).value;

                    resolve({ "ip": address, port });

                } catch{

                    reject(new Error("Invalid response"));

                }

                socket.close();

            });

            server.send(stun.createMessage(STUN_BINDING_REQUEST), port, stunServer);

        }
    );

}

export function getStunServer(): Promise<{ ip: string; port: number; }> {

    if (getStunServer.previousResult) {
        return Promise.resolve(getStunServer.previousResult);
    }

    return getStunServer.run();

}

export namespace getStunServer {

    export let domain: string | undefined = undefined;

    export async function defineUpdateInterval(delay: number = 3600000) {

        setInterval(() => run(), delay);

        await run();

    }

    export let previousResult: { ip: string; port: number; } | undefined = undefined;

    // cSpell:disable
    export let knownStunServers = [
        { "name": "stun.l.google.com", "port": 19302 },
        { "name": "stun1.l.google.com", "port": 19302 },
        { "name": "stun2.l.google.com", "port": 19302 },
        { "name": "stun3.l.google.com", "port": 19302 },
        { "name": "stun4.l.google.com", "port": 19302 },
        { "name": "numb.viagenie.ca", "port": 3478 }
    ];
    // cSpell:enable

    export async function run(): Promise<{ ip: string; port: number; }> {

        let dnsSrvRecord: { name: string; port: number }[];

        try {

            if (!domain) throw new Error();

            dnsSrvRecord = await resolveSrv(`_stun._udp.${domain}`);

        } catch{

            dnsSrvRecord = knownStunServers;

        }

        let tasks: Promise<{ ip: string; port: number; }>[] = [];

        for (let { name, port } of dnsSrvRecord) {

            tasks[tasks.length] = (async () => {

                try {

                    let ip = await resolve4(name);

                    await stunBindingRequest(ip, port);

                    return { ip, port };

                } catch {

                    return new Promise<any>(() => { });

                }

            })();

        }

        tasks[tasks.length] = new Promise((_, reject) => setTimeout(() => reject(new Error("stun resolution timeout")), 2000));

        previousResult = await Promise.race(tasks);

        return previousResult;

    }

}

export function getInterfaceIps() {

    return new Promise<string[]>(
        (resolve, reject) =>
            network.get_interfaces_list(
                (error, list) => {

                    if (error || !list.length) {
                        reject(error || new Error("no interface"));
                        return;
                    }

                    resolve(list.map(({ ip_address }) => ip_address));

                }
            )
    );

}

export async function retrieveIpFromHostname(
    hostname: string
): Promise<{
    interfaceIp: string;
    publicIp: string;
}> {

    let stunServer = await getStunServer();

    let publicIp = await resolve4(hostname);

    let tasks: Promise<string>[] = [];

    for (let interfaceIp of await getInterfaceIps()) {

        tasks[tasks.length] = (async () => {

            try {

                let stunResponse = await stunBindingRequest(stunServer.ip, stunServer.port, interfaceIp);

                if (stunResponse.ip !== publicIp) {
                    throw new Error();
                }

                return interfaceIp;

            } catch{

                return new Promise<any>(() => { });

            }

        })();

    }

    tasks[tasks.length] = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Service does not point to this host")), 3000)
    );

    let interfaceIp = await Promise.race(tasks);

    return { publicIp, interfaceIp };

}


//async function startStunProxy(){
//
//    networkTools.getStunServer.domain= "semasim.com";
//
//    await networkTools.getStunServer.defineUpdateInterval();
//
//    const socket = dgram.createSocket("udp4");
//    socket.bind(3478, "127.0.0.1");
//    const server = stun.createServer(socket);
//
//    const { STUN_BINDING_RESPONSE, STUN_ATTR_XOR_MAPPED_ADDRESS, STUN_ATTR_SOFTWARE } = stun.constants;
//    const userAgent = `node/${process.version} stun/v1.0.0`;
//
//    server.on("bindingRequest", async (req, rinfo) => {
//
//        let stunServer= networkTools.getStunServer.previousResult!;
//
//        let stunResponse= await networkTools.stunBindingRequest(stunServer.ip, stunServer.port, undefined, rinfo.port + 1);
//
//        let msg = stun.createMessage(STUN_BINDING_RESPONSE)
//        msg.addAttribute(STUN_ATTR_XOR_MAPPED_ADDRESS, stunResponse.ip, stunResponse.port);
//        msg.addAttribute(STUN_ATTR_SOFTWARE, userAgent);
//
//        server.send(msg, rinfo.port, rinfo.address);
//
//    })
//
//    await new Promise<void>( 
//        resolve => socket.on("listening", ()=> resolve() ) 
//    );
//
//}

*/