import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { handleOrder } from "../../server/orders/handleOrder";
import { mapShopifyOrder } from "../../server/orders/shopify/mapOrder";

// ---------------------------------------------------------------------------
// POST /webhooks/orders/create — the revenue-outcome join.
//
// authenticate.webhook() verifies the HMAC signature and gives us the trusted shop domain +
// parsed payload. We map it to the neutral order DTO and hand it to the platform-neutral core.
//
// Reliability: Shopify retries any non-2xx response, so we ALWAYS acknowledge with 200 and log
// failures instead of throwing — a transient DB error must not cause a retry storm, and the
// core is idempotent so a genuine re-delivery is a safe no-op.
// ---------------------------------------------------------------------------

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  try {
    const dto = mapShopifyOrder(payload, shop);
    if (!dto) {
      console.error(`[${topic}] unmappable order payload for ${shop}`);
      return new Response();
    }

    const result = await handleOrder(dto);
    if (result.status === "invalid") {
      console.error(`[${topic}] invalid order for ${shop}: ${result.reason}`);
    } else if (result.status === "ignored") {
      console.info(`[${topic}] ignored order for ${shop}: ${result.reason}`);
    }
  } catch (err) {
    console.error(`[${topic}] failed to process order for ${shop}`, err);
  }

  return new Response();
};
