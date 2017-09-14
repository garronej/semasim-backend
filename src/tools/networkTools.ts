import * as dns from "dns";
import * as network from "network";

export async function retrieveIpFromHostname(
    hostname: string
): Promise<{
    interfaceLocalIp: string;
    interfacePublicIp: string;
}> {

    let interfacePublicIp = await new Promise<string>((resolve, reject) =>
        dns.resolve4(hostname, (error, addresses) => {

            if (error) {
                reject(error);
                return;
            }

            resolve(addresses[0]);

        })
    );

    let interfaceLocalIp = await new Promise<string>(
        (resolve, reject) => network.get_interfaces_list( 
            async (error, interfaces) => {

                if( error ){
                    reject(error);
                    return;
                }

                for (let currentInterface of interfaces) {

                    let currentInterfaceLocalIp= currentInterface.ip_address;

                    let currentInterfacePublicIp= await new Promise<string | undefined>(
                        resolve=> network.get_public_ip(
                            { "localAddress": currentInterfaceLocalIp },
                            (error, res)=> resolve(error?undefined:res)
                        )
                    );

                    if( currentInterfacePublicIp === interfacePublicIp ){
                        resolve(currentInterfaceLocalIp);
                        return;
                    } 

                }

                reject(new Error(`${hostname}(${interfacePublicIp}) does not point on any local interface`));

            }
        )
    );

    return { 
        interfaceLocalIp, 
        interfacePublicIp 
    };

}
