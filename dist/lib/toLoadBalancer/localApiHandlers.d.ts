/// <reference types="stripe" />
import * as sip from "ts-sip";
import { SyncEvent } from "ts-events-extended";
export declare const handlers: sip.api.Server.Handlers;
export declare const evtStripe: SyncEvent<import("stripe").events.IEvent>;
