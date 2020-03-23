
import * as subscription from "../../../frontend/shared/dist/lib/types/subscription";
import * as shop from "../../../frontend/shared/dist/lib/types/shop";
import * as wd from "../../../frontend/shared/dist/lib/types/webphoneData";

export { subscription, shop, wd };

export { connectSidHttpHeaderName } from "../../../frontend/shared/dist/lib/types/connectSidHttpHeaderName";

export * from "../../../frontend/shared/dist/lib/types/WebsocketConnectionParams";
export * from "../../../frontend/shared/dist/lib/types/UserSim";

export type AuthenticatedSessionDescriptorSharedData= import("../../../frontend/shared/dist/lib/localStorage/AuthenticatedSessionDescriptorSharedData")
    .AuthenticatedSessionDescriptorSharedData;