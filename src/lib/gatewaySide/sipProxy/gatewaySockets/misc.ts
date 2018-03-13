
import { sipLibrary } from "../../../../semasim-gateway";
import * as store from "./store";

export function getSetOfImsiAtCloseTime(gatewaySocket: sipLibrary.Socket): Set<string> {
    return gatewaySocket.misc[ store.__set_of_imsi_on_close__ ];
}