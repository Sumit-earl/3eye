import type { ConnectionQuality, DeviceClass } from "@prisma/client";
import prisma from "../../app/db.server";
import { config } from "./config";
import {
  estimateSegmentLeak,
  type LeakEstimate,
  type SegmentMetrics,
  type ShopBaseline,
} from "./insight";

// ---------------------------------------------------------------------------
// Aggregation layer (Postgres-specific).
//
// Turns raw telemetry for a time window into materialized SegmentSnapshots, then runs
// each through the PURE insight engine (insight.ts) to produce ranked Leaks. Keeping the
// SQL here (and the maths in insight.ts) means the insight engine stays platform-neutral
// for the v3 multi-platform core — only this adapter is Postgres-shaped.
//
// Privacy: only segments with sessionCount >= K are surfaced as leaks (k-anonymity,
// PRD PR-09). Suppressed segments are still stored (aggregate only) but never shown.
// ---------------------------------------------------------------------------

// v1 segmentation dimensions. Deliberately few so segments stay above the k threshold.
// (PLANS/v1 open decision #4 — region granularity is country-level.)
const GROUP_DIMS = ["deviceClass", "connectionQuality", "regionCountry"] as const;

export interface Window {
  windowStart: Date;
  windowEnd: Date;
}

export function trailingWindow(days = 30, now = new Date()): Window {
  const windowEnd = new Date(now);
  const windowStart = new Date(now.getTime() - days * 86_400_000);
  return { windowStart, windowEnd };
}

type SegRow = {
  deviceClass: DeviceClass | null;
  connectionQuality: ConnectionQuality | null;
  regionCountry: string | null;
  sessionCount: number;
  pageviewCount: number;
  addToCartCount: number;
  beginCheckoutCount: number;
  p75Lcp: number | null;
  p75Inp: number | null;
  avgTtfb: number | null;
};

async function fetchBaseline(shopId: string, w: Window): Promise<ShopBaseline> {
  const [sessionCount, beginCheckoutCount, ordersAgg, lcpRows] = await Promise.all([
    prisma.visitSession.count({
      where: {
        shopId,
        startedAt: { gte: w.windowStart, lt: w.windowEnd },
        consent: { not: "DENIED" },
      },
    }),
    prisma.funnelEvent.count({
      where: {
        shopId,
        type: "BEGIN_CHECKOUT",
        occurredAt: { gte: w.windowStart, lt: w.windowEnd },
      },
    }),
    prisma.order.aggregate({
      where: { shopId, placedAt: { gte: w.windowStart, lt: w.windowEnd } },
      _count: { _all: true },
      _sum: { totalCents: true },
    }),
    prisma.$queryRaw<{ p75Lcp: number | null }[]>`
      SELECT percentile_cont(0.75) WITHIN GROUP (ORDER BY fe."lcpMs") AS "p75Lcp"
      FROM "VisitSession" vs
      JOIN "FunnelEvent" fe ON fe."sessionId" = vs."id"
      WHERE vs."shopId" = ${shopId}
        AND vs."startedAt" >= ${w.windowStart}
        AND vs."startedAt" < ${w.windowEnd}
        AND vs."consent" <> 'DENIED'::"ConsentStatus"
    `,
  ]);

  return {
    sessionCount,
    beginCheckoutCount,
    orderCount: ordersAgg._count._all,
    revenueCents: ordersAgg._sum.totalCents ?? 0,
    p75LcpMs: lcpRows[0]?.p75Lcp != null ? Math.round(lcpRows[0].p75Lcp) : null,
  };
}

async function fetchSegments(shopId: string, w: Window): Promise<SegRow[]> {
  return prisma.$queryRaw<SegRow[]>`
    SELECT
      vs."deviceClass"        AS "deviceClass",
      vs."connectionQuality"  AS "connectionQuality",
      vs."regionCountry"      AS "regionCountry",
      COUNT(DISTINCT vs."id")::int                                              AS "sessionCount",
      COUNT(*) FILTER (WHERE fe."type" = 'PAGEVIEW'::"FunnelEventType")::int     AS "pageviewCount",
      COUNT(*) FILTER (WHERE fe."type" = 'ADD_TO_CART'::"FunnelEventType")::int  AS "addToCartCount",
      COUNT(*) FILTER (WHERE fe."type" = 'BEGIN_CHECKOUT'::"FunnelEventType")::int AS "beginCheckoutCount",
      percentile_cont(0.75) WITHIN GROUP (ORDER BY fe."lcpMs")                  AS "p75Lcp",
      percentile_cont(0.75) WITHIN GROUP (ORDER BY fe."inpMs")                  AS "p75Inp",
      AVG(fe."ttfbMs")::float                                                   AS "avgTtfb"
    FROM "VisitSession" vs
    JOIN "FunnelEvent" fe ON fe."sessionId" = vs."id"
    WHERE vs."shopId" = ${shopId}
      AND vs."startedAt" >= ${w.windowStart}
      AND vs."startedAt" < ${w.windowEnd}
      AND vs."consent" <> 'DENIED'::"ConsentStatus"
    GROUP BY vs."deviceClass", vs."connectionQuality", vs."regionCountry"
  `;
}

function rowToMetrics(row: SegRow): SegmentMetrics {
  return {
    deviceClass: row.deviceClass,
    connectionQuality: row.connectionQuality,
    regionCountry: row.regionCountry,
    browserFamily: null,
    connectionType: null,
    sessionCount: row.sessionCount,
    pageviewCount: row.pageviewCount,
    addToCartCount: row.addToCartCount,
    beginCheckoutCount: row.beginCheckoutCount,
    p75LcpMs: row.p75Lcp != null ? Math.round(row.p75Lcp) : null,
    p75InpMs: row.p75Inp != null ? Math.round(row.p75Inp) : null,
    avgTtfbMs: row.avgTtfb != null ? Math.round(row.avgTtfb) : null,
  };
}

