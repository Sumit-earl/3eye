import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { handleIngest } from "../../server/ingest/handleIngest";
import { regionFromRequest } from "../../server/core/geo";
import { parseProxyContext } from "../../server/proxy/verifyProxy";
import { config } from "../../server/core/config";

// ---------------------------------------------------------------------------
// POST /apps/threeye/ingest — telemetry via the Shopify App Proxy.
//
// This is the production capture path. The theme app extension injects the snippet with
// data-ingest="/apps/threeye/ingest", so the browser calls the STOREFRONT origin and Shopify
// forwards it here with signed proxy params. Because the request is same-origin from the
// storefront's point of view, no CORS preflight is involved, and — critically — we can verify
// the signature to TRUST the `shop` param. A verified shop overrides whatever the body claims,
// so one merchant can never poison another's data.
//
// Responses stay small and opaque (204 on success/ignore, 400 only on a malformed body).
// ---------------------------------------------------------------------------

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function loader({ request }: LoaderFunctionArgs) {
  return new Response(null, {
    status: request.method === "OPTIONS" ? 204 : 405,
    headers: NO_STORE,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: NO_STORE });
  if (request.method !== "POST") return new Response(null, { status: 405, headers: NO_STORE });

  const proxy = parseProxyContext(new URL(request.url).search, config.SHOPIFY_API_SECRET);

  // A present-but-invalid signature is a spoof attempt: drop it silently (opaque, like the
  // rest of the ingest surface) rather than revealing why.
  if (proxy.verify === "failed") return new Response(null, { status: 204, headers: NO_STORE });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400, headers: NO_STORE });
  }

  // When the proxy verified the shop, that value is authoritative — override the body so the
  // client-reported shop can't be forged. In mock mode (no secret) we fall back to the body,
  // exactly like the public /ingest endpoint.
  const trusted =
    proxy.verify === "verified" && proxy.shop && typeof body === "object" && body !== null
      ? { ...(body as Record<string, unknown>), shop: proxy.shop }
      : body;

  const result = await handleIngest(trusted, {
    regionCountry: regionFromRequest(request),
    userAgent: request.headers.get("user-agent"),
  });

  const status = result.status === "invalid" ? 400 : 204;
  return new Response(null, { status, headers: NO_STORE });
}
