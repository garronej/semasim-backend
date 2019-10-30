"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sip = require("ts-sip");
const backendConnections = require("../toBackend/connections");
const uaConnections = require("../toUa/connections");
const util = require("util");
const gateway_1 = require("../../gateway");
function handle(socket) {
    const onSipPacket = (sipPacket) => {
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
            let backendIpEndpoint = undefined;
            if (sip.matchRequest(sipPacket)) {
                const routes = sipPacket.headers.route;
                if (routes.length > 1) {
                    const routeUri = routes[1].uri;
                    backendIpEndpoint = [routeUri.host, routeUri.port];
                }
            }
            else {
                const vias = sipPacket.headers.via;
                if (vias.length > 2) {
                    const via = vias[vias.length - 2];
                    backendIpEndpoint = [via.host, via.port];
                }
            }
            const nextHopSocket = !!backendIpEndpoint ?
                backendConnections.getByIpEndpoint(...backendIpEndpoint) :
                uaConnections.getByConnectionId(gateway_1.sipRouting.cid.read(sipPacket));
            if (!nextHopSocket) {
                return;
            }
            nextHopSocket.write(nextHopSocket.buildNextHopPacket(sipPacket));
        }
        catch (error) {
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
exports.handle = handle;
