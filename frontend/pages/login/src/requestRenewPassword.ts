import { client as api } from "../../../api";
import * as tools from "../../../tools";

const bootbox: any = global["bootbox"];

export async function requestRenewPassword() {

	let email = await new Promise<string | null>(
		resolve => bootbox.prompt({
			"title": "Account email?",
			"inputType": "email",
			"value": $("#email").val() || "",
			"callback": result => resolve(result),
		})
	);

	if (!email) return;

	let isSuccess = await api.sendRenewPasswordEmail(email);

	if (isSuccess) {

		bootbox.alert("An email that will let you renew your password have been sent to you");

	} else {

		let shouldProceed = await new Promise<"RETRY" | "REGISTER" | "CANCEL">(
			resolve => bootbox.dialog({
				"title": "Not found",
				"message": `Account ${email} does not exist`,
				"buttons": {
					"cancel": {
						"label": "Retry",
						"callback": () => resolve("RETRY")
					},
					"success": {
						"label": "Register",
						"className": "btn-success",
						"callback": () => resolve("REGISTER")
					}
				},
				"onEscape": () => resolve("CANCEL")
			})
		);

		switch (shouldProceed) {
			case "CANCEL": return;
			case "REGISTER":
				window.location.href = [
					"/register",
					"?",
					`email-as-hex=${tools.hexString.enc(email)}`
				].join("");
				return;
			case "RETRY":
				$("#email").val("");
				requestRenewPassword();
				return;
		}

	}

}