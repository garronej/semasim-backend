"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle = void 0;
const sip = require("ts-sip");
const gateway_1 = require("../../gateway");
const gatewayConnections = require("../toGateway/connections");
const uaConnections = require("../toUa/connections");
function handle(socket) {
    //TODO: We NEED to try catch here as well as we do not fully check the packet at previous hop.
    //TODO: see if readImsi and cid read can throw.
    const onSipPacket = (sipPacket) => {
        const nextHopSocket = isPacketOriginatedFromUa(sipPacket) ?
            gatewayConnections.getBindedToImsi(gateway_1.sipRouting.readImsi(sipPacket)) :
            uaConnections.getByConnectionId(gateway_1.sipRouting.cid.read(sipPacket));
        if (!nextHopSocket) {
            return;
        }
        nextHopSocket.write(nextHopSocket.buildNextHopPacket(sipPacket));
    };
    socket.evtRequest.attach(onSipPacket);
    socket.evtResponse.attach(onSipPacket);
}
exports.handle = handle;
function isPacketOriginatedFromUa(sipPacket) {
    /**
     * true if it's a sipRequest originated of UA
     * or if it's a sipResponse of a request originated by UA.
     * */
    const isPacketFromUa = sipPacket.headers.via.slice(-1)[0].protocol !== "TCP";
    return sip.matchRequest(sipPacket) ? isPacketFromUa : !isPacketFromUa;
}
