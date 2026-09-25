import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { handleShopRedact } from "../../server/privacy/handleShopRedact";

// ---------------------------------------------------------------------------
// POST /webhooks/shop/redact — MANDATORY compliance topic.
//
// The shop owner asks for ALL app data about the shop to be erased. The neutral core deletes the
// auth sessions (keyed by domain) and cascade-deletes the Shop row and every tenant table. This
// is irreversible by design. Always ack 200 so Shopify does not retry a compliance topic.
// ---------------------------------------------------------------------------

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  try {
    const result = await handleShopRedact(shop);
    console.info(`[${topic}] ${shop}: ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
  } catch (err) {
    console.error(`[${topic}] failed for ${shop}`, err);
  }

  return new Response();
};
