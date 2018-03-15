//TODO: this should be in sip proxy

import * as tls from "tls";
import * as dbRunningInstances from "../../dbRunningInstances";
import * as router from "./router";
import { sipLibrary } from "../../../semasim-gateway";
import * as gatewaySockets from "./gatewaySockets/index_sipProxy";
import * as clientSideSockets from "./clientSideSockets/index_sipProxy";
import * as dbSemasim from "../../dbSemasim";

export function launch({server, spoofedLocal}: {
    server: tls.Server,
    spoofedLocal: { address: string; port: number; }
}): void {

    dbRunningInstances.getEvtRunningInstances().attach(
        runningInstances => {

            for (let { interfaceAddress, interInstancesPort } of runningInstances) {

                let clientSideSocket = router.createClientSideSocket(
                    interfaceAddress, 
                    interInstancesPort
                );

                if( !clientSideSocket ){
                    continue;
                }

                clientSideSocket.evtConnect.attachOnce(()=>
                    clientSideSockets.remoteApi.notifyRouteFor(
                        {
                            "sims": Array.from(gatewaySockets.byImsi.keys()),
                            "gatewaySocketRemoteAddresses": Array.from(gatewaySockets.byRemoteAddress.keys())
                        },
                        clientSideSocket!
                    )
                );

                clientSideSocket.evtClose.attachOnce(
                    () => dbRunningInstances.getEvtRunningInstances.trigger()
                );

            }

        }
    );

    server.on("secureConnection",
        socket => {

            let gatewaySocket = new sipLibrary.Socket(
                socket,
                {
                    "localAddress": spoofedLocal.address,
                    "localPort": spoofedLocal.port
                }
            );

            router.onGwConnection(gatewaySocket);

            if (gatewaySockets.byRemoteAddress.get(gatewaySocket.remoteAddress)!.size === 1) {

                clientSideSockets.remoteApi.notifyRouteFor({
                    "sims": [],
                    "gatewaySocketRemoteAddresses": [gatewaySocket.remoteAddress]
                });

            }

            gatewaySocket.evtClose.waitFor().then(() =>{

                let sims= gatewaySockets.getSetOfImsiAtCloseTime(gatewaySocket);

                for( let imsi of sims ){
                    dbSemasim.setSimOffline(imsi);
                }

                clientSideSockets.remoteApi.notifyLostRouteFor({
                    "sims": Array.from(sims),
                    "gatewaySocketRemoteAddress":
                        gatewaySockets.byRemoteAddress.has(gatewaySocket.remoteAddress) ?
                            undefined : gatewaySocket.remoteAddress
                });


            });


        }
    );

}