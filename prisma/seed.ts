import "../server/env";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { aggregateShopWindow, trailingWindow } from "../server/core/aggregate";
import { segmentLabel, humanMs, humanPct } from "../server/core/insight";
import { MOCK_SHOP_DOMAIN } from "../server/core/mock";

// Seed = plan catalog + one mock shop + synthetic telemetry engineered so a real,
// honest leak emerges, plus one sub-threshold segment to prove k-anonymity suppression.
// Lets the whole product run with zero Shopify credentials (MOCK_SHOPIFY=true).

const prisma = new PrismaClient();

// --- helpers ---------------------------------------------------------------

function gaussian(mean: number, std: number, min = 0): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(min, Math.round(mean + n * std));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function daysAgo(maxDays: number): Date {
  return new Date(Date.now() - Math.random() * maxDays * 86_400_000);
}

// --- plan catalog (PLANS/v2 pricing, anchored to Zuko/Exatom) ----------------

const PLANS = [
  {
    code: "FREE" as const,
    name: "Free",
    priceCents: 0,
    sessionLimitMonthly: 5000,
    maxLeaksShown: 1,
    historyDays: 7,
    features: { aiChat: false, comparison: false, alerts: false, digest: false },
    sortOrder: 0,
  },
  {
    code: "STARTER" as const,
    name: "Starter",
    priceCents: 2900,
    sessionLimitMonthly: 10000,
    maxLeaksShown: 5,
    historyDays: 90,
    features: { aiChat: false, comparison: false, alerts: false, digest: true },
    sortOrder: 1,
  },
  {
    code: "GROWTH" as const,
    name: "Growth",
    priceCents: 7900,
    sessionLimitMonthly: 25000,
    maxLeaksShown: -1,
    historyDays: 365,
    features: { aiChat: true, comparison: true, alerts: true, digest: true },
    sortOrder: 2,
  },
  {
    code: "SCALE" as const,
    name: "Scale",
    priceCents: 19900,
    sessionLimitMonthly: 50000,
    maxLeaksShown: -1,
    historyDays: 730,
    features: { aiChat: true, comparison: true, alerts: true, digest: true },
    sortOrder: 3,
  },
];

// --- synthetic traffic profiles --------------------------------------------

type Profile = {
  weight: number; // relative session count
  deviceClass: "MOBILE" | "TABLET" | "DESKTOP";
  browserFamily: "CHROME" | "SAFARI" | "FIREFOX" | "EDGE" | "SAMSUNG";
  osFamily: "IOS" | "ANDROID" | "WINDOWS" | "MACOS";
  connectionType: "CELLULAR" | "WIFI" | "ETHERNET";
  connectionQuality: "G4" | "G3" | "G2" | "SLOW_2G";
  regionCountry: string;
  screenBucket: "small" | "medium" | "large";
  lcpMean: number;
  lcpStd: number;
  ttfbMean: number;
  atcProb: number; // P(add-to-cart | session)
  bcProb: number; // P(begin-checkout | session)
};

const SESSION_SCALE = 1200; // multiplier for profile weights
const PROFILES: Profile[] = [
  // Healthy desktop baseline
  { weight: 1.0, deviceClass: "DESKTOP", browserFamily: "CHROME", osFamily: "WINDOWS", connectionType: "ETHERNET", connectionQuality: "G4", regionCountry: "US", screenBucket: "large", lcpMean: 1700, lcpStd: 300, ttfbMean: 250, atcProb: 0.28, bcProb: 0.2 },
  // Decent mobile on fast network
  { weight: 0.66, deviceClass: "MOBILE", browserFamily: "SAFARI", osFamily: "IOS", connectionType: "WIFI", connectionQuality: "G4", regionCountry: "US", screenBucket: "small", lcpMean: 2400, lcpStd: 400, ttfbMean: 350, atcProb: 0.22, bcProb: 0.17 },
  // Mid-tier mobile, medium connection (Brazil)
  { weight: 0.25, deviceClass: "MOBILE", browserFamily: "CHROME", osFamily: "ANDROID", connectionType: "CELLULAR", connectionQuality: "G3", regionCountry: "BR", screenBucket: "small", lcpMean: 3600, lcpStd: 600, ttfbMean: 650, atcProb: 0.16, bcProb: 0.13 },
  // HERO LEAK: slow mobile on a weak connection (Brazil) — high LCP, low checkout reach
  { weight: 0.5, deviceClass: "MOBILE", browserFamily: "CHROME", osFamily: "ANDROID", connectionType: "CELLULAR", connectionQuality: "G2", regionCountry: "BR", screenBucket: "small", lcpMean: 6800, lcpStd: 1200, ttfbMean: 1400, atcProb: 0.12, bcProb: 0.09 },
  // Sub-threshold segment (below k) → must be SUPPRESSED, never surfaced
  { weight: 0.033, deviceClass: "TABLET", browserFamily: "SAFARI", osFamily: "IOS", connectionType: "WIFI", connectionQuality: "G4", regionCountry: "GB", screenBucket: "medium", lcpMean: 2200, lcpStd: 400, ttfbMean: 300, atcProb: 0.2, bcProb: 0.15 },
];

