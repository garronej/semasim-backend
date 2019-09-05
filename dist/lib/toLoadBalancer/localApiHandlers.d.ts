import * as sip from "ts-sip";
import { SyncEvent } from "ts-events-extended";
import * as Stripe from "stripe";
export declare const handlers: sip.api.Server.Handlers;
export declare const evtStripe: SyncEvent<Stripe.events.IEvent>;
