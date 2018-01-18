import { client as api } from "../../../api";
import * as tools from "../../../tools";
import { requestRenewPassword } from "./requestRenewPassword";

const bootbox: any = global["bootbox"];

function setHandlers(){

	/* Start import from theme */
	$("#login-form").validate({
		ignore: 'input[type="hidden"]',
		errorPlacement: function( error, element ) {
			var place = element.closest('.input-group');
			if (!place.get(0)) {
				place = element;
			}
			if (error.text() !== '') {
				place.after(error);
			}
		},
		errorClass: 'help-block',
		rules: {
			email: {
				required: true,
				email: true
			},
			password: {
				required: true,
				minlength: 5
			}
		},
		messages: {
			password: {
				required: "Please provide a password",
				minlength: "Your password must be at least 5 characters long"
			},
			email: "Please type your email",
		},
		highlight: function( label ) {
			$(label).closest('.form-group').removeClass('has-success').addClass('has-error');
		},
		success: function( label ) {
			$(label).closest('.form-group').removeClass('has-error');
			label.remove();
		}
    });
	/* End import from theme */

    $("#login-form").on("submit", async function (event) {

        event.preventDefault();

        if (!$(this).valid()) return;

        let isSuccess= await api.loginUser(
            $("#email").val(),
            $("#password").val()
        );

        if( !isSuccess ){
			$("#password").val("");
            bootbox.alert("Authentication failed, please retry");
        }else{
			window.location.href = "/";
        }

	});

	$("#forgot-password").click(event => {

		event.preventDefault();

		requestRenewPassword();

	});

}

function handleQueryString() {

	let emailAsHex = tools.getURLParameter("email-as-hex");

	if (emailAsHex) {
		$("#email").val(tools.hexString.dec(emailAsHex));
	}

	let passwordAsHex = tools.getURLParameter("password-as-hex");

	if (passwordAsHex) {
		$("#password").val(tools.hexString.dec(passwordAsHex));
	}

	if (emailAsHex && passwordAsHex) {
		$("#login-form").submit();
	}

}


$(document).ready(() => {

	setHandlers();

	handleQueryString();

});