import { describe, expect, it } from "vitest";
import { checkoutTokenHash, visitHash, visitHashMatches } from "../server/core/hash";

const SHOP = "shop-123";

describe("privacy hashing", () => {
  it("produces stable, shop-scoped hashes", () => {
    const a = visitHash(SHOP, "visit-abc");
    expect(a).toBe(visitHash(SHOP, "visit-abc"));
    expect(a).toHaveLength(40);
    // Same visit id under a different shop must not collide.
    expect(visitHash("other-shop", "visit-abc")).not.toBe(a);
    // Domain separation: a checkout token never hashes like a visit id.
    expect(checkoutTokenHash(SHOP, "visit-abc")).not.toBe(a);
  });

  it("visitHashMatches validates a presented id against a stored hash", () => {
    const hash = visitHash(SHOP, "visit-abc");
    expect(visitHashMatches(SHOP, "visit-abc", hash)).toBe(true);
    expect(visitHashMatches(SHOP, "visit-wrong", hash)).toBe(false);
    expect(visitHashMatches("other-shop", "visit-abc", hash)).toBe(false);
  });

  it("is hex output (no raw id material leaks)", () => {
    expect(/^[0-9a-f]{40}$/.test(visitHash(SHOP, "anything"))).toBe(true);
  });
});
