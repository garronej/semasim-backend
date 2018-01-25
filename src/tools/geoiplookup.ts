//http://xmodulo.com/geographic-location-ip-address-command-line.html

import { spawn } from "child_process";

const dataFile = "/usr/share/GeoIP/GeoLiteCity.dat";

export type GeoInfo = {
    country: string;
    subdivisions: string;
    city: string;
    postalCode: string;
}

/** May reject error */
export function geoiplookup(address: string): Promise<GeoInfo> {

    let child = spawn("geoiplookup", ["-f", dataFile, address]);

    return new Promise<GeoInfo>(
        (resolve, reject) => {

            let onceData = (data: string | Buffer) => {

                clearTimeout(timer);

                child.removeListener("close", onceClose);

                let parsed = data.toString().match(
                    /^(?:[^\:]*)\:\ ([^,]*),\ (?:[^,]*),\ ([^,]*),\ ([^,]*),\ ([^,]*).*$/m
                );

                if (!parsed) {
                    reject(new Error(`GeoIp infos could not be parsed ${data.toString()}`));
                    return;
                }

                resolve({
                    "country": parsed[1].toLowerCase(),
                    "subdivisions": parsed[2],
                    "city": parsed[3],
                    "postalCode": parsed[4]
                });

            };

            let onceClose = () => {

                clearTimeout(timer);

                child.stdout.removeListener("data", onceData);

                reject(new Error("GeoIp close before data"))

            };

            let timer = setTimeout(() => {

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
