import * as webApi from "../../api";
import { data } from "./data";

$(document).ready(() => {

	$("#new_endpoint_config").on("submit", event => {

		event.preventDefault();

		let panelModal = $("#panelModal");

		let h1 = panelModal.find(".panel-body h1");

		h1.html(data.wait);

		panelModal.modal("toggle");

		webApi.createUserEndpoint.makeCall(
			$,
			{
				"imei": $("#imei").val(),
				"last_four_digits_of_iccid": $("#last_four_digits_of_iccid").val(),
				"pin_first_try": $("#pin_first_try").val() || undefined,
				"pin_second_try": $("#pin_second_try").val() || undefined
			},
			status => {

				switch (status) {
					case "USER_NOT_LOGGED":
						location.reload();
						break;
					case "SUCCESS":
						h1.html(data.success);
						setTimeout(() => {
							window.scrollTo(0, 0);
							location.reload();
						}, 1000);
						break;
					default:
						h1.html(status.toLowerCase().replace(/_/g, " "));
						break;
				}

			}
		);


	});

	$(".endpoint_config_delete_btn").on("click", function () {

		let imei = $(this).attr("data-semasim-imei");

		webApi.deleteUserEndpoint.makeCall(
			$,
			{ imei },
			status => {

				if (status === "SUCCESS" || status === "USER_NOT_LOGGED")
					location.reload();
				else
					alert(status.toLowerCase().replace(/_/g, " "));

			}
		);
	});

});