import { AGIChannel } from "ts-async-agi";
export declare function startServer(script: (channel: AGIChannel) => Promise<void>): Promise<void>;
