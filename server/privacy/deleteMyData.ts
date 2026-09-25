import prisma from "../../app/db.server";
import { normalizeDomain } from "../core/domain";
import { visitHash } from "../core/hash";
import { logPrivacyEvent } from "./audit";
import type { ForgetVisitResult } from "./types";

// ---------------------------------------------------------------------------
// Visitor-initiated delete-my-data (GDPR/CCPA right to erasure, self-service).
//
// The visitor's browser holds the raw per-visit id (sessionStorage only). To erase their data
// they present that id; we recompute its salted hash and, only on an exact match, delete the
// VisitSession — cascading its funnel events and nulling any order attribution. Possession of
// the raw id IS the proof of ownership (we never stored the raw value, so nobody else can
// produce it). The response is opaque to callers: not-found and erased are indistinguishable
// from the outside, so this can't be used to probe whether a visit exists.
// ---------------------------------------------------------------------------

export async function forgetVisit(
  shopDomain: string,
  clientVisitId: unknown,
): Promise<ForgetVisitResult> {
  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: normalizeDomain(shopDomain) },
    select: { id: true },
  });
  if (!shop) return { status: "ignored", reason: "unknown_shop" };

  if (typeof clientVisitId !== "string" || clientVisitId.trim().length < 8) {
    return { status: "ignored", reason: "invalid_visit_id" };
  }

  const sessionHash = visitHash(shop.id, clientVisitId.trim());
  const session = await prisma.visitSession.findUnique({
    where: { shopId_sessionHash: { shopId: shop.id, sessionHash } },
    select: { id: true },
  });
  if (!session) return { status: "not_found" };

  // Cascade: funnel events deleted, Order.attributedSessionId set null.
  await prisma.visitSession.delete({ where: { id: session.id } });

  // Telemetry changed → prompt a recompute.
  await prisma.shop
    .update({ where: { id: shop.id }, data: { aggregatesStale: true } })
    .catch(() => {});

  await logPrivacyEvent(shop.id, {
    actorType: "VISITOR",
    action: "DELETE_MY_DATA",
    targetType: "VISIT",
    targetId: session.id,
  });

  return { status: "erased" };
}
