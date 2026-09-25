import type { ConsentStatus, FunnelEventType, PageKind } from "@prisma/client";
import prisma from "../../app/db.server";
import { normalizeDomain } from "../core/domain";
import {
  classifyUserAgent,
  deriveConnectionQuality,
  toBrowserFamily,
  toConnectionQuality,
  toConnectionType,
  toDeviceClass,
  toOsFamily,
  toScreenBucket,
} from "../core/environment";
import { checkoutTokenHash, visitHash } from "../core/hash";
import { EventSchema, IngestPayloadSchema, type IngestEvent } from "./schema";

// ---------------------------------------------------------------------------
// Ingestion core (platform-neutral). Given an already-HTTP-parsed body, resolve the shop,
// gate on consent, normalize the coarse environment, upsert the visit, and append funnel
// events. No Remix/Shopify imports here — this is the reusable backend the v3 multi-platform
// seam is built on; the route in app/routes/ingest.tsx is a thin adapter over it.
// ---------------------------------------------------------------------------

export interface IngestContext {
  // Server-derived coarse country (from trusted edge headers), NOT client-supplied. null if
  // not derivable — we never trust the browser to report its own precise location.
  regionCountry?: string | null;
  // The beacon request's User-Agent header. Used ONLY to derive coarse browser/os/device
  // enums (never stored) when the client didn't supply them. Cross-origin beacons still
  // carry the UA, so this saves the snippet from doing its own UA sniffing.
  userAgent?: string | null;
}

export type IngestStatus = "ok" | "ignored" | "invalid";

export interface IngestResult {
  status: IngestStatus;
  reason?: string;
  eventsStored: number;
}

const MS_24H = 24 * 60 * 60 * 1000;
const MS_5MIN = 5 * 60 * 1000;

// Accept a client timestamp only if it's plausibly "recent" relative to server time;
// otherwise fall back to server receipt time. Prevents clock-skewed beacons from landing
// events outside the aggregation window (or far in the future).
function resolveOccurredAt(at: number | undefined, now: Date): Date {
  if (typeof at === "number" && Number.isFinite(at)) {
    const d = new Date(at);
    const delta = now.getTime() - d.getTime();
    if (delta >= -MS_5MIN && delta <= MS_24H) return d;
  }
  return now;
}

function validateEvents(rawEvents: unknown[]): IngestEvent[] {
  const out: IngestEvent[] = [];
  for (const raw of rawEvents) {
    const parsed = EventSchema.safeParse(raw);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export async function handleIngest(
  body: unknown,
  ctx: IngestContext = {},
): Promise<IngestResult> {
  const parsed = IngestPayloadSchema.safeParse(body);
  if (!parsed.success) return { status: "invalid", reason: "payload", eventsStored: 0 };
  const p = parsed.data;

  // Consent gate (PRD consent-first): if the visitor denied, capture nothing at all.
  if (p.consent === "DENIED") {
    return { status: "ignored", reason: "consent_denied", eventsStored: 0 };
  }

  const events = validateEvents(p.events);
  if (events.length === 0) {
    return { status: "ignored", reason: "no_valid_events", eventsStored: 0 };
  }

  // Resolve an existing shop only — a beacon can never create one.
  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: normalizeDomain(p.shop) },
  });
  if (!shop) return { status: "ignored", reason: "unknown_shop", eventsStored: 0 };

  // Merchant kill-switch: when capture is paused we drop beacons at the door. Cheap, and
  // means "stop collecting" is honored immediately without editing the theme.
  if (!shop.captureEnabled) {
    return { status: "ignored", reason: "capture_disabled", eventsStored: 0 };
  }

  const now = new Date();
  const occurred = events.map((e) => resolveOccurredAt(e.at, now));
  const earliest = occurred.reduce((a, b) => (a < b ? a : b), occurred[0]);
  const latest = occurred.reduce((a, b) => (a > b ? a : b), occurred[0]);

  const sessionHash = visitHash(shop.id, p.visitId);

  // Coarse environment — client hints are re-normalized/clamped server-side. Connection
  // quality is DERIVED from raw Network Info when present, else from a client bucket.
  // Browser/os/device fall back to a transient classification of the request UA when the
  // client didn't send them (the UA is used to derive enums and is never stored).
  const env = p.env ?? {};
  const ua = ctx.userAgent ? classifyUserAgent(ctx.userAgent) : null;
  const prefer = <T extends string>(client: T, fromUa: T | undefined, unknownVal: T): T =>
    client !== unknownVal ? client : fromUa ?? unknownVal;

  const deviceClass = prefer(toDeviceClass(env.deviceClass), ua?.deviceClass, "UNKNOWN");
  const browserFamily = prefer(toBrowserFamily(env.browserFamily), ua?.browserFamily, "UNKNOWN");
  const osFamily = prefer(toOsFamily(env.osFamily), ua?.osFamily, "UNKNOWN");
  const connectionQuality = env.network
    ? deriveConnectionQuality(env.network)
    : toConnectionQuality(env.connectionQuality);
  const screenBucket = toScreenBucket(env.screenWidth);
  const regionCountry = normalizeCountry(ctx.regionCountry);

  const where = { shopId_sessionHash: { shopId: shop.id, sessionHash } };
  const consent = p.consent as ConsentStatus;

  // Best-effort revenue attribution: if the storefront handed us a checkout/cart token at
  // handoff, store a domain-separated hash of it so a later orders/create webhook carrying
  // the same token can be joined back to this visit. Absent for most sessions (hosted
  // checkout) — that is expected and handled as aggregate-only attribution downstream.
  const tokenHash = p.checkoutToken ? checkoutTokenHash(shop.id, p.checkoutToken) : null;

  // Upsert: first-write-wins for environment (keeps a visit's dims stable across beacons);
  // on update we only advance endedAt, honor a withdrawal of consent, and attach a checkout
  // token if one arrives on a later beacon.
  const session = await prisma.visitSession.upsert({
    where: { ...where },
    create: {
      shopId: shop.id,
      sessionHash,
      consent,
      startedAt: earliest,
      endedAt: latest,
      deviceClass,
      browserFamily,
      osFamily,
      connectionType: toConnectionType(env.connectionType),
      connectionQuality,
      regionCountry,
      screenBucket,
      secureContext: env.secureContext !== false,
      checkoutTokenHash: tokenHash,
    },
    update: {
      endedAt: latest,
      ...(consent === "DENIED" ? { consent } : {}),
      ...(tokenHash ? { checkoutTokenHash: tokenHash } : {}),
    },
  });

  await prisma.funnelEvent.createMany({
    data: events.map((e, i) => ({
      shopId: shop.id,
      sessionId: session.id,
      type: e.type as FunnelEventType,
      pageKind: (e.pageKind ?? "OTHER") as PageKind,
      occurredAt: occurred[i],
      lcpMs: e.lcpMs ?? null,
      inpMs: e.inpMs ?? null,
      fcpMs: e.fcpMs ?? null,
      ttfbMs: e.ttfbMs ?? null,
      clsScore: e.clsScore ?? null,
    })),
  });

  return { status: "ok", eventsStored: events.length };
}

function normalizeCountry(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const c = v.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
}
