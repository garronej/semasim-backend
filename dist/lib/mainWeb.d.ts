export interface Session extends Express.Session {
    auth?: Session.Auth;
}
export declare namespace Session {
    type Auth = {
        user: number;
        email: string;
    };
}
export declare function start(): Promise<void>;
