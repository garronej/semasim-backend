"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle = void 0;
const sip = require("ts-sip");
const backendConnections = require("../toBackend/connections");
const gatewayConnections = require("../toGateway/connections");
const gateway_1 = require("../../gateway");
const util = require("util");
function handle(socket, connectionId) {
    const onSipPacket = (sipPacket) => {
        try {
            const imsi = gateway_1.sipRouting.readImsi(sipPacket);
            /*
            First we look if the current process hold the socket to the gateway.
            If not we lookup what process does.
            */
            const nextHopSocket = backendConnections.getBindedToImsi(imsi) ||
                gatewayConnections.getBindedToImsi(imsi);
            if (!nextHopSocket) {
                return;
            }
            const sipPacketNextHop = nextHopSocket.buildNextHopPacket(sipPacket);
            if (sip.matchRequest(sipPacketNextHop)) {
                gateway_1.sipRouting.cid.set(sipPacketNextHop, connectionId);
            }
            nextHopSocket.write(sipPacketNextHop);
        }
        catch (error) {
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
exports.handle = handle;
