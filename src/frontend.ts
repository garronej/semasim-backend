
//TODO: Adapt

import * as types from "../../frontend/shared/dist/lib/types";
import * as webApiDeclaration from "../../frontend/shared/dist/web_api_declaration";
import * as api_decl_backendToUa from "../../frontend/shared/dist/sip_api_declarations/backendToUa";
import * as api_decl_uaToBackend from "../../frontend/shared/dist/sip_api_declarations/uaToBackend";

import * as fs from "fs";
import * as path from "path";

const pagesHtml= { 
    "login": "",
    "register": "",
    "manager": "",
    "webphone": ""
};

const frontend_dir_path= path.join(__dirname, "..", "..", "semasim-frontend");

for (const pageName in pagesHtml) {

    const file_path = path.join(frontend_dir_path, "pages", pageName, `${pageName}.html`);

    const read = ()=> pagesHtml[pageName]= fs.readFileSync( file_path, "utf8");

    fs.watch(file_path, { "persistent": false }, () => read());

    read();

}

const pathToStatic = path.join(frontend_dir_path, "static");

export {
    webApiDeclaration,
    types,
    pagesHtml,
    pathToStatic,
    api_decl_backendToUa,
    api_decl_uaToBackend
};
