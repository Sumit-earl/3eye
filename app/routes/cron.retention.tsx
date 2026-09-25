import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { timingSafeEqual } from "node:crypto";
import { pruneAllShops } from "../../server/retention/prune";
import { config, isMockShopify } from "../../server/core/config";

// ---------------------------------------------------------------------------
// POST /cron/retention — scheduled retention prune across all ACTIVE shops.
//
// Protected by a shared secret (x-cron-secret header, constant-time compared). When
// CRON_SECRET is unset we only respond in mock mode, so a real deployment never exposes an
// unauthenticated destructive endpoint; point your scheduler (cron-job.org, k8s CronJob, etc.)
// here with the secret set. Returns a coarse per-shop summary (counts only — no PII).
// ---------------------------------------------------------------------------

function authorized(request: Request): boolean {
  const expected = config.CRON_SECRET;
  if (!expected) return isMockShopify;
  const presented = request.headers.get("x-cron-secret") ?? "";
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(presented, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request: Request) {
  if (!authorized(request)) {
    return json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await pruneAllShops();
  return json({
    results: results.map((r) => ({
      shopId: r.shopId,
      sessionsDeleted: r.sessionsDeleted,
      eventsDeleted: r.eventsDeleted,
      batches: r.batches,
    })),
  });
}

export function loader({ request }: LoaderFunctionArgs) {
  return run(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return run(request);
}
