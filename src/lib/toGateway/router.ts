
import * as sip from "ts-sip";
import * as backendConnections from "../toBackend/connections";
import * as uaConnections from "../toUa/connections";
import * as util from "util";
import { misc as gwMisc } from "../../semasim-gateway";

export function handle(socket: sip.Socket) {

    const onSipPacket = (sipPacket: sip.Packet) => {

        try {

            /* 
            If the flow between the UA and the gateway is routed via 
            an inter instance connection this variable will be set 
            to the socket address of the backend instance holding
            the UA connection.

            undefined when the UA socket is supposed to be hold
            by the current instance. ( the packet can be directly 
            sent to the UA ).
             */
            let backendIpEndpoint: [string, number] | undefined = undefined;

            if (sip.matchRequest(sipPacket)) {

                const routes = sipPacket.headers.route!;

                if (routes.length > 1) {

                    const routeUri = routes[1].uri;

                    backendIpEndpoint = [routeUri.host!, routeUri.port];

                }

            } else {

                const vias = sipPacket.headers.via;

                if (vias.length > 2) {

                    const via = vias[vias.length - 2];

                    backendIpEndpoint = [via.host, via.port];

                }

            }

            const nextHopSocket = !!backendIpEndpoint ?
                backendConnections.getByIpEndpoint(...backendIpEndpoint) :
                uaConnections.getByConnectionId(gwMisc.cid.read(sipPacket));


            if (!nextHopSocket) {
                return;
            }

            nextHopSocket.write(nextHopSocket.buildNextHopPacket(sipPacket));


        } catch (error) {

            socket.destroy([
                "Gateway sent data that made the sip router throw",
                `error: ${util.format(error)}`,
                util.inspect({ sipPacket }, { "depth": 7 })
            ].join("\n"));

        }


    };

    socket.evtRequest.attach(onSipPacket);
    socket.evtResponse.attach(onSipPacket);

}

