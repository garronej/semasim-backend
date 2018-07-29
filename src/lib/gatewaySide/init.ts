//TODO: this should be in sip proxy

import * as tls from "tls";
import * as router from "./router";
import * as sipLibrary from "ts-sip";
import * as gatewaySockets from "./gatewaySockets/store";
import * as clientSideSockets_remoteApi from "./clientSideSockets/remoteApiCaller";
import * as dbSemasim from "../dbSemasim";
import * as logger from "logger";
import * as loadBalancerSocket_localApi from "../loadBalancerSocket/localApiHandlers";


const debug = logger.debugFactory();

export async function beforeExit(): Promise<void> {

    debug("BeforeExit...");

    try {

        await dbSemasim.setSimsOffline(
            Array.from(
                gatewaySockets.byImsi.keys()
            )
        );

    } catch (error) {
        debug(error);

        throw error;
    }

    debug("BeforeExit success");

}

export function init({ server, spoofedLocal }: {
    server: tls.Server,
    spoofedLocal: { address: string; port: number; }
}): void {

    loadBalancerSocket_localApi.evtInstanceUp.attach(function callee(runningInstance) {

        const { interfaceAddress, interInstancesPort } = runningInstance;

        const clientSideSocket = router.createClientSideSocket(
            interfaceAddress,
            interInstancesPort
        );


        if (!clientSideSocket) {
            return;
        }


        clientSideSocket.evtConnect.attachOnce(() =>
            clientSideSockets_remoteApi.notifyRouteFor(
                {
                    "sims": Array.from(gatewaySockets.byImsi.keys()),
                    "gatewaySocketRemoteAddresses": Array.from(gatewaySockets.byRemoteAddress.keys())
                },
                clientSideSocket
            )
        );

        const boundTo = [];

        loadBalancerSocket_localApi.evtInstanceDown.attachOnce(
            id => id.interfaceAddress === interfaceAddress && id.interInstancesPort === interInstancesPort,
            boundTo,
            () => {

                clientSideSocket.evtClose.detach(boundTo);

                clientSideSocket.destroy("Load balancer notified that this instance was down");

            });

        clientSideSocket.evtClose.attachOnce(
            boundTo,
            async () => {

                loadBalancerSocket_localApi.evtInstanceDown.detach(boundTo);

                try {

                    //TODO: finish after compile
                    await loadBalancerSocket_localApi.evtInstanceDown.waitFor(
                        id => id.interfaceAddress === interfaceAddress && id.interInstancesPort === interInstancesPort,
                        4000
                    );


                } catch{

                    debug(`Lost connection with ${interfaceAddress} ${runningInstance.daemonNumber} altho according to load balancer it's still up`);

                    callee(runningInstance);

                }



            }
        );


    });



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

                clientSideSockets_remoteApi.notifyRouteFor({
                    "sims": [],
                    "gatewaySocketRemoteAddresses": [gatewaySocket.remoteAddress]
                });

            }

            gatewaySocket.evtClose.waitFor().then(() => {

                const sims = Array.from(
                    gatewaySockets.getSetOfImsiAtCloseTime(gatewaySocket)
                );

                dbSemasim.setSimsOffline(sims);

                clientSideSockets_remoteApi.notifyLostRouteFor({
                    sims,
                    "gatewaySocketRemoteAddress":
                        gatewaySockets.byRemoteAddress.has(gatewaySocket.remoteAddress) ?
                            undefined : gatewaySocket.remoteAddress
                });


            });


        }
    );

}