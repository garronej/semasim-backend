import { types as gwTypes } from "../../../../semasim-gateway";
import * as sipLibrary from "ts-sip";
import * as apiDeclaration from "../../../sipApiDeclarations/semasimBackend/clientSide/gatewaySideSockets";
import * as store from "./store";

export async function notifyRouteFor(
    targets: {
        sims?: string[];
        gatewaySocketRemoteAddresses?: string[];
    },
    clientSideSocketTargeted?: sipLibrary.Socket,
): Promise<{ rejectedSims: string[]; }>{

    let methodName = apiDeclaration.notifyRouteFor.methodName;
    type Params = apiDeclaration.notifyRouteFor.Params;
    type Response = apiDeclaration.notifyRouteFor.Response;

    let sims = targets.sims || [];
    let gatewaySocketRemoteAddresses = targets.gatewaySocketRemoteAddresses || [];

    const reduceResponses= (responses: Response[])=> ({
            "rejectedSims": responses
                .map(({ rejectedSims }) => rejectedSims)
                .reduce((out, elem) => [...out, ...elem], [])
    });

    let arrOfParams = (() => {

        let sims_copy= [ ...sims ];
        let gatewaySocketRemoteAddresses_copy= [ ...gatewaySocketRemoteAddresses ];

        let arrOfSims: string[][] = [];

        while (!!sims_copy.length) {
            arrOfSims.push(sims_copy.splice(0, 100));
        }

        let arrOfAddr: string[][] = [];

        while (!!gatewaySocketRemoteAddresses_copy.length) {
            arrOfAddr.push(gatewaySocketRemoteAddresses_copy.splice(0, 100));
        }

        let out: Params[] = [];


        while (!!arrOfSims.length || !!arrOfAddr.length) {

            out.push({
                "sims": arrOfSims.pop() || [],
                "gatewaySocketRemoteAddresses": arrOfAddr.pop() || []
            });

        }

        return out;

    })();

    if (arrOfParams.length > 1) {

        let tasks: Promise<Response>[] = [];

        for (let params of arrOfParams) {

            tasks[tasks.length] = notifyRouteFor(params, clientSideSocketTargeted);

        }

        return reduceResponses(await Promise.all(tasks));

    }

    let tasks: Promise<Response>[] = [];

    for (
        let clientSideSocket
        of
        (clientSideSocketTargeted ? [clientSideSocketTargeted] : store.getAll())
    ) {

        tasks[tasks.length] = (async () => {

            try {

                return await sipLibrary.api.client.sendRequest<Params, Response>(
                    clientSideSocket,
                    methodName,
                    { sims, gatewaySocketRemoteAddresses },
                    { "timeout": 5 * 1000 }
                );

            } catch{

                return { "rejectedSims": [] };

            }

        })();

    }

    return reduceResponses(await Promise.all(tasks));

}

export async function notifyLostRouteFor(
    targets: { sims: string[]; gatewaySocketRemoteAddress?: string; }
): Promise<void> {

    let methodName = apiDeclaration.notifyLostRouteFor.methodName;
    type Params = apiDeclaration.notifyLostRouteFor.Params;
    type Response = apiDeclaration.notifyLostRouteFor.Response;

    let tasks: Promise<undefined>[] = [];

    for (let clientSideSocket of store.getAll()) {

        tasks[tasks.length] = (async () => {

            try {

                return await sipLibrary.api.client.sendRequest<Params, Response>(
                    clientSideSocket,
                    methodName,
                    targets,
                    { "timeout": 5 * 1000 }
                );

            } catch{

                return undefined;

            }

        })();

    }

    await Promise.all(tasks);

}

export async function qualifyContact(
    contact: gwTypes.Contact
): Promise<boolean> {

    let methodName = apiDeclaration.qualifyContact.methodName;
    type Params = apiDeclaration.qualifyContact.Params;
    type Response = apiDeclaration.qualifyContact.Response;

    let clientSideSocket = store.get(contact);

    if (!clientSideSocket) {

        return false;

    }

    try {

        return await sipLibrary.api.client.sendRequest<Params, Response>(
            clientSideSocket,
            methodName,
            contact,
            { "timeout": 5 * 1000 }
        );

    } catch{

        return false;

    }

}

export async function destroyClientSocket(
    contact: gwTypes.Contact
): Promise<void> {

    let methodName = apiDeclaration.destroyClientSocket.methodName;
    type Params = apiDeclaration.destroyClientSocket.Params;
    type Response = apiDeclaration.destroyClientSocket.Response;

    let clientSideSocket = store.get(contact);

    if (!clientSideSocket) {

        return;

    }

    try {

        await sipLibrary.api.client.sendRequest<Params, Response>(
            clientSideSocket,
            methodName,
            contact,
            { "timeout": 5 * 1000 }
        );

    } catch{ }

}