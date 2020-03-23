import { api_decl_loadBalancerToBackend as apiDeclaration } from "../../load-balancer";
import { types as lbTypes } from "../../load-balancer";
import * as sip from "ts-sip";
export declare function getRunningInstances(selfRunningInstance: apiDeclaration.getRunningInstances.Params, socket: sip.Socket): Promise<lbTypes.RunningInstance[]>;
export declare function isInstanceStillRunning(runningInstance: apiDeclaration.isInstanceStillRunning.Params, socket: sip.Socket): Promise<boolean>;
