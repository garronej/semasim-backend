export declare type DeviceState = "UNKNOWN" | "NOT_INUSE" | "INUSE" | "BUSY" | "INVALID" | "UNAVAILABLE" | "RINGING" | "RINGINUSE" | "ONHOLD";
export declare function setPresence(device: string, deviceState: DeviceState): Promise<void>;
