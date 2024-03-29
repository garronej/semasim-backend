import { types as dcTypes } from "chan-dongle-extended-client";
export declare namespace genUniq {
    function phoneNumber(): string;
    /** Same function for imei  */
    function imsi(): string;
    function iccid(): string;
}
export declare function generateSim(contactCount?: number, noSpecialChar?: false | "NO SPECIAL CHAR"): dcTypes.Sim;
export declare function genIp(): string;
