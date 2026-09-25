// ---------------------------------------------------------------------------
// Shopify orders/create adapter.
//
// This is the ONLY Shopify-shaped code in the orders service: it maps the raw webhook payload
// into the neutral DTO validated by server/orders/schema.ts. Adding another platform later
// means writing a new mapper, not touching the core — the same seam the ingest layer uses.
//
// Field notes (Shopify Order resource, REST):
//   • admin_graphql_api_id — stable gid string; preferred over the numeric `id` (avoids any
//     JS number-precision concern) as our idempotency key.
//   • current_total_price / current_subtotal_price — decimal strings reflecting the order's
//     current totals (post-edit); fall back to total_price / subtotal_price.
//   • presentment_currency — the currency the customer actually paid in.
//   • checkout_token — the token linking back to the storefront checkout (attribution key).
//   • cancelled_at / test — exclude cancelled and test orders from revenue.
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

export function mapShopifyOrder(payload: unknown, shopDomain: string): Json | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, any>;

  const platformOrderId =
    (typeof p.admin_graphql_api_id === "string" && p.admin_graphql_api_id.trim()) ||
    (p.id != null ? String(p.id) : "");
  if (!platformOrderId) return null;

  return {
    shopDomain,
    platformOrderId,
    orderNumber:
      p.order_number != null ? String(p.order_number) : p.name != null ? String(p.name) : null,
    currency: p.presentment_currency ?? p.currency ?? "USD",
    total: p.current_total_price ?? p.total_price ?? 0,
    subtotal: p.current_subtotal_price ?? p.subtotal_price ?? null,
    placedAt: p.processed_at ?? p.created_at ?? new Date().toISOString(),
    checkoutToken: p.checkout_token ?? p.token ?? null,
    financialStatus: p.financial_status ?? null,
    isTest: p.test === true,
    isCancelled: p.cancelled_at != null || p.cancelled === true,
  };
}
