import { describe, expect, it } from "vitest";
import { OrderInputSchema } from "../server/orders/schema";

const base = {
  shopDomain: "mock-shop.myshopify.com",
  platformOrderId: "gid://shopify/Order/123",
  total: "89.99",
  currency: "usd",
  placedAt: "2026-09-01T12:00:00Z",
};

describe("OrderInputSchema", () => {
  it("converts decimal money to integer cents and normalizes currency", () => {
    const o = OrderInputSchema.parse(base);
    expect(o.totalCents).toBe(8999);
    expect(o.currency).toBe("USD");
    expect(o.isTest).toBe(false);
    expect(o.isCancelled).toBe(false);
  });

  it("accepts numeric money and optional subtotal", () => {
    const o = OrderInputSchema.parse({ ...base, total: 10, subtotal: "9.50" });
    expect(o.totalCents).toBe(1000);
    expect(o.subtotalCents).toBe(950);
  });

  it("falls back to USD on an invalid currency", () => {
    expect(OrderInputSchema.parse({ ...base, currency: "xx" }).currency).toBe("USD");
    expect(OrderInputSchema.parse({ ...base, currency: 5 }).currency).toBe("USD");
  });

  it("clamps implausible dates to now", () => {
    const farFuture = OrderInputSchema.parse({ ...base, placedAt: "2999-01-01T00:00:00Z" });
    const farPast = OrderInputSchema.parse({ ...base, placedAt: "1990-01-01T00:00:00Z" });
    const skew = Math.abs(farFuture.placedAt.getTime() - Date.now());
    expect(skew).toBeLessThan(60_000);
    expect(Math.abs(farPast.placedAt.getTime() - Date.now())).toBeLessThan(60_000);
  });

  it("rejects non-decimal money and missing required fields", () => {
    expect(OrderInputSchema.safeParse({ ...base, total: "abc" }).success).toBe(false);
    expect(OrderInputSchema.safeParse({ ...base, total: NaN }).success).toBe(false);
    expect(OrderInputSchema.safeParse({ platformOrderId: "1", total: "1.00" }).success).toBe(false);
    expect(OrderInputSchema.safeParse({ ...base, platformOrderId: "  " }).success).toBe(false);
  });

  it("defaults optional attribution fields to null", () => {
    const o = OrderInputSchema.parse(base);
    expect(o.checkoutToken).toBeNull();
    expect(o.orderNumber).toBeNull();
    expect(o.financialStatus).toBeNull();
    expect(o.subtotalCents).toBeNull();
  });
});
