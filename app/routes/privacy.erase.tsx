import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { forgetVisit } from "../../server/privacy/deleteMyData";

// ---------------------------------------------------------------------------
// POST /privacy/erase — public, visitor-facing delete-my-data.
//
// Called from a visitor's browser on a merchant storefront (a different origin), so it is
// CORS-enabled and requires no auth. The body is { shop, visitId }; possession of the raw visit
// id is the proof of ownership (the server only ever stored its salted hash). The response is
// deliberately opaque — 204 whether or not a matching visit existed — so the endpoint can't be
// used to probe for visits. All real logic lives in server/privacy (reusable off-Remix).
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
};

export function loader({ request }: LoaderFunctionArgs) {
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
    // Opaque: a malformed body is indistinguishable from a no-op erase.
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const { shop, visitId } = (body ?? {}) as { shop?: unknown; visitId?: unknown };
  if (typeof shop === "string" && shop.trim().length >= 3) {
    try {
      await forgetVisit(shop, visitId);
    } catch (err) {
      console.error("[privacy/erase] failed", err);
    }
  }

  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
