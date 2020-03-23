import * as sip from "ts-sip";
import { Evt } from "evt";
import * as Stripe from "stripe";
export declare const handlers: sip.api.Server.Handlers;
export declare const evtStripe: Evt<Stripe.events.IEvent>;
