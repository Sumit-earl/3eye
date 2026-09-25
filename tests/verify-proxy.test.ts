import { describe, expect, it } from "vitest";
import { parseProxyContext, signProxyParams, verifyProxySignature } from "../server/proxy/verifyProxy";
import { normalizeDomain } from "../server/core/domain";

const SECRET = "unit-test-secret";
const SHOP = "mock-shop.myshopify.com";

function query(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

describe("app-proxy signature", () => {
  const params = { shop: SHOP, path_prefix: "/apps/threeye", timestamp: "1700000000" };

  it("round-trips: a signed query verifies regardless of param order", () => {
    const sig = signProxyParams(params, SECRET);
    // Deliberately shuffle the order — verification sorts, so it must still pass.
    const shuffled = query({ timestamp: params.timestamp, signature: sig, shop: params.shop, path_prefix: params.path_prefix });
    expect(verifyProxySignature(shuffled, SECRET)).toBe(true);
  });

  it("rejects a tampered shop, a wrong secret, and a missing signature", () => {
    const sig = signProxyParams(params, SECRET);
    const tampered = query({ ...params, signature: sig, shop: "victim-shop.myshopify.com" });
    expect(verifyProxySignature(tampered, SECRET)).toBe(false);
    expect(verifyProxySignature(query({ ...params, signature: sig }), "wrong-secret")).toBe(false);
    expect(verifyProxySignature(query(params), SECRET)).toBe(false);
  });

  it("parseProxyContext trusts the shop only when verified", () => {
    const sig = signProxyParams(params, SECRET);
    const good = parseProxyContext(query({ ...params, signature: sig }), SECRET);
    expect(good.verify).toBe("verified");
    expect(good.shop).toBe(SHOP);

    const bad = parseProxyContext(query({ ...params, signature: sig, shop: "evil.myshopify.com" }), SECRET);
    expect(bad.verify).toBe("failed");
    expect(bad.shop).toBeNull(); // spoofed shop must be withheld
  });

  it("skips verification (but still parses) when no secret is configured", () => {
    const ctx = parseProxyContext(query(params), "");
    expect(ctx.verify).toBe("skipped");
    expect(ctx.shop).toBe(SHOP);
  });

  it("normalizes the shop domain", () => {
    const sig = signProxyParams({ ...params, shop: "HTTPS://Mock-Shop.Myshopify.COM/path?x=1" }, SECRET);
    const ctx = parseProxyContext(query({ ...params, shop: "HTTPS://Mock-Shop.Myshopify.COM/path?x=1", signature: sig }), SECRET);
    expect(ctx.shop).toBe(SHOP);
  });
});

describe("normalizeDomain", () => {
  it("strips scheme, path, query and lowercases", () => {
    expect(normalizeDomain("  HTTPS://Example.Myshopify.com/cart?x=1 ")).toBe("example.myshopify.com");
    expect(normalizeDomain("example.com")).toBe("example.com");
    expect(normalizeDomain("")).toBe("");
  });
});
