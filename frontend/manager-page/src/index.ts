import { client as api, declaration } from "../../api";
import Types= declaration.Types;

$(document).ready(() => {

	console.log("touch");

	(async ()=>{

		let dongles= await api.getUnregisteredLanDongles();

		let userSims= await api.getSims();

		$(".content-inner p").html(JSON.stringify(userSims, null, 2).replace(/\n/g, "<br/>"));

	})();


});