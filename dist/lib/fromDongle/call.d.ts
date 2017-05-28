import { AGIChannel } from "ts-async-agi";
export declare const gain: string;
export declare const jitterBuffer: {
    type: string;
    params: string;
};
export declare function call(channel: AGIChannel): Promise<void>;