export interface AggregateResult {
  shopId: string;
  window: Window;
  windowDays: number;
  baseline: ShopBaseline;
  segmentCount: number;
  suppressedCount: number;
  leakCount: number;
  totalEstImpactCents: number;
}

/**
 * Aggregate one shop's telemetry for a window into SegmentSnapshots + ranked Leaks.
 * Idempotent: re-running the same window replaces its snapshots/leaks.
 */
export async function aggregateShopWindow(
  shopId: string,
  window: Window = trailingWindow(30),
): Promise<AggregateResult> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error(`Shop not found: ${shopId}`);

  const k = config.K_ANONYMITY_MIN;
  const { windowStart, windowEnd } = window;
  const windowDays = Math.max(
    1,
    Math.round((windowEnd.getTime() - windowStart.getTime()) / 86_400_000),
  );

  await prisma.aggregationRun.upsert({
    where: { shopId_windowStart_windowEnd: { shopId, windowStart, windowEnd } },
    create: { shopId, windowStart, windowEnd, windowDays, status: "RUNNING" },
    update: { status: "RUNNING", windowDays, error: null, startedAt: new Date() },
  });

  try {
    const [baseline, rows] = await Promise.all([
      fetchBaseline(shopId, window),
      fetchSegments(shopId, window),
    ]);

    type Enriched = {
      metrics: SegmentMetrics;
      suppressed: boolean;
      leak: LeakEstimate | null;
      rank?: number;
    };

    const enriched: Enriched[] = rows.map((row) => {
      const metrics = rowToMetrics(row);
      const suppressed = metrics.sessionCount < k;
      const leak = suppressed ? null : estimateSegmentLeak(metrics, baseline);
      return { metrics, suppressed, leak };
    });

    // Rank the surfacable leaks by estimated revenue impact (desc).
    const surfacable = enriched.filter((e) => e.leak);
    surfacable.sort((a, b) => (b.leak!.estImpactCents - a.leak!.estImpactCents) || 0);
    surfacable.forEach((e, i) => (e.rank = i + 1));

    // Persist atomically: replace this window's snapshots (cascades old leaks), then insert.
    await prisma.$transaction(async (tx) => {
      await tx.segmentSnapshot.deleteMany({ where: { shopId, windowStart, windowEnd } });

      for (const e of enriched) {
        const m = e.metrics;
        const snap = await tx.segmentSnapshot.create({
          data: {
            shopId,
            windowStart,
            windowEnd,
            deviceClass: m.deviceClass,
            browserFamily: m.browserFamily,
            connectionType: m.connectionType,
            connectionQuality: m.connectionQuality,
            regionCountry: m.regionCountry,
            sessionCount: m.sessionCount,
            pageviewCount: m.pageviewCount,
            addToCartCount: m.addToCartCount,
            beginCheckoutCount: m.beginCheckoutCount,
            conversionRate:
              baseline.sessionCount > 0 ? baseline.orderCount / baseline.sessionCount : null,
            p75LcpMs: m.p75LcpMs,
            p75InpMs: m.p75InpMs,
            avgTtfbMs: m.avgTtfbMs,
            kThreshold: k,
            suppressed: e.suppressed,
          },
        });

        if (e.leak && e.rank != null) {
          await tx.leak.create({
            data: {
              shopId,
              segmentSnapshotId: snap.id,
              rank: e.rank,
              title: e.leak.title,
              whatIsWrong: e.leak.whatIsWrong,
              metric: e.leak.metric,
              estImpactCents: e.leak.estImpactCents,
              windowDays,
              confidence: e.leak.confidence,
              status: e.leak.status,
              method: e.leak.method,
              recommendation: e.leak.recommendation,
            },
          });
        }
      }
    });

    const leakCount = surfacable.length;
    const totalEstImpactCents = surfacable.reduce(
      (sum, e) => sum + (e.leak?.estImpactCents ?? 0),
      0,
    );
    const suppressedCount = enriched.filter((e) => e.suppressed).length;
    const storeCvrBp =
      baseline.sessionCount > 0
        ? Math.round((baseline.orderCount / baseline.sessionCount) * 10_000)
        : null;

    await prisma.aggregationRun.update({
      where: { shopId_windowStart_windowEnd: { shopId, windowStart, windowEnd } },
      data: {
        status: "DONE",
        sessionsProcessed: baseline.sessionCount,
        storeOrders: baseline.orderCount,
        storeRevenueCents: baseline.revenueCents,
        storeCvrBp,
        storeP75LcpMs: baseline.p75LcpMs,
        segmentCount: enriched.length,
        suppressedCount,
        leakCount,
        totalEstImpactCents,
        finishedAt: new Date(),
      },
    });

    // This compute is now the source of truth → clear the "new data since last compute" flag.
    await prisma.shop
      .update({ where: { id: shopId }, data: { aggregatesStale: false } })
      .catch(() => {});

    return {
      shopId,
      window,
      windowDays,
      baseline,
      segmentCount: enriched.length,
      suppressedCount,
      leakCount,
      totalEstImpactCents,
    };
  } catch (err) {
    await prisma.aggregationRun
      .update({
        where: { shopId_windowStart_windowEnd: { shopId, windowStart, windowEnd } },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
          finishedAt: new Date(),
        },
      })
      .catch(() => {});
    throw err;
  }
}
