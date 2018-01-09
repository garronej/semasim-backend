import { client as api } from "../../api";

$(document).ready(() => {

    $("#login-form").on("submit", async function (event) {

        event.preventDefault();

        if (!$(this).valid()) return;

        let isSuccess= await api.loginUser(
            $("#emailLogin").val(),
            $("#passwordLogin").val()
        );

        if( !isSuccess ){
            alert("Authentication failed, please retry");
        }else{
            location.reload();
        }

    });

    $("#register-form").on("submit", async function (event) {

        event.preventDefault();

        if (!$(this).valid()) return;

        let email= $("#emailRegister").val();
        let password= $("#passwordRegister").val();

        let regStatus= await api.registerUser( email, password );

        switch( regStatus ){
            case "EMAIL NOT AVAILABLE":

                alert("Email already used by an other account");

                $("#emailRegister").val("");

                break;

            case "CREATED": 

                $("#myTab a:first").tab("show");

                $("#emailLogin").val( email);

                $("#passwordLogin").val( password);

                setTimeout(() => $("#btnLogin").trigger("click"), 500);
                
                break;
        }

    });

    //activate tabs
    $(`#myTab a:${(window.location.pathname === "/register.ejs") ? "last" : "first"}`)
        .tab('show');

    //for custom checkboxes
    $('input').not('.noStyle').iCheck({
        "checkboxClass": 'icheckbox_minimal-teal'
    });

    //validate login form 
    $("#login-form").validate({
        "ignore": 'input[type="hidden"]',
        "errorPlacement": (error, element) => {

            let wrap = element.parent();
            let wrap1 = wrap.parent();
            if (wrap1.hasClass('checkbox')) {
                error.insertAfter(wrap1);
            } else {
                if (element.attr('type') == 'file') {
                    error.insertAfter(element.next());
                } else {
                    error.insertAfter(element);
                }
            }

        },
        "errorClass": 'help-block',
        "rules": {
            "email": {
                "required": true,
                "email": true
            },
            "password": {
                "required": true,
                "minlength": 6
            }
        },
        "messages": {
            "password": {
                "required": "Please provide a password",
                "minlength": "Your password must be at least 6 characters long"
            },
            "email": "Please type your email",
        },
        "highlight": element => {

            if ($(element).offsetParent().parent().hasClass("form-group")) {
                $(element).offsetParent().parent().removeClass("has-success").addClass("has-error");
            } else {
                if ($(element).attr("type") == "file") {
                    $(element).parent().parent().removeClass("has-success").addClass("has-error");
                }
                $(element).offsetParent().parent().parent().parent().removeClass("has-success").addClass("has-error");

            }
        },
        "unhighlight": (element, errorClass) => {

            if ($(element).offsetParent().parent().hasClass("form-group")) {
                $(element).offsetParent().parent().removeClass("has-error").addClass("has-success");
                $(element["form"]).find(`label[for=${element.id}]`).removeClass(errorClass);
            } else if ($(element).offsetParent().parent().hasClass('checkbox')) {
                $(element).offsetParent().parent().parent().parent().removeClass("has-error").addClass("has-success");
                $(element["form"]).find(`label[for=${element.id}]`).removeClass(errorClass);
            } else if ($(element).next().hasClass("bootstrap-filestyle")) {
                $(element).parent().parent().removeClass("has-error").addClass("has-success");
            }
            else {
                $(element).offsetParent().parent().parent().removeClass("has-error").addClass("has-success");
            }
        }
    });

});