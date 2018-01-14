/// <reference types="jquery" />
/// <reference types="bootstrap" />
/// <reference types="icheck" />
/// <reference types="jquery.validation" />
/// <reference types="jqueryui" />
import { VoidSyncEvent } from "ts-events-extended";
import { declaration } from "../../api";
import Types = declaration.Types;
export declare class SimRow {
    readonly userSim: Types.UserSim.Usable;
    readonly structure: JQuery;
    evtSelected: VoidSyncEvent;
    isSelected: boolean;
    unselect(): void;
    setDetailsVisibility(visibility: "SHOWN" | "HIDDEN"): void;
    setVisibility(visibility: "SHOWN" | "HIDDEN"): void;
    private populate();
    constructor(userSim: Types.UserSim.Usable);
}
