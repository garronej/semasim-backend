
import { handlers as coreHandlers } from "./core";
import { getHandlers as getWebphoneDataHandlers } from "./webphoneData";
import { dbWebphoneData } from "../../dbWebphoneData";
import * as dbSemasim from "../../dbSemasim";
import * as uaRemoteApiCaller from "../remoteApiCaller";
import * as sip from "ts-sip";

export const handlers: sip.api.Server.Handlers = {
    ...coreHandlers,
    ...getWebphoneDataHandlers(dbWebphoneData, dbSemasim, uaRemoteApiCaller)
};