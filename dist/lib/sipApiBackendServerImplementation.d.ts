import { SyncEvent } from "ts-events-extended";
import { sipLibrary } from "../semasim-gateway";
import { DongleController as Dc } from "chan-dongle-extended-client";
import { Session } from "./mainWeb";
export declare function startListening(gatewaySocket: sipLibrary.Socket): void;
export declare function getEvtNewActiveDongle(gatewaySocket: sipLibrary.Socket): SyncEvent<{
    dongle: Dc.ActiveDongle;
    simOwner: Session["auth"] | undefined;
}>;