const AOV_CENTS = 6500; // ~$65 average order
const OVERALL_CVR = 0.02; // ~2% session→order (typical ecommerce)

async function main() {
  console.log("Seeding 3eye…");

  // 1) Plans (idempotent upsert)
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { code: p.code },
      create: { ...p, features: p.features as object },
      update: { ...p, features: p.features as object },
    });
  }
  // The mock shop is placed on GROWTH so the local demo exercises the full product
  // (all leaks unlocked + the paid-gated AI conversation). Flip to FREE to see gating.
  const demoPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "GROWTH" } });

  // 2) Mock shop + demo (GROWTH) entitlement
  const shop = await prisma.shop.upsert({
    where: { shopifyDomain: MOCK_SHOP_DOMAIN },
    create: {
      shopifyDomain: MOCK_SHOP_DOMAIN,
      name: "Mock Shop (demo)",
      currency: "USD",
      timezone: "America/New_York",
    },
    update: { name: "Mock Shop (demo)", status: "ACTIVE", uninstalledAt: null },
  });
  await prisma.entitlement.upsert({
    where: { shopId: shop.id },
    create: { shopId: shop.id, planId: demoPlan.id, status: "ACTIVE" },
    update: { planId: demoPlan.id, status: "ACTIVE" },
  });

  // 3) Clear prior telemetry/aggregates for a clean, repeatable seed
  await prisma.leak.deleteMany({ where: { shopId: shop.id } });
  await prisma.segmentSnapshot.deleteMany({ where: { shopId: shop.id } });
  await prisma.funnelEvent.deleteMany({ where: { shopId: shop.id } });
  await prisma.order.deleteMany({ where: { shopId: shop.id } });
  await prisma.visitSession.deleteMany({ where: { shopId: shop.id } });
  await prisma.aggregationRun.deleteMany({ where: { shopId: shop.id } });

  // 4) Generate sessions + funnel events
  type S = {
    id: string; shopId: string; sessionHash: string; consent: "GRANTED";
    startedAt: Date; deviceClass: Profile["deviceClass"]; browserFamily: Profile["browserFamily"];
    osFamily: Profile["osFamily"]; connectionType: Profile["connectionType"];
    connectionQuality: Profile["connectionQuality"]; regionCountry: string;
    screenBucket: string; secureContext: boolean;
  };
  type E = {
    id: string; shopId: string; sessionId: string;
    type: "PAGEVIEW" | "ADD_TO_CART" | "BEGIN_CHECKOUT";
    pageKind: "HOME" | "PRODUCT" | "CART" | "CHECKOUT";
    occurredAt: Date; lcpMs: number | null; inpMs: number | null;
    clsScore: number | null; ttfbMs: number | null; fcpMs: number | null;
  };

  const sessions: S[] = [];
  const events: E[] = [];
  let totalSessions = 0;

  for (const prof of PROFILES) {
    const count = Math.round(prof.weight * SESSION_SCALE);
    for (let i = 0; i < count; i++) {
      const id = randomUUID();
      const startedAt = daysAgo(29);
      totalSessions++;
      sessions.push({
        id, shopId: shop.id, sessionHash: `seed-${id}`, consent: "GRANTED",
        startedAt, deviceClass: prof.deviceClass, browserFamily: prof.browserFamily,
        osFamily: prof.osFamily, connectionType: prof.connectionType,
        connectionQuality: prof.connectionQuality, regionCountry: prof.regionCountry,
        screenBucket: prof.screenBucket, secureContext: true,
      });

      const lcp = gaussian(prof.lcpMean, prof.lcpStd, 400);
      const ttfb = gaussian(prof.ttfbMean, 120, 50);
      const inp = gaussian(prof.deviceClass === "MOBILE" ? 260 : 140, 60, 20);
      const fcp = Math.round(lcp * 0.5);
      const cls = Number((Math.random() * 0.15).toFixed(3));

      // Home pageview (every session)
      events.push({ id: randomUUID(), shopId: shop.id, sessionId: id, type: "PAGEVIEW", pageKind: "HOME", occurredAt: startedAt, lcpMs: lcp, inpMs: inp, clsScore: cls, ttfbMs: ttfb, fcpMs: fcp });

      // Product view (most sessions) — carries the latency that matters most
      if (Math.random() < 0.8) {
        const t = new Date(startedAt.getTime() + 30_000);
        events.push({ id: randomUUID(), shopId: shop.id, sessionId: id, type: "PAGEVIEW", pageKind: "PRODUCT", occurredAt: t, lcpMs: gaussian(prof.lcpMean * 1.05, prof.lcpStd, 400), inpMs: inp, clsScore: cls, ttfbMs: ttfb, fcpMs: fcp });
      }
      // Add to cart
      if (Math.random() < prof.atcProb) {
        const t = new Date(startedAt.getTime() + 90_000);
        events.push({ id: randomUUID(), shopId: shop.id, sessionId: id, type: "ADD_TO_CART", pageKind: "CART", occurredAt: t, lcpMs: null, inpMs: inp, clsScore: null, ttfbMs: null, fcpMs: null });
      }
      // Begin checkout — the checkout page is heaviest for weak connections
      if (Math.random() < prof.bcProb) {
        const t = new Date(startedAt.getTime() + 150_000);
        events.push({ id: randomUUID(), shopId: shop.id, sessionId: id, type: "BEGIN_CHECKOUT", pageKind: "CHECKOUT", occurredAt: t, lcpMs: gaussian(prof.lcpMean * 1.15, prof.lcpStd, 500), inpMs: gaussian(inp * 1.3, 80, 30), clsScore: cls, ttfbMs: ttfb, fcpMs: fcp });
      }
    }
  }

  for (const batch of chunk(sessions, 800)) {
    await prisma.visitSession.createMany({ data: batch });
  }
  for (const batch of chunk(events, 800)) {
    await prisma.funnelEvent.createMany({ data: batch });
  }

  // 5) Orders (aggregate attribution — Shopify checkout is hosted, so no per-session join)
  const orderCount = Math.round(totalSessions * OVERALL_CVR);
  const orders = Array.from({ length: orderCount }, (_, i) => ({
    shopId: shop.id,
    shopifyOrderId: `seed-order-${i + 1}`,
    orderNumber: String(1000 + i),
    currency: "USD",
    totalCents: gaussian(AOV_CENTS, 1800, 800),
    subtotalCents: gaussian(AOV_CENTS - 700, 1600, 500),
    placedAt: daysAgo(29),
  }));
  for (const batch of chunk(orders, 800)) {
    await prisma.order.createMany({ data: batch });
  }

  console.log(
    `  ✓ ${sessions.length} sessions, ${events.length} funnel events, ${orders.length} orders`,
  );

  // 6) Run the aggregation + insight pipeline
  const window = trailingWindow(30);
  const result = await aggregateShopWindow(shop.id, window);

  console.log("\nAggregation result:");
  console.log(`  sessions:        ${result.baseline.sessionCount}`);
  console.log(`  orders:          ${result.baseline.orderCount}`);
  console.log(`  store CVR:       ${humanPct(result.baseline.sessionCount ? result.baseline.orderCount / result.baseline.sessionCount : 0, 2)}`);
  console.log(`  store p75 LCP:   ${humanMs(result.baseline.p75LcpMs)}`);
  console.log(`  segments:        ${result.segmentCount} (${result.suppressedCount} suppressed by k-anonymity)`);
  console.log(`  leaks:           ${result.leakCount}`);
  console.log(`  total est. risk: $${(result.totalEstImpactCents / 100).toFixed(2)} / ${result.windowDays}d\n`);

  const leaks = await prisma.leak.findMany({
    where: { shopId: shop.id },
    orderBy: { rank: "asc" },
    include: { segmentSnapshot: true },
  });
  console.log("Top leaks:");
  for (const l of leaks.slice(0, 5)) {
    const s = l.segmentSnapshot;
    const label = segmentLabel({
      deviceClass: s.deviceClass,
      connectionQuality: s.connectionQuality,
      regionCountry: s.regionCountry,
    });
    console.log(
      `  #${l.rank} [${l.confidence}] ${label} — $${(l.estImpactCents / 100).toFixed(0)}/${l.windowDays}d · ${l.status}\n       ${l.whatIsWrong}`,
    );
  }

  console.log(`\nMock shop id: ${shop.id}`);
  console.log(`Domain: ${MOCK_SHOP_DOMAIN}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
