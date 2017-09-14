export declare function retrieveIpFromHostname(hostname: string): Promise<{
    interfaceLocalIp: string;
    interfacePublicIp: string;
}>;
