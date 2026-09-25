import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeDomain } from "../core/domain";

// ---------------------------------------------------------------------------
// Shopify App Proxy verification (platform-neutral core).
//
// A theme app extension can't call our backend cross-origin without a preflight and without
// letting the browser spoof which shop it is. The App Proxy solves both: the storefront calls
// a same-origin path (/apps/<subpath>/...) that Shopify forwards to us, appending signed query
// params. Verifying that signature lets us TRUST the `shop` param — so a beacon can never
// claim to belong to a shop it doesn't.
//
// Shopify's algorithm: drop `signature`, sort the remaining `key=value` pairs as strings,
// concatenate them with no separator, HMAC-SHA256 with the app's client secret, hex-encode,
// and compare. See: https://shopify.dev/docs/apps/build/online-store/app-proxy
// ---------------------------------------------------------------------------

export type ProxyVerifyResult = "verified" | "failed" | "skipped";

export interface ProxyContext {
  // The trusted shop domain (normalized), present when the proxy signed the request. null in
  // mock mode where there is no shared secret to verify against.
  shop: string | null;
  pathPrefix: string | null;
  timestamp: number | null;
  signature: string | null;
  verify: ProxyVerifyResult;
}

// Parse the proxy params Shopify appends. Never throws; missing values become null.
export function parseProxyContext(search: string, secret: string): ProxyContext {
  const params = new URLSearchParams(search);
  const rawShop = params.get("shop");
  const rawSig = params.get("signature");
  const tsRaw = params.get("timestamp");
  const ts = tsRaw != null ? Number(tsRaw) : NaN;

  const shop = rawShop ? normalizeDomain(rawShop) : null;

  // No shared secret configured → mock/local. We cannot verify, so we do not claim to.
  if (!secret) {
    return {
      shop,
      pathPrefix: params.get("path_prefix"),
      timestamp: Number.isFinite(ts) ? ts : null,
      signature: rawSig,
      verify: "skipped",
    };
  }

  const verify = verifyProxySignature(search, secret) ? "verified" : "failed";
  return {
    // Only hand back a trusted shop when the signature actually checks out.
    shop: verify === "verified" ? shop : null,
    pathPrefix: params.get("path_prefix"),
    timestamp: Number.isFinite(ts) ? ts : null,
    signature: rawSig,
    verify,
  };
}

// Constant-time verification of the app-proxy `signature` against the query string.
export function verifyProxySignature(search: string, secret: string): boolean {
  const params = new URLSearchParams(search);
  const signature = params.get("signature");
  if (!signature) return false;
  params.delete("signature");

  // Shopify sorts the `key=value` strings (not the keys) and concatenates them. Multi-value
  // keys arrive already comma-joined in the query string, which URLSearchParams preserves.
  const base = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("");

  const expected = Buffer.from(
    createHmac("sha256", secret).update(base, "utf8").digest("hex"),
    "utf8",
  );
  const given = Buffer.from(signature, "utf8");
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

// Test/build helper: produce the signature Shopify would send for a given set of params.
// Used by the local verifier and (in real mode) nothing else — the storefront never sees it.
export function signProxyParams(
  params: Record<string, string | number>,
  secret: string,
): string {
  const entries = Object.entries(params)
    .filter(([k]) => k !== "signature")
    .map(([k, v]) => `${k}=${v}`)
    .sort();
  return createHmac("sha256", secret).update(entries.join(""), "utf8").digest("hex");
}
