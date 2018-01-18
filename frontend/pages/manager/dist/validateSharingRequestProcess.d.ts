import { declaration } from "../../../api";
import Types = declaration.Types;
/** return need reedReload */
export declare function start(): Promise<Types.UserSim.Usable[]>;
export declare function interact(userSim: Types.UserSim.Shared.NotConfirmed): Promise<Types.UserSim.Shared.Confirmed | undefined>;
