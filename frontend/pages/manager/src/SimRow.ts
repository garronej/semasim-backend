import { VoidSyncEvent } from "ts-events-extended";
import { declaration } from "../../../api";
import Types= declaration.Types;

require("../templates/SimRow.less");


export class SimRow {

    public readonly structure: JQuery;

    public evtSelected= new VoidSyncEvent();

    public isSelected= false;


    public unselect(){

        this.structure.find(".id_row").removeClass("selected");
        this.isSelected=false;
    }

    public setDetailsVisibility(
        visibility: "SHOWN" | "HIDDEN"
    ) {

        let details = this.structure.find(".id_details");

        switch (visibility) {
            case "SHOWN":
                details.show();
                break;
            case "HIDDEN":
                details.hide();
                break;
        }

    }

    public setVisibility(
        visibility: "SHOWN" | "HIDDEN"
    ){

        switch (visibility) {
            case "SHOWN":
                this.structure.show();
                break;
            case "HIDDEN":
                this.structure.hide();
                break;
        }

    }

    private populate() {

        let number = this.userSim.sim.storage.number;

        this.structure.find(".id_simId").text(
            this.userSim.friendlyName + (number ? ` ( ${number} )` : "")
        );

        this.structure.find(".id_connectivity").text(
            this.userSim.isOnline ? "online" : "offline"
        );

        if (!this.userSim.isOnline) {
            this.structure.find(".id_row").addClass("offline");
        }

        this.structure.find(".id_ownership").text(
            (this.userSim.ownership.status === "OWNED") ?
                "Owned" : 
                `owned by: ${this.userSim.ownership.ownerEmail}`
        );

        this.structure.find(".id_connectivity").text(
            this.userSim.isOnline ? "Online" : "Offline"
        );

        this.structure.find("id_owner").text(
            (this.userSim.ownership.status === "OWNED") ?
                "Me" : this.userSim.ownership.ownerEmail
        );

        this.structure.find("id_number").text(
            this.userSim.sim.storage.number ?
                this.userSim.sim.storage.number :
                "Unknown"
        );

        this.structure.find("id_features").text(
            (() => {

                switch (this.userSim.isVoiceEnabled) {
                    case undefined:
                        return "Probably SMS only";
                    case true:
                        return "Voice calls + SMS"
                    case false:
                        return "SMS only";
                }

            })()
        );

        this.structure.find(".id_serviceProvider").text(
            (() => {

                if (this.userSim.sim.serviceProvider.fromImsi) {
                    return this.userSim.sim.serviceProvider.fromImsi;
                }

                if (this.userSim.sim.serviceProvider.fromNetwork) {
                    return this.userSim.sim.serviceProvider.fromNetwork;
                }

                return "Unknown";

            })()
        );

        this.structure.find(".id_imsi").text(
            this.userSim.sim.imsi
        );

        this.structure.find(".id_iccid").text(
            this.userSim.sim.iccid
        );


        this.structure.find(".id_phonebook").text(
            (() => {

                let n = this.userSim.sim.storage.contacts.length;
                let tot = n + this.userSim.sim.storage.infos.storageLeft;

                return `${n}/${tot}`

            })()
        );

    }

    constructor(
        public readonly userSim: Types.UserSim.Usable
    ) {

        this.structure = $(
            require("../templates/SimRow.html")
        );

        this.structure.click(
            () => {

                if (!this.isSelected) {
                    this.isSelected = true;
                    this.structure.find(".id_row").addClass("selected");
                    this.evtSelected.post();
                }

            }
        );

        this.setDetailsVisibility("HIDDEN");

        this.populate();

    }

}