import * as sip from "ts-sip";
import * as backendConnections from "../toBackend/connections";
import * as gatewayConnections from "../toGateway/connections";
import { sipRouting } from "../../gateway";
import * as util from "util";

export function handle(socket: sip.Socket, connectionId: string) {

    const onSipPacket = (sipPacket: sip.Packet) => {

        try {

            const imsi = sipRouting.readImsi(sipPacket);

            /*
            First we look if the current process hold the socket to the gateway.
            If not we lookup what process does.
            */
            const nextHopSocket =
                backendConnections.getBindedToImsi(imsi) ||
                gatewayConnections.getBindedToImsi(imsi);

            if (!nextHopSocket) {
                return;
            }

            const sipPacketNextHop = nextHopSocket.buildNextHopPacket(sipPacket);

            if (sip.matchRequest(sipPacketNextHop)) {

                sipRouting.cid.set(sipPacketNextHop, connectionId);

            }

            nextHopSocket.write(sipPacketNextHop);

        } catch (error) {

            socket.destroy([
                "Client device sent data that made the sip router throw",
                `error: ${util.format(error)}`,
                util.inspect({ sipPacket }, { "depth": 7 })
            ].join("\n"));

        }

    };

    socket.evtRequest.attach(onSipPacket);
    socket.evtResponse.attach(onSipPacket);

}

