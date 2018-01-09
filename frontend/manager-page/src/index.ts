import { client as api } from "../../api";

$(document).ready(() => {

	(async ()=>{

		let dongles= await api.getUnregisteredLanDongles();

		console.log(dongles);

	})();


});