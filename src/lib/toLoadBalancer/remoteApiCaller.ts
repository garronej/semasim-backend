import { apiDeclaration } from "../../sip_api_declarations/loadBalancerToBackend";
import { types as lbTypes } from "../../load-balancer";
import * as sip from "ts-sip";

export function getRunningInstances(
    selfRunningInstance: apiDeclaration.getRunningInstances.Params,
    socket: sip.Socket
): Promise<lbTypes.RunningInstance[]> {

    const methodName = apiDeclaration.getRunningInstances.methodName;
    type Params = apiDeclaration.getRunningInstances.Params;
    type Response = apiDeclaration.getRunningInstances.Response;

    try {

        return sip.api.client.sendRequest<Params, Response>(
            socket,
            methodName,
            selfRunningInstance,
            { "timeout": 1000 }
        );

    } catch{ 

        throw new Error("Load balancer not responding");

    }


}

export function isInstanceStillRunning(
    runningInstance: apiDeclaration.isInstanceStillRunning.Params,
    socket: sip.Socket
): Promise<boolean> {

    const methodName = apiDeclaration.isInstanceStillRunning.methodName;
    type Params = apiDeclaration.isInstanceStillRunning.Params;
    type Response = apiDeclaration.isInstanceStillRunning.Response;

    try {

        return sip.api.client.sendRequest<Params, Response>(
            socket,
            methodName,
            runningInstance,
            { "timeout": 1000 }
        );

    } catch{ 

        throw new Error("Load balancer not responding");

    }

}
