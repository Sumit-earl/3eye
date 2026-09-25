import prisma from "../../app/db.server";
import { checkoutTokenHash } from "../core/hash";

// ---------------------------------------------------------------------------
// Best-effort order → visit attribution.
//
// Shopify checkout is hosted, so a client-side visit usually CANNOT be linked to the order it
// produced (PRD PR-11). When the storefront did hand us a checkout/cart token at handoff, we
// stored a domain-separated hash of it on the VisitSession; the orders/create webhook carries
// the same raw token, so we can join them. This is opportunistic and returns null for the
// majority of orders — the aggregation layer prices leaks from store-level revenue regardless,
// so a null here never blocks the product, it only means "aggregate-only attribution".
// ---------------------------------------------------------------------------

// A visit that handed off to checkout should convert within a short window; beyond this we
// don't trust the token match (protects against token reuse across unrelated visits).
const MAX_ATTRIBUTION_AGE_DAYS = 2;

export async function findAttributableSession(
  shopId: string,
  rawToken: string,
  placedAt: Date,
): Promise<string | null> {
  const hash = checkoutTokenHash(shopId, rawToken);
  const earliest = new Date(placedAt.getTime() - MAX_ATTRIBUTION_AGE_DAYS * 86_400_000);

  const session = await prisma.visitSession.findFirst({
    where: {
      shopId,
      checkoutTokenHash: hash,
      consent: { not: "DENIED" },
      attributedOrder: { is: null }, // not already joined to another order
      startedAt: { gte: earliest, lte: placedAt },
    },
    select: { id: true },
    orderBy: { startedAt: "desc" },
  });

  return session?.id ?? null;
}
