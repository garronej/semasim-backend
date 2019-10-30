
import * as sip from "ts-sip";
import { sipRouting } from "../../gateway";
import * as gatewayConnections from "../toGateway/connections";
import * as uaConnections from "../toUa/connections";

export function handle(socket: sip.Socket) {

    //TODO: We NEED to try catch here as well as we do not fully check the packet at previous hop.
    //TODO: see if readImsi and cid read can throw.
    const onSipPacket = (sipPacket: sip.Packet) => {

        const nextHopSocket = isPacketOriginatedFromUa(sipPacket) ?
            gatewayConnections.getBindedToImsi(sipRouting.readImsi(sipPacket)) :
            uaConnections.getByConnectionId(sipRouting.cid.read(sipPacket))
            ;

        if (!nextHopSocket) {
            return;
        }

        nextHopSocket.write(nextHopSocket.buildNextHopPacket(sipPacket));

    };

    socket.evtRequest.attach(onSipPacket);
    socket.evtResponse.attach(onSipPacket);

}

function isPacketOriginatedFromUa(sipPacket: sip.Packet): boolean {

    /** 
     * true if it's a sipRequest originated of UA 
     * or if it's a sipResponse of a request originated by UA. 
     * */
    const isPacketFromUa = sipPacket.headers.via.slice(-1)[0].protocol !== "TCP";

    return sip.matchRequest(sipPacket) ? isPacketFromUa : !isPacketFromUa;

}