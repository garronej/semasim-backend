import { AGIChannel } from "ts-async-agi";

export async function diagnostics(channel: AGIChannel) {

    let _ = channel.relax;

    let gain = "4000";

    switch (channel.request.extension) {
        case "1234":

            console.log("Record test with answer after AGC");

            //await _.setVariable("AGC(rx)", "off");
            await _.setVariable("AGC(tx)", gain);

            //await _.setVariable("DENOISE(rx)", "off");
            //await _.setVariable("DENOISE(tx)", "off");

            await _.answer();

            await _.streamFile("demo-echotest", ["#", "*"]);

            await _.recordFile("my-record", "wav", ["#", "*"], 120000, true);

        case "4321":

            console.log("Playback test !");

            if( channel.request.extension === "4321"){
                console.log("AGC off");
                //await _.setVariable("AGC(tx)", "8000");
                /*
                Sur sip sans ajustement du gain il y a une diférence de volume enorme entre le recorde et le fichers
                stradart de son. 
                Si on met le gain afond ça sature pas mais on a du bruit.
                Si on utilise denoise on a une voix métalique.
                */
                await _.answer();
            }

            //await _.streamFile("playback_mode");

            console.log("playback no denoise");
            await _.setVariable("DENOISE(tx)", "off");
            await _.streamFile("my-record");

            console.log("playback denoise");
            await _.setVariable("DENOISE(tx)", "on");
            await _.streamFile("my-record");

            await _.streamFile("demo-echodone");

            await _.hangup();
    }


}