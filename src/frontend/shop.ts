
import { getProducts } from "../../../frontend/shared/dist/lib/shopProducts";
import { getAssetsRoot } from "./pages";
import { deploy } from "../deploy";

import * as shippingLib from "../../../frontend/shared/dist/lib/shipping";

export { shippingLib };

export function getShopProducts() {

    let assets_root = getAssetsRoot(deploy.getEnv());

    if (assets_root === "/") {
        assets_root = `//web.${deploy.getBaseDomain()}/`;
    }

    assets_root = `https:${assets_root}`;

    return getProducts(assets_root);

}