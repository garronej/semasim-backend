import * as sip from "ts-sip";
import { NonPostableEvt } from "evt";
import * as Stripe from "stripe";
export declare const handlers: sip.api.Server.Handlers;
export declare const evtStripe: NonPostableEvt<Stripe.events.IEvent>;
