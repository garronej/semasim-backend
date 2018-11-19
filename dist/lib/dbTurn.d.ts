import * as f from "../tools/mysqlCustom";
/** exported only for tests */
export declare let query: f.Api["query"];
/** Must be called and awaited before use */
export declare function launch(): void;
/** For test purpose only */
export declare function flush(): Promise<void>;
/**
 * @param instanceId format: `"<urn:uuid:f0c12631-a721-3da9-aa41-7122952b90ba>"`
 */
export declare function renewAndGetCred(instanceId: string): Promise<{
    username: string;
    credential: string;
    revoke: () => Promise<void>;
}>;
