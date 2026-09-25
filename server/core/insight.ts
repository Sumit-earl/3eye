import type {
  BrowserFamily,
  ClaimStatus,
  Confidence,
  ConnectionQuality,
  ConnectionType,
  DeviceClass,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Insight engine — the estimated revenue-impact model.
//
// PURE and platform-neutral: no DB, no Shopify, no I/O. It turns observed segment
// metrics + a shop baseline into a ranked, fully-labelled "leak" estimate.
//
// Honesty rules (PRD 4.1, 4.5, 10.5, OB-05):
//   • The OUTPUT is an ESTIMATE, never a measured causal loss. status = ESTIMATED.
//   • The INPUTS (p75 LCP, begin-checkout rate, session count) are OBSERVED and are
//     surfaced alongside the estimate so the merchant sees fact vs model.
//   • We say "correlated with", never "caused by" (the Agrofy trap — research/01).
//   • Every constant below is documented + cited and runtime-tunable.
// ---------------------------------------------------------------------------

// Core Web Vitals "good" thresholds (web.dev / WooCommerce guidance — research/03).
export const GOOD_LCP_MS = 2500;
export const GOOD_INP_MS = 200;

// Relative conversion loss per extra second of p75 LCP beyond the "good" threshold.
// Conservative blend of: Portent 2022 (ecommerce −0.3pp/sec; a 1s load converts ~2.5× a
// 5s load) and Google/Deloitte 2020 (0.1s → +8.4% retail conversion). 7%/sec is well
// inside both and deliberately understated. Tunable — PLANS/v1 open decision #2.
export const CONV_LOSS_PER_EXCESS_SEC = 0.07;

// Never attribute more than this fraction of conversion loss to latency alone.
export const MAX_LATENCY_LOSS = 0.5;

export interface SegmentDims {
  deviceClass?: DeviceClass | null;
  browserFamily?: BrowserFamily | null;
  connectionType?: ConnectionType | null;
  connectionQuality?: ConnectionQuality | null;
  regionCountry?: string | null;
}

export interface SegmentMetrics extends SegmentDims {
  sessionCount: number;
  pageviewCount: number;
  addToCartCount: number;
  beginCheckoutCount: number;
  p75LcpMs: number | null;
  p75InpMs: number | null;
  avgTtfbMs: number | null;
}

export interface ShopBaseline {
  sessionCount: number;
  beginCheckoutCount: number;
  orderCount: number;
  revenueCents: number;
  p75LcpMs: number | null;
}

export interface LeakObserved {
  sessionCount: number;
  beginCheckoutRate: number;
  baselineBeginCheckoutRate: number;
  p75LcpMs: number | null;
  baselineP75LcpMs: number | null;
  baselineCvr: number;
  estimatedSegmentCvr: number;
  estLostOrders: number;
  aovCents: number | null;
  excessLcpSeconds: number;
}

export interface LeakEstimate {
  title: string;
  whatIsWrong: string;
  metric: string;
  estImpactCents: number;
  confidence: Confidence;
  status: ClaimStatus;
  method: string;
  recommendation: string;
  observed: LeakObserved;
}

// --- formatting helpers ----------------------------------------------------

const DEVICE_LABEL: Record<DeviceClass, string> = {
  MOBILE: "Mobile",
  TABLET: "Tablet",
  DESKTOP: "Desktop",
  UNKNOWN: "Unknown device",
};
const BROWSER_LABEL: Record<BrowserFamily, string> = {
  CHROME: "Chrome",
  SAFARI: "Safari",
  FIREFOX: "Firefox",
  EDGE: "Edge",
  SAMSUNG: "Samsung Internet",
  OPERA: "Opera",
  OTHER: "Other browser",
  UNKNOWN: "Unknown browser",
};
const CONN_TYPE_LABEL: Record<ConnectionType, string> = {
  CELLULAR: "cellular",
  WIFI: "wi-fi",
  ETHERNET: "wired",
  UNKNOWN: "unknown network",
};
const CONN_QUALITY_LABEL: Record<ConnectionQuality, string> = {
  G4: "fast connection",
  G3: "medium connection",
  G2: "slow connection",
  SLOW_2G: "very slow connection",
  UNKNOWN: "unknown connection",
};
// Small map for the demo/pilot; UI can localize further. Falls back to the ISO code.
const COUNTRY_LABEL: Record<string, string> = {
  US: "United States",
  BR: "Brazil",
  IN: "India",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  CA: "Canada",
  AU: "Australia",
  NG: "Nigeria",
  ID: "Indonesia",
};

export function segmentLabel(dims: SegmentDims): string {
  const parts: string[] = [];
  if (dims.deviceClass) parts.push(DEVICE_LABEL[dims.deviceClass]);
  if (dims.connectionQuality && dims.connectionQuality !== "UNKNOWN")
    parts.push(CONN_QUALITY_LABEL[dims.connectionQuality]);
  else if (dims.connectionType && dims.connectionType !== "UNKNOWN")
    parts.push(CONN_TYPE_LABEL[dims.connectionType]);
  if (dims.regionCountry)
    parts.push(COUNTRY_LABEL[dims.regionCountry] ?? dims.regionCountry);
  if (dims.browserFamily && dims.browserFamily !== "UNKNOWN")
    parts.push(BROWSER_LABEL[dims.browserFamily]);
  return parts.length ? parts.join(" · ") : "All visitors";
}

export function humanMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export function humanPct(fraction: number | null | undefined, digits = 0): string {
  if (fraction == null || !Number.isFinite(fraction)) return "—";
  return `${(fraction * 100).toFixed(digits)}%`;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function confidenceFor(sessionCount: number): Confidence {
  if (sessionCount >= 500) return "HIGH";
  if (sessionCount >= 150) return "MEDIUM";
  return "LOW";
}

// --- the model -------------------------------------------------------------

export function baselineCvr(b: ShopBaseline): number {
  return b.sessionCount > 0 ? b.orderCount / b.sessionCount : 0;
}

export function averageOrderValueCents(b: ShopBaseline): number | null {
  return b.orderCount > 0 ? Math.round(b.revenueCents / b.orderCount) : null;
}

/**
 * Estimate the revenue at risk for one environment segment vs the shop baseline.
 * Returns null when there is no meaningful deficit (segment performs at/above baseline).
 */
export function estimateSegmentLeak(
  seg: SegmentMetrics,
  baseline: ShopBaseline,
): LeakEstimate | null {
  if (seg.sessionCount <= 0) return null;

  const baseCvr = baselineCvr(baseline);
  const aov = averageOrderValueCents(baseline);
  const baseBcr =
    baseline.sessionCount > 0
      ? baseline.beginCheckoutCount / baseline.sessionCount
      : 0;
  const segBcr = seg.beginCheckoutCount / seg.sessionCount;

  // Funnel factor: how this segment's reach-to-checkout compares to baseline (≤ 1).
  const funnelFactor = baseBcr > 0 ? clamp01(segBcr / baseBcr) : 1;

  // Latency factor: conversion loss from excess p75 LCP beyond the "good" threshold.
  const excessLcpSeconds =
    seg.p75LcpMs != null ? Math.max(0, (seg.p75LcpMs - GOOD_LCP_MS) / 1000) : 0;
  const latencyLoss = Math.min(
    MAX_LATENCY_LOSS,
    CONV_LOSS_PER_EXCESS_SEC * excessLcpSeconds,
  );
  const latencyFactor = 1 - latencyLoss;

  const estSegCvr = baseCvr * funnelFactor * latencyFactor;
  const deficitCvr = Math.max(0, baseCvr - estSegCvr);
  const estLostOrders = deficitCvr * seg.sessionCount;
  const estImpactCents = aov != null ? Math.round(estLostOrders * aov) : 0;

  // No measurable deficit → not a leak.
  const hasDeficit = deficitCvr > 0.0005 || excessLcpSeconds > 0.5;
  if (!hasDeficit) return null;

  const label = segmentLabel(seg);
  const latencyDriven = latencyLoss > 0 && excessLcpSeconds >= 0.5;
  const funnelDriven = baseBcr > 0 && segBcr < baseBcr * 0.9;

  const whatIsWrongBits: string[] = [];
  if (seg.p75LcpMs != null) {
    whatIsWrongBits.push(
      `the page took ${humanMs(seg.p75LcpMs)} to show its main content (p75) vs ${humanMs(
        baseline.p75LcpMs,
      )} for your store overall`,
    );
  }
  if (baseBcr > 0) {
    whatIsWrongBits.push(
      `only ${humanPct(segBcr)} reached checkout vs ${humanPct(baseBcr)} on average`,
    );
  }
  const whatIsWrong =
    `For ${label}, ` +
    (whatIsWrongBits.length ? whatIsWrongBits.join(", and ") : "experience is degraded") +
    ".";

  const metric =
    seg.p75LcpMs != null
      ? "p75 LCP + begin-checkout rate vs store baseline"
      : "begin-checkout rate vs store baseline";

  const recommendation = latencyDriven
    ? `Serve a lighter experience for ${label}: compress/lazy-load below-the-fold images, drop non-critical third-party scripts, and preconnect critical origins. Target p75 LCP ≤ 2.5s for this group.`
    : funnelDriven
      ? `Shorten the path to checkout for ${label}: fewer form fields, guest checkout, mobile-sized tap targets, and clear progress. Test one change at a time and re-measure.`
      : `Monitor ${label}; no single dominant cause yet. Re-check after your next theme/app change.`;

  const title =
    estImpactCents > 0
      ? `${label} — est. revenue at risk`
      : `${label} — degraded experience (no completed orders yet to price it)`;

  return {
    title,
    whatIsWrong,
    metric,
    estImpactCents,
    confidence: confidenceFor(seg.sessionCount),
    status: "ESTIMATED",
    method:
      `Estimate = (store conversion rate − segment conversion rate) × segment sessions × your observed average order value. ` +
      `Segment conversion is modelled from two OBSERVED signals — begin-checkout rate and p75 LCP — using a conservative curve ` +
      `(−${Math.round(
        CONV_LOSS_PER_EXCESS_SEC * 100,
      )}% relative conversion per second of LCP above ${GOOD_LCP_MS / 1000}s; capped at ${Math.round(
        MAX_LATENCY_LOSS * 100,
      )}%). Sources: Portent 2022, Google/Deloitte 2020. This is an ESTIMATE of correlated loss, not a measured causal figure.`,
    recommendation,
    observed: {
      sessionCount: seg.sessionCount,
      beginCheckoutRate: segBcr,
      baselineBeginCheckoutRate: baseBcr,
      p75LcpMs: seg.p75LcpMs,
      baselineP75LcpMs: baseline.p75LcpMs,
      baselineCvr: baseCvr,
      estimatedSegmentCvr: estSegCvr,
      estLostOrders,
      aovCents: aov,
      excessLcpSeconds,
    },
  };
}

/** Rank a set of leaks by estimated revenue impact (desc). */
export function rankLeaks(leaks: LeakEstimate[]): LeakEstimate[] {
  return [...leaks].sort((a, b) => b.estImpactCents - a.estImpactCents);
}
