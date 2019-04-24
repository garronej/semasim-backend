"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_events_extended_1 = require("ts-events-extended");
const backendToLoadBalancer_1 = require("../../sip_api_declarations/backendToLoadBalancer");
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
exports.evtStripe = new ts_events_extended_1.SyncEvent();
{
    const methodName = backendToLoadBalancer_1.apiDeclaration.notifyStripeEvent.methodName;
    const handler = {
        "handler": stripeEvent => {
            exports.evtStripe.post(stripeEvent);
            return Promise.resolve(undefined);
        }
    };
    exports.handlers[methodName] = handler;
}
