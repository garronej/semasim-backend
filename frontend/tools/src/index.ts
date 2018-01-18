

export function getURLParameter(sParam: string): string | undefined {

    let sPageURL = window.location.search.substring(1);

    let sURLVariables = sPageURL.split("&");

	for (var i = 0; i < sURLVariables.length; i++) {

        let sParameterName = sURLVariables[i].split("=");

		if (sParameterName[0] == sParam) {

			return sParameterName[1];
		}
	}
}

export const hexString = {
    "enc": (str: string): string => {

        let hex, i;

        let result = "";

        for (i = 0; i < str.length; i++) {
            hex = str.charCodeAt(i).toString(16);
            result += ("000" + hex).slice(-4);
        }

        return result;

    },
    "dec": (encStr: string): string => {

        let j;
        let hexes = encStr.match(/.{1,4}/g) || [];
        let back = "";
        for (j = 0; j < hexes.length; j++) {
            back += String.fromCharCode(parseInt(hexes[j], 16));
        }

        return back;


    }
};
