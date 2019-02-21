//http://xmodulo.com/geographic-location-ip-address-command-line.html

import { spawn } from "child_process";

export const db_file_path = "/usr/share/GeoIP/GeoLiteCity.dat";

export type GeoInfo = {
    countryIso: string | undefined;
    subdivisions: string | undefined;
    city: string | undefined;
    postalCode: string | undefined;
};

/** May reject error */
export function geoiplookup(address: string): Promise<GeoInfo> {

    let child = spawn("geoiplookup", ["-f", db_file_path, address]);

    return new Promise<GeoInfo>(
        (resolve, reject) => {

            const onceData = (data: string | Buffer) => {

                clearTimeout(timer);

                child.removeListener("close", onceClose);

                let parsed = data.toString().match(
                    /^(?:[^\:]*)\:\ ([^,]*),\ (?:[^,]*),\ ([^,]*),\ ([^,]*),\ ([^,]*).*$/m
                );

                if (!parsed) {
                    reject(new Error(`GeoIp infos could not be parsed ${data.toString()}`));
                    return;
                }

                for( let i of [1, 2, 3, 4] ){
                    (parsed as any)[i]= (parsed[i] === "N/A")?
                        undefined : parsed[i];
                }

                resolve({
                    "countryIso": parsed[1].toLowerCase(),
                    "subdivisions": parsed[2],
                    "city": parsed[3],
                    "postalCode": parsed[4]
                });

            };

            const onceClose = () => {

                clearTimeout(timer);

                child.stdout.removeListener("data", onceData);

                reject(new Error("GeoIp close before data"))

            };

            const timer = setTimeout(() => {

                child.kill();
                child.stdout.removeListener("data", onceData);
                child.removeListener("close", onceClose);

                reject(new Error("GeoIp timeout"));

            }, 15000);

            child.stdout.once("data", onceData);

            child.once("close", onceClose);

        }
    );

}

//geoiplookup("70.235.134.249").then(res=> console.log({ res })).catch(err=> console.log({ err }));
