import prisma from "../../app/db.server";
import { normalizeDomain } from "../core/domain";
import { logPrivacyEvent } from "./audit";
import type { RedactResult } from "./types";

// ---------------------------------------------------------------------------
// customers/redact core — a customer's right to erasure.
//
// Shopify sends `orders_to_redact` as a list of order GraphQL ids (gid://shopify/Order/…).
// We stored each order under that same gid (see server/orders/shopify/mapOrder.ts), so we can
// match directly. Erasure removes the Order rows AND the pseudonymous visit each was attributed
// to (cascading that visit's funnel events), then flags aggregates stale so the next recompute
// no longer reflects the erased revenue. We hold no customer email/id, so there is nothing else
// to erase — and we never write the customer's identity into the audit log.
// ---------------------------------------------------------------------------

export async function handleCustomerRedact(
  shopDomain: string,
  orderRefs: unknown,
): Promise<RedactResult> {
  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: normalizeDomain(shopDomain) },
    select: { id: true },
  });
  if (!shop) {
    return { status: "ignored", ordersDeleted: 0, sessionsDeleted: 0, reason: "unknown_shop" };
  }

  const ids = Array.from(
    new Set(
      (Array.isArray(orderRefs) ? orderRefs : [])
        .map((r) => (typeof r === "string" || typeof r === "number" ? String(r).trim() : ""))
        .filter(Boolean),
    ),
  );

  let ordersDeleted = 0;
  let sessionsDeleted = 0;

  if (ids.length > 0) {
    const orders = await prisma.order.findMany({
      where: { shopId: shop.id, shopifyOrderId: { in: ids } },
      select: { id: true, attributedSessionId: true },
    });

    const sessionIds = orders
      .map((o) => o.attributedSessionId)
      .filter((x): x is string => typeof x === "string");

    if (sessionIds.length > 0) {
      // Deleting the visit cascades its funnel events; the Order FK is SetNull (moot — the
      // order is deleted next).
      const s = await prisma.visitSession.deleteMany({
        where: { shopId: shop.id, id: { in: sessionIds } },
      });
      sessionsDeleted = s.count;
    }

    if (orders.length > 0) {
      const o = await prisma.order.deleteMany({
        where: { shopId: shop.id, id: { in: orders.map((x) => x.id) } },
      });
      ordersDeleted = o.count;
    }
  }

  // Erased revenue changes the picture → prompt a recompute.
  await prisma.shop
    .update({ where: { id: shop.id }, data: { aggregatesStale: true } })
    .catch(() => {});

  await logPrivacyEvent(shop.id, {
    action: "CUSTOMER_REDACT",
    targetType: "ORDER",
    metadata: { ordersDeleted, sessionsDeleted, requested: ids.length },
  });

  return { status: "redacted", ordersDeleted, sessionsDeleted };
}
