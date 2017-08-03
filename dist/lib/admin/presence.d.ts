export declare type DeviceState = "UNKNOWN" | "NOT_INUSE" | "INUSE" | "BUSY" | "INVALID" | "UNAVAILABLE" | "RINGING" | "RINGINUSE" | "ONHOLD";
export declare function setDevicePresence(imei: string, deviceState: DeviceState): Promise<void>;
export declare function enableDevicePresenceNotification(imei: string): Promise<void>;
