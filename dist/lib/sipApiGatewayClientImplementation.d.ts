import { sipApi, sipLibrary } from "../semasim-gateway";
import apiDeclaration = sipApi.gatewayDeclaration;
export declare function init(gatewaySocket: sipLibrary.Socket): void;
export declare function getDongles(gatewaySocket: sipLibrary.Socket): Promise<apiDeclaration.getDongles.Response>;
export declare function unlockDongle(gatewaySocket: sipLibrary.Socket, imei: string, pin: string): Promise<apiDeclaration.unlockDongle.Response | undefined>;
export declare function reNotifySimOnline(gatewaySocket: sipLibrary.Socket, imsi: string): Promise<apiDeclaration.reNotifySimOnline.Response>;
