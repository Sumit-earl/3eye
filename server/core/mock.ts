import prisma from "../../app/db.server";

// Single source of truth for the mock shop used when MOCK_SHOPIFY=true (no Shopify creds).
// The seed creates this shop; the app resolves it in place of a real authenticated session.
export const MOCK_SHOP_DOMAIN = "mock-shop.myshopify.com";

export function findMockShop() {
  return prisma.shop.findUnique({ where: { shopifyDomain: MOCK_SHOP_DOMAIN } });
}
