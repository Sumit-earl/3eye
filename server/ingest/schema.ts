import { z } from "zod";

// ---------------------------------------------------------------------------
// Beacon payload validation (untrusted client input — defense in depth).
//
// The capture snippet posts here from a visitor's browser, so EVERYTHING is treated as
// hostile: enums are upper-cased and clamped to the allowed set, timings are bounded, the
// event batch is length-capped, and raw identifiers are never accepted (only a random
// per-visit id that we immediately HMAC and discard). Anything that fails validation is
// rejected or dropped — we never trust a client-computed bucket verbatim (see
// core/environment.ts, which re-normalizes on top of this).
// ---------------------------------------------------------------------------

const upper = (v: unknown): string => (typeof v === "string" ? v.trim().toUpperCase() : "");

export const FunnelTypeSchema = z.enum([
  "PAGEVIEW",
  "ADD_TO_CART",
  "BEGIN_CHECKOUT",
  "CHECKOUT_HANDOFF",
]);

const PAGE_KINDS = ["HOME", "PRODUCT", "COLLECTION", " CART", "CHECKOUT", "OTHER"] as const;
export const PageKindSchema = z.enum(PAGE_KINDS);

export const ConsentSchema = z.enum(["GRANTED", "DENIED", "NOT_REQUIRED"]);

// An unknown pageKind must not discard an otherwise-valid event → coerce to OTHER.
const normalizePageKind = (v: unknown): (typeof PAGE_KINDS)[number] => {
  const u = upper(v);
  return (PAGE_KINDS as readonly string[]).includes(u)
    ? (u as (typeof PAGE_KINDS)[number])
    : "OTHER";
};

// Timing in ms. Bounded to [0, 10min] to stop absurd values; absent/null → undefined
// (graceful degradation when a browser can't measure a given vital).
const intMs = z
  .number()
  .finite()
  .min(0)
  .max(600_000)
  .nullish()
  .transform((n) => (n == null ? undefined : Math.round(n)));

export const EventSchema = z.object({
  // Strict: an event with an unmappable type is dropped by the handler (never guessed).
  type: z.preprocess(upper, FunnelTypeSchema),
  pageKind: z.preprocess(normalizePageKind, PageKindSchema),
  // Client epoch ms of the event; the handler clamps skewed clocks to server time.
  at: z.number().finite().positive().optional(),
  lcpMs: intMs,
  inpMs: intMs,
  fcpMs: intMs,
  ttfbMs: intMs,
  clsScore: z.number().finite().min(0).max(10).optional(),
});

// Raw Network Information API signals. Used to DERIVE a coarse quality bucket server-side
// (never stored raw). All optional — iOS Safari et al. don't support it.
export const NetworkSchema = z
  .object({
    effectiveType: z.string().max(16).nullish(),
    downlink: z.number().finite().min(0).max(10_000).nullish(),
    rtt: z.number().finite().min(0).max(60_000).nullish(),
  })
  .partial();

// Lenient envelope for the coarse environment hints; the handler re-normalizes each field
// through core/environment.ts, so unknown/extra values here are harmless.
export const EnvSchema = z
  .object({
    deviceClass: z.unknown().optional(),
    browserFamily: z.unknown().optional(),
    osFamily: z.unknown().optional(),
    connectionType: z.unknown().optional(),
    connectionQuality: z.unknown().optional(),
    network: NetworkSchema.optional(),
    screenWidth: z.number().finite().min(0).max(100_000).optional(),
    secureContext: z.boolean().optional(),
  })
  .passthrough();

export const IngestPayloadSchema = z.object({
  v: z.number().int().optional(), // beacon schema version, for forward migration
  // The myshopify domain of the shop this telemetry belongs to. Not a secret; used only to
  // resolve an existing Shop row (we NEVER create shops from a beacon).
  shop: z.string().trim().min(3).max(255),
  // Random per-visit id generated in-browser. HMAC'd + discarded; never stored raw.
  visitId: z.string().trim().min(8).max(128),
  // Optional checkout/cart token captured at handoff, used ONLY to best-effort join a later
  // orders/create webhook back to this visit. Domain-separated HMAC'd + discarded (never raw).
  checkoutToken: z.string().trim().min(8).max(128).optional(),
  consent: z.preprocess(upper, ConsentSchema).default("NOT_REQUIRED"),
  env: EnvSchema.optional().default({}),
  // Unknown elements so a single malformed event can't 400 the whole batch; the handler
  // validates each individually and drops the bad ones. Capped to bound write amplification.
  events: z.array(z.unknown()).max(50).default([]),
});

export type IngestPayload = z.infer<typeof IngestPayloadSchema>;
export type IngestEvent = z.infer<typeof EventSchema>;
