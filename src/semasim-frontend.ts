
//TODO: Adapt

import * as types from "../../semasim-frontend/shared/dist/lib/types";
import * as webApiDeclaration from "../../semasim-frontend/shared/dist/web_api_declaration";
import * as api_decl_backendClientSideSocket from "../../semasim-frontend/shared/dist/sip_api_declarations/backendClientSideSocket";
import * as api_decl_clientSockets from "../../semasim-frontend/shared/dist/sip_api_declarations/clientSockets";

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

    const load = ()=> pagesHtml[pageName]= fs.readFileSync( file_path, "utf8");

    fs.watch(file_path, () => load());

    load();

}

const pathToStatic: string = path.join(frontend_dir_path, "static");

export {
    webApiDeclaration,
    types,
    pagesHtml,
    pathToStatic,
    api_decl_backendClientSideSocket,
    api_decl_clientSockets
};
