import { client as api } from "../../../api";
import * as tools from "../../../tools";

const bootbox: any = global["bootbox"];

function setHandlers(){

	/* Start code from template */
	$("#register-form").validate({
		ignore: 'input[type="hidden"]',
		errorPlacement: function (error, element) {
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
			},
			password1: {
				equalTo: '#password'
			}
		},
		messages: {
			password: {
				required: "Please provide a password",
				minlength: "Your password must be at least 5 characters long"
			},
			email: "Please type your email",
		},
		highlight: function (label) {
			$(label).closest('.form-group').removeClass('has-success').addClass('has-error');
		},
		success: function (label) {
			$(label).closest('.form-group').removeClass('has-error');
			label.remove();
		}
    });
    /* End code from template */

    $("#register-form").on("submit", async function (event) {

        event.preventDefault();

        if (!$(this).valid()) return;

        let email= $("#email").val();
        let password= $("#password").val();

        let regStatus= await api.registerUser( email, password );

        switch( regStatus ){
            case "EMAIL NOT AVAILABLE":

                bootbox.alert(`Semasim account for ${email} has already been created`);

                $("#email").val("");

                break;

            case "CREATED": 

                window.location.href= [
                    "/login",
                    "?",
                    `email-as-hex=${tools.hexString.enc(email)}`,
                    "&",
                    `password-as-hex=${tools.hexString.enc(password)}`
                ].join("");

                break;
        }

    });

}

function handleQueryString(){

    let emailAsHex= tools.getURLParameter("email-as-hex");

    if( emailAsHex ){

        $("#email").val(tools.hexString.dec(emailAsHex));

    }

}

$(document).ready(() => {

    setHandlers();

    handleQueryString();

});