import { StatusReport, Message } from "chan-dongle-extended-client";
export declare function sms(imei: string, {number, date, text}: Message): Promise<void>;
export declare function statusReport(imei: string, statusReport: StatusReport): Promise<void>;
