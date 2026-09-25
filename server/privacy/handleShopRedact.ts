import prisma from "../../app/db.server";
import { normalizeDomain } from "../core/domain";
import type { ShopRedactResult } from "./types";

// ---------------------------------------------------------------------------
// shop/redact core — the merchant (shop owner) asks for ALL app data about the shop to be
// erased. This is the strongest erasure we perform.
//
// Two stores of data are keyed differently:
//   • Shopify auth Sessions — keyed by the shop DOMAIN string, with no FK to our Shop row.
//     These must be deleted explicitly.
//   • The Shop row — every tenant table (VisitSession, FunnelEvent, Order, SegmentSnapshot,
//     Leak, AggregationRun, AiConversation/Message, Entitlement, AuditEvent) has
//     onDelete: Cascade to Shop, so deleting the Shop erases the whole tenant atomically.
//
// We cannot keep an audit row for this action (it would reference a shop that no longer exists,
// and retaining it would itself violate the erasure), so we log to the server console only.
// ---------------------------------------------------------------------------

export async function handleShopRedact(shopDomain: string): Promise<ShopRedactResult> {
  const domain = normalizeDomain(shopDomain);

  // Remove auth sessions first (independent of the Shop FK). Safe even if the shop is unknown.
  const authSessions = await prisma.session
    .deleteMany({ where: { shop: domain } })
    .then((r) => r.count)
    .catch(() => 0);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: domain },
    select: { id: true },
  });

  if (!shop) {
    console.info(`[shop/redact] no shop row for ${domain} (removed ${authSessions} auth sessions)`);
    return { status: "ignored", reason: "unknown_shop" };
  }

  // Cascades every tenant table. This is the point of no return — exactly what erasure means.
  await prisma.shop.delete({ where: { id: shop.id } });

  console.info(
    `[shop/redact] erased all data for ${domain} (shop ${shop.id}, ${authSessions} auth sessions)`,
  );
  return { status: "erased" };
}
