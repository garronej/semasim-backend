import { networkTools } from "../semasim-gateway";
export declare const resolveSrv: typeof networkTools.resolveSrv;
export declare function resolve4(hostname: string): Promise<string>;
export declare function stunBindingRequest(stunServer: string, port: number, interfaceIp?: string, srcPort?: number): Promise<{
    ip: string;
    port: number;
}>;
export declare function getStunServer(): Promise<{
    ip: string;
    port: number;
}>;
export declare namespace getStunServer {
    let domain: string | undefined;
    function defineUpdateInterval(delay?: number): Promise<void>;
    let previousResult: {
        ip: string;
        port: number;
    } | undefined;
    let knownStunServers: {
        "name": string;
        "port": number;
    }[];
    function run(): Promise<{
        ip: string;
        port: number;
    }>;
}
export declare function getInterfaceIps(): Promise<string[]>;
export declare function retrieveIpFromHostname(hostname: string): Promise<{
    interfaceIp: string;
    publicIp: string;
}>;
