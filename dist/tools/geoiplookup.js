"use strict";
//http://xmodulo.com/geographic-location-ip-address-command-line.html
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
exports.db_file_path = "/usr/share/GeoIP/GeoLiteCity.dat";
/** May reject error */
function geoiplookup(address) {
    let child = child_process_1.spawn("geoiplookup", ["-f", exports.db_file_path, address]);
    return new Promise((resolve, reject) => {
        const onceData = (data) => {
            clearTimeout(timer);
            child.removeListener("close", onceClose);
            let parsed = data.toString().match(/^(?:[^\:]*)\:\ ([^,]*),\ (?:[^,]*),\ ([^,]*),\ ([^,]*),\ ([^,]*).*$/m);
            if (!parsed) {
                reject(new Error(`GeoIp infos could not be parsed ${data.toString()}`));
                return;
            }
            for (let i of [1, 2, 3, 4]) {
                parsed[i] = (parsed[i] === "N/A") ?
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
            reject(new Error("GeoIp close before data"));
        };
        const timer = setTimeout(() => {
            child.kill();
            child.stdout.removeListener("data", onceData);
            child.removeListener("close", onceClose);
            reject(new Error("GeoIp timeout"));
        }, 15000);
        child.stdout.once("data", onceData);
        child.once("close", onceClose);
    });
}
exports.geoiplookup = geoiplookup;
//geoiplookup("70.235.134.249").then(res=> console.log({ res })).catch(err=> console.log({ err }));
