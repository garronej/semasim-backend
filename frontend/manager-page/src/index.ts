import { client as api } from "../../api";

$(document).ready(() => {

	console.log("touch");

	(async ()=>{

		let dongles= await api.getUnregisteredLanDongles();

		console.log(dongles);

	})();


});