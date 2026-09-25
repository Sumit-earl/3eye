import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { handleDataRequest } from "../../server/privacy/handleDataRequest";

// ---------------------------------------------------------------------------
// POST /webhooks/customers/data_request — MANDATORY compliance topic.
//
// Someone asked the merchant for all data held about them. authenticate.webhook() verifies the
// HMAC; we hand the trusted shop domain to the platform-neutral core, which records the request
// and confirms we hold no customer-identifying personal data. Always ack 200 — a non-2xx makes
// Shopify retry, and compliance topics must not fail loudly.
// ---------------------------------------------------------------------------

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  try {
    const result = await handleDataRequest(shop);
    console.info(`[${topic}] ${shop}: ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
  } catch (err) {
    console.error(`[${topic}] failed for ${shop}`, err);
  }

  return new Response();
};
