
import * as sip from "ts-sip";
import { SyncEvent } from "ts-events-extended";
import { apiDeclaration } from "../../sip_api_declarations/backendToLoadBalancer";

/*
NOTE: None of those methods can are allowed to throw as 
it would result in the closing of the inter instance socket.

Even if the remote end is a trusted party keep in mind
that some of the handled data are originated from
untrusted party.
those data all passed the sanity check but it 
does not guaranty that the remote client is not 
altered.
*/


export const handlers: sip.api.Server.Handlers = {};

//TODO: use stripe definition
export const evtStripe = new SyncEvent<import("stripe").events.IEvent>();


{

    const methodName = apiDeclaration.notifyStripeEvent.methodName;
    type Params = apiDeclaration.notifyStripeEvent.Params;
    type Response = apiDeclaration.notifyStripeEvent.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "handler": stripeEvent => {

            evtStripe.post(stripeEvent);

            return Promise.resolve(undefined);

        }
    };

    handlers[methodName] = handler;

}
