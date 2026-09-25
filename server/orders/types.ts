// Order-service result types (platform-neutral).
//
// The outcome is deliberately narrow and serializable so any adapter (Shopify webhook today,
// other platforms later) can react to it without knowing persistence details.

export type OrderIgnoreReason =
  | "cancelled" // order was cancelled → not revenue
  | "test_order" // Shopify test order → excluded from real figures
  | "unknown_shop" // no Shop row for this domain (a webhook can never create one)
  | "shop_uninstalled"; // app was uninstalled → stop writing

export type OrderOutcome =
  | { status: "created"; orderId: string; attributed: boolean }
  | { status: "updated"; orderId: string; attributed: boolean }
  | { status: "ignored"; reason: OrderIgnoreReason }
  | { status: "invalid"; reason: string };
