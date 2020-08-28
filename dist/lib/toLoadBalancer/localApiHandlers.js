"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evtStripe = exports.handlers = void 0;
const evt_1 = require("evt");
const load_balancer_1 = require("../../load-balancer");
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
exports.handlers = {};
//TODO: use stripe definition
exports.evtStripe = new evt_1.Evt();
{
    const methodName = load_balancer_1.api_decl_backendToLoadBalancer.notifyStripeEvent.methodName;
    const handler = {
        "handler": stripeEvent => {
            evt_1.Evt.asPostable(exports.evtStripe).post(stripeEvent);
            return Promise.resolve(undefined);
        }
    };
    exports.handlers[methodName] = handler;
}
