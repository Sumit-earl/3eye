import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { config, isMockShopify } from "../../server/core/config";
import { findMockShop } from "../../server/core/mock";

// ---------------------------------------------------------------------------
// Resolves "which shop is this request for" behind one seam.
//
//   • MOCK_SHOPIFY=true  → the seeded mock shop, no Shopify round-trip (code-first dev).
//   • MOCK_SHOPIFY=false → real embedded admin auth via @shopify/shopify-app-remix, and we
//     lazily create the Shop row on first authenticated load.
//
// Every /app route calls this instead of touching `authenticate` directly, so flipping to
// real Shopify later is a single env change, not a rewrite of each loader.
// ---------------------------------------------------------------------------

export interface ShopContext {
  shopId: string;
  shopDomain: string;
  currency: string;
  timezone: string;
  retentionDays: number;
  isMock: boolean;
  // Present only in real mode: the Shopify CORS helper for action responses.
  cors?: (response: Response) => Response;
}

export async function requireShopContext(request: Request): Promise<ShopContext> {
  if (isMockShopify) {
    const shop = await findMockShop();
    if (!shop) {
      throw new Response("Mock shop not found — run `pnpm db:seed` first.", { status: 500 });
    }
    return {
      shopId: shop.id,
      shopDomain: shop.shopifyDomain,
      currency: shop.currency,
      timezone: shop.timezone,
      retentionDays: shop.retentionDays,
      isMock: true,
    };
  }

  const { session, cors } = await authenticate.admin(request);
  const shop = await prisma.shop.upsert({
    where: { shopifyDomain: session.shop },
    create: {
      shopifyDomain: session.shop,
      currency: config.DEFAULT_CURRENCY,
    },
    update: {},
  });

  return {
    shopId: shop.id,
    shopDomain: shop.shopifyDomain,
    currency: shop.currency,
    timezone: shop.timezone,
    retentionDays: shop.retentionDays,
    isMock: false,
    cors,
  };
}
