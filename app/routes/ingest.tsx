import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { handleIngest } from "../../server/ingest/handleIngest";
import { regionFromRequest } from "../../server/core/geo";

// ---------------------------------------------------------------------------
// POST /ingest — public telemetry endpoint.
//
// Called from a visitor's browser on merchant storefronts (a different origin), so it must
// be CORS-enabled and must NOT require Shopify auth. It is deliberately fire-and-forget:
// always a small, opaque response (204 on success/ignore, 400 on a malformed payload) with
// no body that could leak whether a shop exists or what we stored. All real hardening
// (validation, clamping, consent gating) lives in server/ingest so it's reusable off-Remix.
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  // Never cache a telemetry POST response.
  "Cache-Control": "no-store",
};

export function loader({ request }: LoaderFunctionArgs) {
  // GET is not supported on the telemetry endpoint.
  return new Response(null, {
    status: request.method === "OPTIONS" ? 204 : 405,
    headers: CORS_HEADERS,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400, headers: CORS_HEADERS });
  }

  const result = await handleIngest(body, {
    regionCountry: regionFromRequest(request),
    userAgent: request.headers.get("user-agent"),
  });
  const status = result.status === "invalid" ? 400 : 204;
  return new Response(null, { status, headers: CORS_HEADERS });
}
