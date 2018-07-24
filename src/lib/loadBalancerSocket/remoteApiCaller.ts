
import { apiDeclaration } from "../../sip_api_declarations/instanceSockets";
import * as sipLibrary from "ts-sip";

export async function notifyIdentity(
    runningInstance: apiDeclaration.notifyIdentity.Params,
    loadBalancerSocket: sipLibrary.Socket
): Promise<void> {

    const methodName = apiDeclaration.notifyIdentity.methodName;
    type Params = apiDeclaration.notifyIdentity.Params;
    type Response = apiDeclaration.notifyIdentity.Response;

    try {

        await sipLibrary.api.client.sendRequest<Params, Response>(
            loadBalancerSocket,
            methodName,
            runningInstance,
            { "timeout": 1000 }
        );

    } catch{ 

        throw new Error("Load balancer not responding");

    }


}
