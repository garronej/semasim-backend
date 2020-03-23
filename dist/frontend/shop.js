"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shopProducts_1 = require("../../../frontend/shared/dist/lib/shopProducts");
const pages_1 = require("./pages");
const deploy_1 = require("../deploy");
const shippingLib = require("../../../frontend/shared/dist/lib/shipping");
exports.shippingLib = shippingLib;
function getShopProducts() {
    let assets_root = pages_1.getAssetsRoot(deploy_1.deploy.getEnv());
    if (assets_root === "/") {
        assets_root = `//web.${deploy_1.deploy.getBaseDomain()}/`;
    }
    assets_root = `https:${assets_root}`;
    return shopProducts_1.getProducts(assets_root);
}
exports.getShopProducts = getShopProducts;
