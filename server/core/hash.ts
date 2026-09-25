import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";

// Privacy-safe visit linking (PRD PR-04, PR-12).
//
// The browser generates a random per-visit id (in-memory / sessionStorage only — never a
// persistent cookie). We never store that raw id. Instead we store an HMAC of it under a
// server-side salt, so:
//   • events within one visit can be joined (the hash is stable for that visit), and
//   • the stored value cannot be reversed to the client id, and cannot be correlated to a
//     person or across visits/rotations.
// The salt is an ops-managed secret; rotating it invalidates all prior hashes (a feature:
// it caps the usefulness of any leaked data). Raw telemetry rows are also pruned after the
// shop's retention window (PRD PR-06).

export function visitHash(shopId: string, clientVisitId: string): string {
  return createHmac("sha256", config.INGEST_SALT)
    .update(`${shopId}\u0000${clientVisitId}`)
    .digest("hex")
    .slice(0, 40);
}

// Domain-separated hash for a checkout/cart token, used ONLY to join an orders/create
// webhook back to the visit that handed off to checkout. The distinct "checkout" label keeps
// this keyspace independent of visit ids, and the same salt/rotation/pruning rules apply —
// the raw token is never stored and the hash cannot be reversed or correlated to a person.
export function checkoutTokenHash(shopId: string, rawToken: string): string {
  return createHmac("sha256", config.INGEST_SALT)
    .update(`${shopId}\u0000checkout\u0000${rawToken}`)
    .digest("hex")
    .slice(0, 40);
}

// Constant-time comparison for validating a client-presented visit id against a stored
// hash (used by delete-my-data so a requester must prove they hold the visit id).
export function visitHashMatches(
  shopId: string,
  clientVisitId: string,
  candidateHash: string,
): boolean {
  const expected = Buffer.from(visitHash(shopId, clientVisitId), "utf8");
  const given = Buffer.from(candidateHash, "utf8");
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}
