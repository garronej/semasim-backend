export declare const getLocalRunningInstance: () => lbTypes.RunningInstance;
import { types as lbTypes } from "../load-balancer";
export declare function beforeExit(): Promise<void>;
export declare function launch(daemonNumber: number): Promise<void>;
