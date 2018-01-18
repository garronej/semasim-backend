/// <reference types="jquery" />
/// <reference types="bootstrap" />
/// <reference types="icheck" />
/// <reference types="jquery.validation" />
/// <reference types="jqueryui" />
import { VoidSyncEvent } from "ts-events-extended";
export declare type ButtonBarState = {
    isSimRowSelected: true;
    isSimSharable: boolean;
    areDetailsShown: boolean;
} | {
    isSimRowSelected: false;
    isSimSharable: false;
    areDetailsShown: false;
};
export declare class ButtonBar {
    readonly structure: JQuery;
    evtClickBack: VoidSyncEvent;
    evtClickDetail: VoidSyncEvent;
    evtClickDelete: VoidSyncEvent;
    evtClickShare: VoidSyncEvent;
    evtClickPhonebook: VoidSyncEvent;
    evtClickRename: VoidSyncEvent;
    evtClickRefresh: VoidSyncEvent;
    private readonly buttons;
    private readonly btnDetail;
    private readonly btnBack;
    private readonly btnDelete;
    private readonly btnShare;
    private readonly btnPhonebook;
    private readonly btnRename;
    private readonly btnReload;
    state: ButtonBarState;
    setState(state: Partial<ButtonBarState>): void;
    constructor();
}
