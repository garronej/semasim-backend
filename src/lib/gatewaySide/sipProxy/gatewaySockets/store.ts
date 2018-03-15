
import { sipLibrary } from "../../../../semasim-gateway";
import { handlers as localApiHandlers } from "./localApiHandlers";
import * as dbSemasim from "../../../dbSemasim";

const __set_of_imsi__= " set of imsi ";
export const __set_of_imsi_on_close__ = " set of imsi on close ";

export const byRemoteAddress = new Map<string, Set<sipLibrary.Socket>>();

export const byImsi = new Map<string, sipLibrary.Socket>();

const idString= "gatewaySocket";

const server = new sipLibrary.api.Server(
    localApiHandlers,
    sipLibrary.api.Server.getDefaultLogger({ 
        idString,
        "hideKeepAlive": true
    })
);

export function add(gatewaySocket: sipLibrary.Socket): void {

    server.startListening(gatewaySocket);

    sipLibrary.api.client.enableKeepAlive(gatewaySocket);

    sipLibrary.api.client.enableLogging(
        gatewaySocket, 
        sipLibrary.api.client.getDefaultLogger({
            idString
        })
    );

    let { remoteAddress } = gatewaySocket;

    let set = byRemoteAddress.get(remoteAddress) || (() => {

        dbSemasim.addGatewayLocation(remoteAddress);

        let newSet = new Set();

        byRemoteAddress.set(remoteAddress, newSet);

        return newSet;

    })();

    set.add(gatewaySocket);

    gatewaySocket.misc[__set_of_imsi__]= new Set<string>();

    gatewaySocket.evtClose.attachOnce(
        ()=>{

            set.delete(gatewaySocket);

            if ( !set.size ) {

                byRemoteAddress.delete(remoteAddress);

            }

            let setOfImsi: Set<string>= gatewaySocket.misc[__set_of_imsi__];

            gatewaySocket.misc[__set_of_imsi_on_close__]= new Set<string>(setOfImsi);

            for( let imsi of setOfImsi) {

                unbindFromSim(imsi, gatewaySocket);

            }

        }
    );


}

export function bindToSim(
    imsi: string,
    gatewaySocket: sipLibrary.Socket
): void {

    byImsi.set(imsi, gatewaySocket);

    gatewaySocket.misc[__set_of_imsi__].add(imsi);

}

export function unbindFromSim(
    imsi: string,
    gatewaySocket: sipLibrary.Socket
): void {

    gatewaySocket.misc[__set_of_imsi__].delete(imsi);

    //TODO: should be unnecessary
    if (byImsi.get(imsi) !== gatewaySocket) {
        return;
    }

    byImsi.delete(imsi);

}

