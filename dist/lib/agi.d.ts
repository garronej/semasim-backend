import { AGIChannel } from "ts-async-agi";
export declare const phoneNumberExt = "_[+0-9].";
export declare function startServer(script: (channel: AGIChannel) => Promise<void>): Promise<void>;
export declare function initPjsipSideDialplan(endpoint: string): Promise<void>;
