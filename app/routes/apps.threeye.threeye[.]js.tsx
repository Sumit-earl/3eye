import type { LoaderFunctionArgs } from "@remix-run/node";
import { readFile } from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// GET /apps/threeye/threeye.js — serves the capture snippet through the App Proxy.
//
// The theme app extension points its <script src> here, so the storefront loads the snippet
// same-origin (no CORS, no hardcoded backend URL in the theme). One artifact, one source of
// truth: the bundle produced by `pnpm build:snippet` at public/threeye.js. Shopify caches the
// proxy response per Cache-Control, so a short max-age keeps deploys prompt without hammering
// disk. (Serving from the extension's own assets/ via Shopify's CDN is the alternative if this
// ever needs to scale further — kept out for now to avoid duplicating the build output.)
// ---------------------------------------------------------------------------

const JS_HEADERS = {
  "Content-Type": "application/javascript; charset=utf-8",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
} as const;

const SNIPPET_PATH = path.join(process.cwd(), "public", "threeye.js");

export async function loader(_: LoaderFunctionArgs) {
  try {
    const code = await readFile(SNIPPET_PATH);
    return new Response(code, { status: 200, headers: JS_HEADERS });
  } catch {
    // Snippet not built yet. Return an inert no-op rather than a hard error so a storefront
    // with the block enabled never breaks if the asset is briefly missing.
    return new Response("/* 3eye: snippet unavailable */", { status: 404, headers: JS_HEADERS });
  }
}
