import {
    AsyncAGIServer,
    AGIChannel,
    ChannelStatus,
} from "ts-async-agi";

import { DongleExtendedClient } from "chan-dongle-extended-client";

import * as _debug from "debug";
let debug = _debug("_agi");


export type Scripts = {
    [context: string]: {
        [extensionPattern: string]: (channel: AGIChannel)=> Promise<void>
    };
};

let outboundHandlers: { 
    [context_threadid: string]: (channel: AGIChannel) => Promise<void> 
} = {};

export async function startServer( scripts: Scripts ) {

    await initDialplan(scripts);

    new AsyncAGIServer(async (channel) => {

        let { context, threadid } = channel.request;

        let extensionPattern = await channel.relax.getVariable("EXTENSION_PATTERN");

        if( !extensionPattern ){

            await outboundHandlers[`${context}_${threadid}`](channel);

            return;

        }

        await scripts[context][extensionPattern](channel);

    }, DongleExtendedClient.localhost().ami.connection);

}

export async function dialAndGetOutboundChannel(
    channel: AGIChannel,
    dialString: string,
    outboundHandler: (channel: AGIChannel) => Promise<void>
) {

    let { context, threadid } = channel.request;

    let context_threadid= `${context}_${threadid}`;

    outboundHandlers[context_threadid] = outboundHandler;

    setTimeout(()=> delete outboundHandlers[context_threadid], 2000);

    await channel.relax.exec("Dial", [dialString, "", `b(${context}^outbound^1)`]);

}


async function initDialplan(scripts: Scripts) {

    let ami = DongleExtendedClient.localhost().ami;

    for( let context of Object.keys(scripts) ){

        for( let extensionPattern of Object.keys(scripts[context]) ){

            await ami.dialplanExtensionRemove(extensionPattern, context);

            let priority = 1;
            let pushExt = async (application: string, applicationData?: string) =>
                await ami.dialplanExtensionAdd(context, extensionPattern, priority++, application, applicationData);

            await pushExt("Set", `EXTENSION_PATTERN=${extensionPattern}`);
            //pushExt("DumpChan");
            await pushExt("AGI", "agi:async");
            await pushExt("Hangup");


        }

        let priority = 1;
        let pushExt = async (application: string, applicationData?: string) =>
            await ami.dialplanExtensionAdd(context, "outbound", priority++, application, applicationData);

        await pushExt("AGI", "agi:async");
        await pushExt("Return");

    }



}




/*

export enum DongleStatus {
    DISCONNECTED = 1,
    CONNECTED_AND_FREE = 2,
    CONNECTED_AND_BUSY = 3
}


export async function fromDongle_(channel: AGIChannel): Promise<void> {

    let _ = channel.relax;

    console.log("FROM DONGLE");

    console.log("callerId:", channel.request.callerid);


    let activeDongle = {
        "id": await _.getVariable("DONGLENAME"),
        "provider": await _.getVariable("DONGLEPROVIDER"),
        "imei": await _.getVariable("DONGLEIMEI"),
        "imsi": await _.getVariable("DONGLEIMSI"),
        "number": await _.getVariable("DONGLENUMBER")
    };

    console.log("activeDongle: ", activeDongle);

    let callerId = {
        "name": await _.getVariable("CALLERID(name)"),
        "num": await _.getVariable("CALLERID(num)"),
        "all": await _.getVariable("CALLERID(all)"),
        "ani": await _.getVariable("CALLERID(ani)"),
        "dnid": await _.getVariable("CALLERID(dnid)"),
        "rdnis": await _.getVariable("CALLERID(rdnis)"),
        "pres": await _.getVariable("CALLERID(pres)"),
        "ton": await _.getVariable("CALLERID(ton)")
    };

    console.log("CALLERID: ", callerId);

    let { extension } = channel.request;


        await _.exec("DongleStatus", [activeDongle.id!, "DONGLE_STATUS"]);

        let dongleStatus = parseInt((await _.getVariable("DONGLE_STATUS"))!) as DongleStatus;

        console.log("Dongle status: ", DongleStatus[dongleStatus]);


}


*/
