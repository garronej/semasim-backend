import { DongleController as Dc } from "chan-dongle-extended-client";
/** For test purpose only */
export declare function flush(): Promise<void>;
/** Return user.id_ or undefined */
export declare function addUser(email: string, password: string): Promise<number | undefined>;
/** Return user.id_ or undefined if auth failed */
export declare function authenticateUser(email: string, password: string): Promise<number | undefined>;
export declare function addEndpoint(dongle: Dc.ActiveDongle, user: number): Promise<void>;
export declare function getEndpoints(user: number): Promise<Dc.ActiveDongle[]>;
export declare function deleteUser(user: number): Promise<boolean>;
export declare function deleteEndpoint(imei: string, user: number): Promise<boolean>;
