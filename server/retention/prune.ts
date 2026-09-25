import prisma from "../../app/db.server";
import { logPrivacyEvent } from "../privacy/audit";

// ---------------------------------------------------------------------------
// Retention pruner (PRD PR-06). Raw telemetry (VisitSession + its FunnelEvents) is deleted once
// it falls outside the shop's retention window. This is a privacy guarantee, not just hygiene:
// we commit to not keeping identifiable-by-join telemetry forever, so we enforce it in code.
//
// Platform-neutral core — no Remix/Shopify imports. The Remix trigger route and the admin
// action are thin adapters over `pruneShopRetention` / `pruneAllShops`.
//
// Design notes:
//   • Cutoff uses the session's LAST activity (endedAt ?? startedAt), so a long-lived visit is
//     only pruned once it has been inactive for the whole window.
//   • Deletes run in fixed-size batches to bound statement size/lock time on large tenants;
//     orders survive (their attribution FK is onDelete:SetNull — old joins just become
//     aggregate-only, which is the honest v1 story anyway).
//   • Every run records a PII-free AuditEvent with coarse counts, and stamps
//     Shop.lastRetentionPruneAt so the admin can see the pruner is alive.
// ---------------------------------------------------------------------------

const BATCH = 1000;
const MS_DAY = 86_400_000;

export interface RetentionPruneResult {
  shopId: string;
  cutoff: Date;
  sessionsDeleted: number;
  eventsDeleted: number;
  batches: number;
}

export async function pruneShopRetention(
  shopId: string,
  now: Date = new Date(),
): Promise<RetentionPruneResult> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { retentionDays: true },
  });
  if (!shop) throw new Error(`pruneShopRetention: unknown shop ${shopId}`);

  const cutoff = new Date(now.getTime() - shop.retentionDays * MS_DAY);
  // A session is stale when its last activity is older than the cutoff.
  const staleWhere = {
    shopId,
    OR: [{ endedAt: { lt: cutoff } }, { endedAt: null, startedAt: { lt: cutoff } }],
  };

  let sessionsDeleted = 0;
  let eventsDeleted = 0;
  let batches = 0;

  for (;;) {
    const batch = await prisma.visitSession.findMany({
      where: staleWhere,
      select: { id: true },
      take: BATCH,
    });
    if (batch.length === 0) break;

    const ids = batch.map((b) => b.id);
    // Delete the child events explicitly (predictable + countable) before the parents.
    const ev = await prisma.funnelEvent.deleteMany({ where: { sessionId: { in: ids } } });
    const sv = await prisma.visitSession.deleteMany({ where: { id: { in: ids } } });
    eventsDeleted += ev.count;
    sessionsDeleted += sv.count;
    batches += 1;

    if (batch.length < BATCH) break; // drained
  }

  await prisma.shop
    .update({ where: { id: shopId }, data: { lastRetentionPruneAt: now } })
    .catch(() => {});

  await logPrivacyEvent(shopId, {
    actorType: "SYSTEM",
    action: "RETENTION_PRUNE",
    metadata: {
      retentionDays: shop.retentionDays,
      cutoff: cutoff.toISOString(),
      sessionsDeleted,
      eventsDeleted,
      batches,
    },
  });

  return { shopId, cutoff, sessionsDeleted, eventsDeleted, batches };
}

export async function pruneAllShops(now: Date = new Date()): Promise<RetentionPruneResult[]> {
  const shops = await prisma.shop.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  const results: RetentionPruneResult[] = [];
  for (const shop of shops) {
    results.push(await pruneShopRetention(shop.id, now));
  }
  return results;
}
