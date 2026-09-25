import { z } from "zod";

// ---------------------------------------------------------------------------
// Order input validation (untrusted webhook input — defense in depth).
//
// A mapper (e.g. shopify/mapOrder.ts) turns a platform's raw order payload into this neutral
// shape; the schema is the single trust boundary that clamps it before anything touches the
// DB. Money arrives as a decimal (Shopify sends "123.45" strings) and is converted to Int
// cents here — money is NEVER a float downstream. Dates are clamped so a skewed or malicious
// timestamp can't land an order outside the aggregation window or far in the future.
// ---------------------------------------------------------------------------

function toCents(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function coerceCurrency(v: unknown): string {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(s) ? s : "USD";
}

const FUTURE_TOLERANCE_MS = 5 * 60_000;
const MIN_PLAUSIBLE_MS = Date.UTC(2000, 0, 1);

const dateish = z.union([z.string(), z.number(), z.date()]).transform((v) => {
  const d = v instanceof Date ? v : new Date(v);
  const t = d.getTime();
  if (!Number.isFinite(t)) return new Date();
  if (t > Date.now() + FUTURE_TOLERANCE_MS) return new Date();
  if (t < MIN_PLAUSIBLE_MS) return new Date();
  return d;
});

// A decimal money amount (string or number) that parses to a finite cent value.
const Money = z
  .union([z.string(), z.number()])
  .refine((v) => toCents(v) !== null, { message: "expected a decimal money amount" });

export const OrderInputSchema = z
  .object({
    // myshopify domain (or equivalent) used to resolve an existing Shop. Not a secret.
    shopDomain: z.string().trim().min(3).max(255),
    // Stable platform order id — our idempotency key. Prefer a string gid over a bare number.
    platformOrderId: z
      .union([z.string(), z.number()])
      .transform((v) => String(v).trim())
      .pipe(z.string().min(1).max(128)),
    orderNumber: z.string().trim().max(64).nullish(),
    currency: z.preprocess(coerceCurrency, z.string()),
    total: Money,
    subtotal: Money.nullish(),
    placedAt: dateish,
    // Raw checkout/cart token for best-effort attribution. HMAC'd + discarded downstream.
    checkoutToken: z.string().trim().min(8).max(128).nullish(),
    financialStatus: z.string().trim().max(32).nullish(),
    isTest: z.boolean().default(false),
    isCancelled: z.boolean().default(false),
  })
  .transform((o) => ({
    shopDomain: o.shopDomain,
    platformOrderId: o.platformOrderId,
    orderNumber: o.orderNumber ?? null,
    currency: o.currency,
    totalCents: toCents(o.total) ?? 0,
    subtotalCents: o.subtotal != null ? toCents(o.subtotal) : null,
    placedAt: o.placedAt,
    checkoutToken: o.checkoutToken ?? null,
    financialStatus: o.financialStatus ?? null,
    isTest: o.isTest,
    isCancelled: o.isCancelled,
  }));

export type OrderInput = z.output<typeof OrderInputSchema>;
