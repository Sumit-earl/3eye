import prisma from "../db.server";
import { aggregateShopWindow, trailingWindow } from "../../server/core/aggregate";

// Re-exported through this .server module so routes never import a non-.server file that
// transitively touches process/Prisma (which would risk landing in the client bundle).
export { resolveEntitlement } from "../../server/core/entitlement";

// ---------------------------------------------------------------------------
// Read side for the Revenue Leaks dashboard. Everything here is a plain read of already-
// materialized rows (AggregationRun + its Leaks/SegmentSnapshots) so the page loads fast and
// the header numbers always describe the SAME window as the leaks shown. Recompute is a
// separate, explicit action (and later a cron), never on page load.
// ---------------------------------------------------------------------------

export interface DashboardLeak {
  id: string;
  rank: number;
  title: string;
  whatIsWrong: string;
  metric: string;
  estImpactCents: number;
  windowDays: number;
  confidence: string;
  status: string;
  method: string;
  recommendation: string;
  computedAt: string;
  segment: {
    sessionCount: number;
    beginCheckoutCount: number;
    p75LcpMs: number | null;
  };
}

export interface DashboardRun {
  windowStart: string;
  windowEnd: string;
  windowDays: number;
  finishedAt: string | null;
  sessionsProcessed: number;
  storeOrders: number;
  storeRevenueCents: number;
  storeCvrBp: number | null;
  storeP75LcpMs: number | null;
  segmentCount: number;
  suppressedCount: number;
  leakCount: number;
  totalEstImpactCents: number;
}

export interface DashboardData {
  run: DashboardRun | null;
  leaks: DashboardLeak[];
  // True when order/telemetry data landed after the last compute — the UI can prompt a refresh.
  stale: boolean;
  // Best-effort order→visit join coverage over the run window (honesty metric: most orders are
  // aggregate-only because Shopify checkout is hosted).
  attribution: { total: number; attributed: number } | null;
}

export async function getDashboardData(shopId: string): Promise<DashboardData> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { aggregatesStale: true },
  });

  const run = await prisma.aggregationRun.findFirst({
    where: { shopId, status: "DONE" },
    orderBy: { windowEnd: "desc" },
  });

  if (!run) return { run: null, leaks: [], stale: shop?.aggregatesStale ?? false, attribution: null };

  const window = { gte: run.windowStart, lt: run.windowEnd };
  const [leaks, ordersTotal, ordersAttributed] = await Promise.all([
    prisma.leak.findMany({
      where: {
        shopId,
        segmentSnapshot: { windowStart: run.windowStart, windowEnd: run.windowEnd },
      },
      orderBy: { rank: "asc" },
      include: { segmentSnapshot: true },
    }),
    prisma.order.count({ where: { shopId, placedAt: window } }),
    prisma.order.count({
      where: { shopId, placedAt: window, attributedSessionId: { not: null } },
    }),
  ]);

  return {
    stale: shop?.aggregatesStale ?? false,
    attribution: { total: ordersTotal, attributed: ordersAttributed },
    run: {
      windowStart: run.windowStart.toISOString(),
      windowEnd: run.windowEnd.toISOString(),
      windowDays: run.windowDays,
      finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
      sessionsProcessed: run.sessionsProcessed,
      storeOrders: run.storeOrders,
      storeRevenueCents: run.storeRevenueCents,
      storeCvrBp: run.storeCvrBp,
      storeP75LcpMs: run.storeP75LcpMs,
      segmentCount: run.segmentCount,
      suppressedCount: run.suppressedCount,
      leakCount: run.leakCount,
      totalEstImpactCents: run.totalEstImpactCents,
    },
    leaks: leaks.map((l) => ({
      id: l.id,
      rank: l.rank,
      title: l.title,
      whatIsWrong: l.whatIsWrong,
      metric: l.metric,
      estImpactCents: l.estImpactCents,
      windowDays: l.windowDays,
      confidence: l.confidence,
      status: l.status,
      method: l.method,
      recommendation: l.recommendation,
      computedAt: l.computedAt.toISOString(),
      segment: {
        sessionCount: l.segmentSnapshot.sessionCount,
        beginCheckoutCount: l.segmentSnapshot.beginCheckoutCount,
        p75LcpMs: l.segmentSnapshot.p75LcpMs,
      },
    })),
  };
}

// Recompute the trailing window for a shop. Returns the fresh dashboard payload so the
// action can hand it straight back to the UI.
export async function recompute(shopId: string, days = 30): Promise<DashboardData> {
  await aggregateShopWindow(shopId, trailingWindow(days));
  return getDashboardData(shopId);
}
