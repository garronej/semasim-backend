import { client as api, declaration } from "../../../api";
import Types = declaration.Types;

const bootbox: any = global["bootbox"];

/** return need reedReload */
export async function start(
): Promise<Types.UserSim.Usable[]> {

    let userSims= await api.getSims();

    let usableUserSims= userSims.filter(
            userSim => Types.UserSim.Usable.match(userSim)
    ) as Types.UserSim.Usable[];

    let notConfirmedUserSims= userSims.filter(
        userSim=> Types.UserSim.Shared.NotConfirmed.match(userSim)
    ) as Types.UserSim.Shared.NotConfirmed[];

    for( let notConfirmedUserSim of notConfirmedUserSims ){

        let friendlyNameBase= notConfirmedUserSim.friendlyName;
        let i= 0;

        while( usableUserSims.find(
            ({ friendlyName })=> friendlyName === notConfirmedUserSim.friendlyName) 
        ){
            notConfirmedUserSim.friendlyName= `${friendlyNameBase} (${i++})`;
        }

        let confirmedUserSim= await interact(notConfirmedUserSim);

        if( confirmedUserSim ){
            usableUserSims.push(confirmedUserSim);
        }

    }

    return usableUserSims;


}


export async function interact(
    userSim: Types.UserSim.Shared.NotConfirmed,
): Promise<Types.UserSim.Shared.Confirmed | undefined>{

    let shouldProceed= await new Promise<"ACCEPT"|"REFUSE"|"LATER">(
        resolve=> bootbox.dialog({
            "title": `${userSim.ownership.ownerEmail} would like to share a SIM with you, accept?`,
            "message": userSim.ownership.sharingRequestMessage?
                `«${userSim.ownership.sharingRequestMessage.replace(/\n/g, "<br>")}»`: "",
            "buttons": {
                "cancel": {
                    "label": "Refuse",
                    "callback": () => resolve("REFUSE")
                },
                "success": {
                    "label": "Yes, use this SIM",
                    "className": "btn-success",
                    "callback": () => resolve("ACCEPT")
                }
            },
			"onEscape": ()=> resolve("LATER")
        })
    );

    if( shouldProceed === "LATER" ){
        return undefined;
    }

    if( shouldProceed === "REFUSE" ){

        await api.unregisterSim(userSim.sim.imsi);
        return undefined;

    }

    //TODO: max length for friendly name
    let friendlyNameSubmitted = await new Promise<string | null>(
        resolve => bootbox.prompt({
            "title": "Friendly name for this sim?",
            "value": userSim.friendlyName,
            "callback": result => resolve(result),
        })
    );

    if( friendlyNameSubmitted ){
        userSim.friendlyName= friendlyNameSubmitted;
    }

    await api.setSimFriendlyName(
        userSim.sim.imsi, 
        userSim.friendlyName
    );

    return {
        "sim": userSim.sim,
        "friendlyName": userSim.friendlyName,
        "password": "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
        "isVoiceEnabled": userSim.isVoiceEnabled,
        "isOnline": userSim.isOnline,
        "ownership": {
            "status": "SHARED CONFIRMED",
            "ownerEmail": userSim.ownership.ownerEmail
        }
    };

}
