import {
    AsyncAGIServer,
    AGIChannel as _AGIChannel_,
    ChannelStatus,
} from "ts-async-agi";

import { DongleExtendedClient } from "chan-dongle-extended-client";

import * as _debug from "debug";
let debug = _debug("_agiClient");

export type AGIChannel= _AGIChannel_;

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

            //We send to outbound

            await outboundHandlers[`${context}_${threadid}`](channel);

            return;

        }

        //We call specific script
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

    try{

        let { failure } = await channel.exec("Dial", [dialString, "", `b(${context}^outbound^1)`]);

        return failure;

    }catch(error){

        return true;

    }

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
