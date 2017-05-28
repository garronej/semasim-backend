import { AGIChannel } from "ts-async-agi";
export declare type Scripts = {
    [context: string]: {
        [extensionPattern: string]: (channel: AGIChannel) => Promise<void>;
    };
};
export declare function startServer(scripts: Scripts): Promise<void>;
export declare function dialAndGetOutboundChannel(channel: AGIChannel, dialString: string, outboundHandler: (channel: AGIChannel) => Promise<void>): Promise<void>;
