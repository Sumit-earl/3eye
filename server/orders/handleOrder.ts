import prisma from "../../app/db.server";
import { normalizeDomain } from "../core/domain";
import { findAttributableSession } from "./attribution";
import { OrderInputSchema, type OrderInput } from "./schema";
import type { OrderOutcome } from "./types";

// ---------------------------------------------------------------------------
// Order ingestion core (platform-neutral).
//
// Given an already-mapped neutral order (or a raw object to validate), resolve the shop,
// idempotently upsert the Order, attempt best-effort attribution, and flag the shop's
// aggregates as stale so the UI can prompt a recompute. No Remix/Shopify imports here — the
// webhook route is a thin adapter over this, mirroring server/ingest.
//
// Idempotency: webhooks are delivered at-least-once and often re-delivered. The Order row is
// keyed on the platform order id (unique), so a repeat is a no-op update, never a duplicate.
// ---------------------------------------------------------------------------

export async function handleOrder(body: unknown): Promise<OrderOutcome> {
  const parsed = OrderInputSchema.safeParse(body);
  if (!parsed.success) return { status: "invalid", reason: "payload" };
  return persistOrder(parsed.data);
}

// Exported for adapters/tests that already hold a validated OrderInput.
export async function persistOrder(input: OrderInput): Promise<OrderOutcome> {
  if (input.isCancelled) return { status: "ignored", reason: "cancelled" };
  if (input.isTest) return { status: "ignored", reason: "test_order" };

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: normalizeDomain(input.shopDomain) },
  });
  if (!shop) return { status: "ignored", reason: "unknown_shop" };
  if (shop.status === "UNINSTALLED") return { status: "ignored", reason: "shop_uninstalled" };

  const attributedSessionId = input.checkoutToken
    ? await findAttributableSession(shop.id, input.checkoutToken, input.placedAt)
    : null;

  const existing = await prisma.order.findUnique({
    where: { shopifyOrderId: input.platformOrderId },
  });
  // Never drop an existing attribution when a re-delivery arrives without the token.
  const finalSessionId = attributedSessionId ?? existing?.attributedSessionId ?? null;

  const data = {
    shopId: shop.id,
    orderNumber: input.orderNumber,
    currency: input.currency,
    totalCents: input.totalCents,
    subtotalCents: input.subtotalCents,
    placedAt: input.placedAt,
    attributedSessionId: finalSessionId,
  };

  try {
    const order = existing
      ? await prisma.order.update({ where: { id: existing.id }, data })
      : await prisma.order.create({
          data: { ...data, shopifyOrderId: input.platformOrderId },
        });
    await markStale(shop.id, input.placedAt);
    return {
      status: existing ? "updated" : "created",
      orderId: order.id,
      attributed: order.attributedSessionId != null,
    };
  } catch (err) {
    // A concurrent order may have claimed this session first (attributedSessionId is unique).
    // Retry once without attribution rather than losing the order entirely.
    if (isUniqueViolation(err) && finalSessionId) {
      const order = existing
        ? await prisma.order.update({
            where: { id: existing.id },
            data: { ...data, attributedSessionId: null },
          })
        : await prisma.order.create({
            data: { ...data, attributedSessionId: null, shopifyOrderId: input.platformOrderId },
          });
      await markStale(shop.id, input.placedAt);
      return { status: existing ? "updated" : "created", orderId: order.id, attributed: false };
    }
    throw err;
  }
}

async function markStale(shopId: string, placedAt: Date): Promise<void> {
  await prisma.shop.update({
    where: { id: shopId },
    data: { aggregatesStale: true, lastOrderAt: placedAt },
  });
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}
