import { client as api, declaration } from "../../api";
import Types = declaration.Types;
import { ButtonBar } from "./ButtonBar";
import { SimRow } from "./SimRow";
import * as registeringProcess from "./registeringProcess";
import * as validateSharingRequestProcess from "./validateSharingRequestProcess";

const bootbox: any = global["bootbox"];

$(document).ready(async function main() {

	console.log("touch!!!!");

	await registeringProcess.start();

	let useableUserSims= await validateSharingRequestProcess.start();

	let structure = $(require("../templates/index.html"));

	$("div.content-inner").html("").append(structure);

	let buttonBar = new ButtonBar();

	structure.find("#_1").append(buttonBar.structure);

	let simRows: SimRow[] = [];

	for (let userSim of useableUserSims) {

		let simRow = new SimRow(userSim);

		structure.find("#_1").append(simRow.structure);

		simRows.push(simRow);

		simRow.evtSelected.attach(() => {

			if( buttonBar.state.isSimRowSelected ){

				simRows.find(
					simRow_ => ( 
						simRow_ !== simRow &&
						simRow_.isSelected
					)
				)!.unselect();

			}

			buttonBar.setState({
				"isSimRowSelected": true,
				"isSimSharable": Types.UserSim.Owned.match(userSim)
			});

		});

	}

	buttonBar.evtClickDetail.attach(() => {

		for( let simRow of simRows ){

			if( simRow.isSelected ){
				simRow.setDetailsVisibility("SHOWN");
			}else{
				simRow.setVisibility("HIDDEN");
			}

		}
			
	});

	buttonBar.evtClickBack.attach(() =>{

		for( let simRow of simRows ){

			if( simRow.isSelected ){
				simRow.setDetailsVisibility("HIDDEN");
			}else{
				simRow.setVisibility("SHOWN");
			}

		}

	});

	buttonBar.evtClickDelete.attach(
		async () => {

			let userSim= simRows.find(({ isSelected })=> isSelected)!.userSim;

			let shouldProceed = await new Promise<boolean>(
				resolve => bootbox.confirm({
					"title": "Unregister SIM",
					"message": `Do you really want to unregister ${userSim.friendlyName}?`,
					callback: result => resolve(result)
				})
			);

			if( shouldProceed ){

				await api.unregisterSim(userSim.sim.imsi);

				buttonBar.evtClickRefresh.post();

			}


		}
	);

	buttonBar.evtClickRename.attach(
		async ()=> {

			let userSim= simRows.find(({ isSelected })=> isSelected)!.userSim;

			let friendlyNameSubmitted = await new Promise<string | null>(
				resolve => bootbox.prompt({
					"title": "Friendly name for this sim?",
					"value": userSim.friendlyName,
					"callback": result => resolve(result),
				})
			);

			if( friendlyNameSubmitted ){

				await api.setSimFriendlyName(userSim.sim.imsi, friendlyNameSubmitted);

				buttonBar.evtClickRefresh.post();

			}

		}
	);

	buttonBar.evtClickRefresh.attach(
		async () => {

			structure.remove();

			await main();

		}
	);

});