import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { handleCustomerRedact } from "../../server/privacy/handleRedact";

// ---------------------------------------------------------------------------
// POST /webhooks/customers/redact — MANDATORY compliance topic.
//
// A customer exercised their right to erasure. The payload carries `orders_to_redact` (order
// gids); the neutral core deletes those orders and their attributed visits. We never read or
// store the customer's email/id. Always ack 200 so Shopify does not retry a compliance topic.
// ---------------------------------------------------------------------------

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  try {
    const ordersToRedact = (payload as { orders_to_redact?: unknown } | null)?.orders_to_redact;
    const result = await handleCustomerRedact(shop, ordersToRedact);
    console.info(
      `[${topic}] ${shop}: ${result.status}` +
        (result.status === "redacted"
          ? ` (orders=${result.ordersDeleted}, visits=${result.sessionsDeleted})`
          : result.reason
            ? ` (${result.reason})`
            : ""),
    );
  } catch (err) {
    console.error(`[${topic}] failed for ${shop}`, err);
  }

  return new Response();
};
