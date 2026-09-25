# 3eye — Working Context

> Recovery doc for resuming after a conversation compaction. Source of truth = the code; this
> file is the map. Keep it current as slices land. (Supersedes the older `Product_summay.md`.)

## 1. What 3eye is

A **Shopify embedded app** (official Remix template) that surfaces **"Revenue Leaks"**: it ranks
which customer **environment segments** (device × browser × connection quality × country) are
*correlated with* the most lost checkout conversions, denominated in **estimated dollars**.

- **Consent-first, aggregate-only, non-identifying.** No PII, no cookies, no fingerprinting,
  coarse fixed enums only, k-anonymity suppression (K=50) so no individual can be singled out.
- Every dollar figure is labelled **ESTIMATED** with its method + confidence; we say
  **"correlated with", never "caused by."**
- **Pivot:** 3eye was previously built and sold to an org for public service; this is a rebuild
  as a **for-business Shopify app**, targeting a Shopify App Store launch.

**Roadmap gates:** v1 (Merchant POV, free — prove comprehension/trust) → v2 (Growth POV,
Shopify Billing tiers + comparison/alerts/digest + App Store launch) → v3 (Architect POV,
platform-agnostic core + opt-in benchmark moat + multi-tenant SaaS + AI conversation).

## 2. Hard constraints (do not violate)

- **NO Shopify credentials or third-party API keys yet.** The user supplies them only at the
  **END** of the project. Everything runs in **`MOCK_SHOPIFY=true`** mode against a seeded mock
  shop. Do not ask for creds.
- **Methodology the user wants:** build **ONE service at a time** as a complete vertical slice
  — **logic → database → UI**. Integrate existing third-party code/repos where sensible rather
  than hand-rolling. Be **modular and production-grade**, designed for a *team* (clear
  boundaries, replaceable services, "a service might upgrade/revoke"), not a solo dev. The user
  has explicitly authorized deleting/rewriting any code/file/logic (even the whole app) when it's
  wrong/slow/outdated — but keep it modular and don't break the build.
- **Don't over-organize / don't over-explain.** The user's standing feedback: "just do."

## 3. How to run (mock mode)

```bash
npm run db:up          # start Postgres 16 (docker compose service threeye_db) — currently healthy
npm run setup          # prisma generate && prisma migrate deploy
npm run db:seed        # seed plans + mock shop (on GROWTH) + synthetic telemetry, then aggregate
npm run dev:local      # remix vite:dev  → http://localhost:3000/app (dashboard), /storefront (simulator)
npm run build:snippet  # rebuild public/threeye.js from snippet/threeye.ts
npm run typecheck      # tsc --noEmit  (MUST stay green)
npm run build          # remix vite:build (production build)
```

**Migration note:** `prisma migrate dev` is **interactive and fails in this non-interactive
shell.** To add a migration: generate SQL with
`npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`,
write it into `prisma/migrations/<timestamp>_name/migration.sql`, then `npx prisma migrate deploy`
+ `npx prisma generate`.

## 4. Architecture discipline (follow this for every new service)

- **Platform-neutral core** in `server/*` — **NO Remix or Shopify imports.** These are reusable
  for the v3 multi-platform core. Only `server/core/aggregate.ts` is Postgres-shaped (raw SQL).
- **Thin adapters** in `app/routes/*` wrap the core (Remix routes, Shopify webhook handlers,
  Shopify payload mappers under `server/<svc>/shopify/`).
- **Money is always Int cents; conversion rates are basis points** (never float).
- **Privacy:** raw client visit id → salted HMAC (`server/core/hash.ts`), stored only as a
  truncated hash; `INGEST_SALT` is a secret (rotate in prod). Coarse enums re-normalized/clamped
  server-side. Country from trusted edge headers only, never client-reported.
- **Idempotency:** webhooks are at-least-once; dedupe on stable unique keys (orders on platform
  order id; aggregation runs on `[shopId, windowStart, windowEnd]`).
- **Verification pattern used so far:** write a throwaway `verify-*.mts` script at repo root, run
  with `npx tsx`, assert behavior against the live DB, then **delete it**. Also keep `tsc --noEmit`
  and `npm run build` green after every slice.

## 5. What's BUILT (working, verified)

**Capture → insight pipeline (v1 demo, end-to-end in mock mode):**
- `snippet/threeye.ts` → built `public/threeye.js` (~10.7 kB, gzip ~4.1 kB): consent-gated,
  sessionStorage visit id (`__threeye_vid`), web-vitals (LCP/INP/CLS/TTFB/FCP), `sendBeacon`
  (text/plain → no CORS preflight). Public API `window.ThreeEye.consent()/track()/forget()`.
- `app/routes/ingest.tsx` → `server/ingest/{handleIngest,schema}.ts`: public CORS `POST /ingest`,
  zod-clamped hostile input, consent gate (DENIED → capture nothing), first-write-wins env upsert,
  clock-skew clamping.
- `server/core/environment.ts` (coarse enum normalizers, UA classification — never stored),
  `server/core/config.ts` (zod-validated env), `server/core/hash.ts` (`visitHash`,
  `checkoutTokenHash`, constant-time `visitHashMatches`), `server/core/domain.ts`
  (shared `normalizeDomain`), `server/core/entitlement.ts` (plan → feature flags),
  `server/core/mock.ts` (mock shop resolver).
- `server/core/insight.ts`: **PURE** leak model (funnel factor × latency factor vs baseline;
  est impact = lost orders × AOV; confidence by session count; status always ESTIMATED).
- `server/core/aggregate.ts`: Postgres raw SQL (percentile_cont p75), groups by
  deviceClass/connectionQuality/regionCountry, k-anonymity suppression, idempotent per window,
  materializes SegmentSnapshot + ranked Leak + AggregationRun summary; clears `Shop.aggregatesStale`.
- `app/routes/app._index.tsx` + `app/lib/insights.server.ts`: **Revenue Leaks** dashboard (Polaris)
  — ranked LeakCards, summary stats, TrustPanel ("What we can't see"), plan-gating teaser,
  Recompute action, staleness banner, order→visit attribution-coverage note.
- `app/routes/storefront.tsx`: local **simulator** (mock-mode only) — device/net/speed/consent
  controls, live beacon log, bulk "Simulate visits", "Emit orders" (drives real ingest+order+
  attribution), "Forget my visit" (drives real delete-my-data).
- `app/lib/shop.server.ts`: `requireShopContext(request)` — the single mock↔real seam. Flipping to
  real Shopify = one env change (`MOCK_SHOPIFY=false`).
- `prisma/seed.ts`: plan catalog (FREE/STARTER $29/GROWTH $79/SCALE $199), mock shop on GROWTH,
  synthetic PROFILES engineered so a hero leak emerges (Mobile · slow/G2 · Brazil) + one
  sub-threshold segment to prove k-anonymity suppression.

**SLICE 1 — Order Ingestion & Attribution (DONE):**
- `server/orders/{types,schema,attribution,handleOrder}.ts` — neutral order DTO + zod (decimal→Int
  cents, currency coercion, clamped dates), best-effort checkout-token→visit join (2-day window),
  idempotent upsert keyed on platform order id, race-safe attribution retry, marks shop stale.
- `server/orders/shopify/mapOrder.ts` — the **only** Shopify-shaped order code (orders/create →
  neutral DTO). Swap platforms = new mapper.
- `app/routes/webhooks.orders.create.tsx` — verifies HMAC via `authenticate.webhook`, always acks
  200 (no retry storms).
- DB migration `20260925141335_add_order_attribution`: `VisitSession.checkoutTokenHash`
  (+`@@unique([shopId,checkoutTokenHash])`), `Shop.aggregatesStale`, `Shop.lastOrderAt`.
- Ingest captures `checkoutToken`; snippet attaches `window.Shopify.cart.token` at handoff.
- Verified: attribution join works, re-delivery idempotent (1 row), `"89.99"`→`8999`, `"usd"`→`"USD"`,
  cancelled/test/unknown-shop ignored.

**SLICE 2 — Privacy & Data Erasure (DONE):**
- `server/privacy/{types,audit,handleDataRequest,handleRedact,handleShopRedact,deleteMyData}.ts`
  — platform-neutral, **PII-free** (never logs customer email/id).
  - `customers/data_request` → logs request + returns "we hold no identifying data" statement.
  - `customers/redact` → deletes `orders_to_redact` gids + their attributed visits (cascades funnel
    events), marks stale.
  - `shop/redact` → deletes auth `Session`s by domain, then cascade-deletes `Shop` + all tenant
    tables (console-only log; an audit row would violate erasure).
  - `deleteMyData.forgetVisit` → proof-of-visit-id erasure, opaque result (can't probe).
- `app/routes/webhooks.customers.data_request.tsx`, `webhooks.customers.redact.tsx`,
  `webhooks.shop.redact.tsx` — verify + always ack 200. **All App Store-mandatory compliance
  topics now exist** (matching uris already declared in `shopify.app.toml`).
- `app/routes/privacy.erase.tsx` — public CORS `POST /privacy/erase` `{shop, visitId}` → opaque 204.
- No new tables (reused `AuditEvent` + existing `onDelete: Cascade`).
- Verified: data_request PII-free; redact erased order+visit+funnels (bogus gid ignored);
  forgetVisit wrong→not_found / correct→erased / replay→not_found; shop/redact cascaded
  shop+visits+orders+funnels+auth-session to 0 on a throwaway shop (mock shop untouched).

**SLICE 3 — Theme App Extension (real-storefront capture) — DONE + verified.**
Makes capture work on real Shopify storefronts, not just the simulator. Chose the **App Proxy**
over cross-origin fetch: the storefront calls same-origin `/apps/threeye/*` which Shopify forwards
to us *signed*, so we can trust the `shop` param (no CORS preflight, no spoofable shop).

- `server/proxy/verifyProxy.ts` — Shopify app-proxy signature verify (HMAC-SHA256 of sorted
  `k=v` pairs + client secret, constant-time). `parseProxyContext` returns `verified/failed/skipped`;
  a `failed` signature **withholds the shop**. `skipped` when no secret (mock).
- `server/core/geo.ts` — `regionFromRequest` (trusted edge headers) extracted so `/ingest` and the
  proxy route share one country-derivation path.
- `server/ingest/handleIngest.ts` — new gate: `!shop.captureEnabled` → ignore `capture_disabled`.
- `prisma` — `Shop.captureEnabled Boolean @default(true)` (+ migration `…_add_capture_enabled`):
  merchant kill-switch; pauses capture on the next beacon without editing the theme.
- Routes: `app/routes/apps.threeye.ingest.tsx` (`POST /apps/threeye/ingest`: verify sig → override
  body `shop` with the trusted proxy shop → `handleIngest`; opaque 204) and
  `app/routes/apps.threeye.threeye[.]js.tsx` (`GET /apps/threeye/threeye.js`: serves the built
  snippet `application/javascript`, `[.]` = escaped literal dot in Remix flat routes).
- `extensions/threeye-capture/` — theme app ext: `shopify.extension.toml` (`type="theme"`),
  `blocks/capture.liquid` (**app-embed** block, `target: body`, loads site-wide; script+beacon both
  via `/apps/threeye/*`; `data-shop={{ shop.permanent_domain }}`, `data-consent` select w/ consent
  + `forget()` docs), `locales/en.default.json`. `shopify.app.toml` gained `[proxy] subpath="threeye"`.
- `app/shopify.server.ts` — **bug fix**: `shopifyApp()` throws on empty keys, so the app could
  never boot without creds. Now passes clearly-labeled mock placeholders when `isMockShopify` and
  keys are empty (real-auth paths are all gated behind `!isMockShopify`).
- `app/lib/capture.server.ts` — `getCaptureStatus` (enabled flag + last-beacon + 24h session count,
  derived from existing telemetry — no write-per-beacon counter) + `setCaptureEnabled`.
- `app/routes/app._index.tsx` — **Storefront capture** card: Live/Paused/Waiting badge, last-beacon
  time, install instructions (real vs mock), and a Pause/Resume capture toggle (action `intent=
  toggleCapture`). Shown in both run and no-run states.

**Verified (throwaway script, then deleted; + e2e curl against `npm run start`):** proxy sig
round-trip ✓, tampered shop fails ✓, wrong secret fails ✓, verified→trusted / failed→withheld /
no-secret→skipped ✓, beacon dropped when disabled + accepted when re-enabled ✓; then booted the
server — `GET /apps/threeye/threeye.js`→200 `application/javascript` 10.7KB, `POST
/apps/threeye/ingest`→204 and the beacon landed (NOT_REQUIRED/DESKTOP/secure, 1 funnel event),
`GET` ingest→405, `/app`→200. `tsc --noEmit` 0, `build` 0, reseeded clean.

**SLICE 4 — v1 completion sweep: retention pruner + landing + tests + git — DONE + verified.**
This closed out every remaining v1 gap. **v1 is now feature-complete.**

- **Retention pruner (PR-06).** `server/retention/prune.ts`: `pruneShopRetention` deletes raw
  VisitSession + FunnelEvent older than `Shop.retentionDays`, batched (1000/batch), keyed on last
  activity (`endedAt ?? startedAt`). Orders survive (attribution FK is `onDelete:SetNull` — old
  joins just become aggregate-only). Writes a PII-free `RETENTION_PRUNE` AuditEvent and stamps new
  `Shop.lastRetentionPruneAt`. `pruneAllShops` iterates ACTIVE shops. Trigger: `POST /cron/retention`
  (route `cron.retention.tsx`) protected by `CRON_SECRET` header (constant-time); when the secret
  is unset it only responds in mock mode. Admin "Data retention" card (sidebar, both run/no-run)
  shows retentionDays + last prune + a manual "Prune now" (action `intent=pruneRetention`).
  NOTE: use Remix `json()`, not `Response.json` — the node fetch polyfill lacks the static method.
- **Landing page.** `_index/route.tsx` template copy replaced with real 3eye positioning (login
  form + `?shop=` redirect preserved). Dead `app.additional.tsx` boilerplate deleted (was unlinked).
- **Tests.** vitest + `tests/` suite (19 tests, 4 files) over the pure core: `environment.test.ts`
  (bucketing/UA/connection), `orders-schema.test.ts` (money→cents, currency, date clamps),
  `verify-proxy.test.ts` (sig round-trip, tamper, domain normalize), `hash.test.ts` (stable,
  shop-scoped, domain-separated). `tests/setup.ts` stubs DATABASE_URL/INGEST_SALT before config
  import. `pnpm test` / `npm test` = `vitest run`.
- **git.** Repo initialized; `.gitignore` was already correct (threeye.js build artifact, .env,
  lockfiles ignored). Initial commit + a small cron-fix commit on `main`.

**Verified:** pruner unit script 9/9 (stale deleted, fresh kept, counts exact, audit written,
stamp set); e2e against running server — landing heading served, `POST /cron/retention`→JSON
summary, `/app`→200, proxy ingest→204; `tsc` 0, vitest 19/19, build 0, reseeded.

## 6. What's ONGOING / partial

- **Real Shopify wiring** is stubbed behind seams but unexercised (no creds yet): `shopify.app.toml`
  has `client_id=""`. Webhook routes + the app-proxy routes exist and are coded correctly but can
  only be integration-tested once creds arrive (END of project). The theme app extension is
  **built and structured** (Slice 3) but **not deployed** — `shopify app deploy` needs creds.
- **App boots in mock mode now** (Slice 3 fixed the empty-key `shopifyApp()` crash), but note
  `MOCK_SHOPIFY` **defaults to true** in `server/core/config.ts` — real deploys must set it
  explicitly false or the app stays in mock mode.
- **Attribution is best-effort and mostly null** by design — Shopify checkout is hosted, so the
  cart-token→order join succeeds only when the theme exposes `window.Shopify.cart.token`. The
  leak engine prices from **store-level** revenue regardless, so null attribution never blocks it.
- Mock shop currently on **GROWTH** plan (so the demo shows all leaks + gating teaser). Flip seed
  to FREE to exercise plan gating.
- `Product_summay.md` is now **stale/superseded** by this file (still has two inline `Prev_PRD.md`
  refs that should read `archive/Prev_PRD.md`).

## 7. What's NEXT — v1 is FEATURE-COMPLETE (all gaps closed in Slice 4)

Remaining before/around launch (all gated on creds arriving at END of project):
1. **`shopify app config link` + `shopify app deploy`** — push the theme app extension + webhook/
   proxy config to a real Partner app; set `client_id`, real keys, `MOCK_SHOPIFY=false`.
2. **Real integration test** — OAuth install, orders/create delivery, app-proxy signature against
   Shopify's real secret, theme embed on a dev store.
3. **Scheduler hookup** — point a cron at `POST /cron/retention` with `CRON_SECRET` set.
4. **v2 (post-launch):** Shopify Billing checkout (plans modelled: `Plan.shopifyPlanHandle`,
   `Entitlement.shopifySubscriptionId`), comparison/alerts/digest.
5. **v3:** platform-agnostic core adapters (Woo/BigCommerce), opt-in benchmark moat (`Benchmark`
   model exists, unpopulated), AI conversation (`AI_PROVIDER` defaults to `mock`), multi-tenant SaaS/Stripe.
6. Nice-to-have: grow the vitest suite (currently 19 tests over pure core) toward `insight.ts`,
   `orders/handleOrder.ts`, `privacy/*` with a test DB.

## 8. Data model (Prisma + Postgres 16) — `prisma/schema.prisma`

- `Session` — Shopify auth storage (fixed shape, required by the session-storage-prisma adapter).
- `Shop` — tenant. `platform`, `shopifyDomain` (unique), `currency`, `timezone`, `status`,
  **`captureEnabled=true`** (kill-switch, Slice 3), `retentionDays=30`, `benchmarkOptIn`,
  **`aggregatesStale`**, **`lastOrderAt`**, **`lastRetentionPruneAt`** (Slice 4). All tenant
  tables cascade-delete from here.
- `Plan` / `Entitlement` — billing seam (free in v1, tiers gated for v2).
- `VisitSession` — coarse env buckets + `sessionHash` (+**`checkoutTokenHash`**), `consent`,
  `@@unique([shopId,sessionHash])`, `@@unique([shopId,checkoutTokenHash])`.
- `FunnelEvent` — type (PAGEVIEW/ADD_TO_CART/BEGIN_CHECKOUT/CHECKOUT_HANDOFF), pageKind, CWV fields.
- `Order` — `shopifyOrderId` (unique, stores the **gid**), `totalCents`, `placedAt`,
  `attributedSessionId` (nullable, unique, best-effort join).
- `SegmentSnapshot` — dimension combo + counts + p75s + `kThreshold`/`suppressed`.
- `Leak` — rank, title, whatIsWrong, metric, `estImpactCents`, `confidence`, `status`, `method`,
  `recommendation`.
- `AggregationRun` — idempotent per window + materialized store summary (revenue, CVR bp, counts).
- `Benchmark` (v3), `AiConversation`/`AiMessage` (v3), `AuditEvent` (privacy/ops log, PII-free).
- Migrations: `20260925094858_init`, `20260925103147_add_aggregation_summary`,
  `20260925141335_add_order_attribution`, `20260925145140_add_capture_enabled`,
  `20260925160153_add_retention_prune_tracking`.

## 9. File map (key paths)

```
server/core/      insight.ts aggregate.ts environment.ts hash.ts config.ts entitlement.ts domain.ts mock.ts geo.ts
server/ingest/    handleIngest.ts schema.ts
server/orders/    handleOrder.ts schema.ts attribution.ts types.ts shopify/mapOrder.ts
server/privacy/   handleDataRequest.ts handleRedact.ts handleShopRedact.ts deleteMyData.ts audit.ts types.ts
server/proxy/     verifyProxy.ts (app-proxy signature verify)
server/retention/ prune.ts (retention pruner, PR-06)
server/env.ts     loads .env (Node loadEnvFile) for code-first dev
app/routes/       app.tsx app._index.tsx ingest.tsx storefront.tsx privacy.erase.tsx cron.retention.tsx
                  apps.threeye.ingest.tsx apps.threeye.threeye[.]js.tsx (app-proxy endpoints)
                  webhooks.orders.create.tsx webhooks.customers.data_request.tsx
                  webhooks.customers.redact.tsx webhooks.shop.redact.tsx
                  webhooks.app.uninstalled.tsx webhooks.app.scopes_update.tsx
                  _index/route.tsx (landing, real copy) auth.$.tsx auth.login/* (template auth)
app/lib/          shop.server.ts insights.server.ts capture.server.ts env.server.ts format.ts
app/              shopify.server.ts db.server.ts
prisma/           schema.prisma seed.ts migrations/
snippet/          threeye.ts  → public/threeye.js (built via vite.snippet.config.ts)
extensions/       threeye-capture/ (theme app ext: toml + blocks/capture.liquid app-embed + locales)
tests/            vitest suite (setup.ts + environment/orders-schema/verify-proxy/hash tests)
archive/          Prev_PRD.md (outdated ancestor PRD) · qoder-session-backup.jsonl (old raw session)
PLANS/            v1/ v2/ v3/ (most recent product direction)
research/         supporting research notes
context.md        THIS FILE
shopify.app.toml  scopes=read_orders; all webhook uris + [proxy] subpath="threeye"; client_id=""
```

## 10. Suggested next slice

**v1 is feature-complete — nothing left to build in mock mode.** The next work is
**credential-gated** (arriving at END of project): `shopify app config link` + `shopify app deploy`,
real OAuth/orders/app-proxy integration test on a dev store, and cron hookup for
`/cron/retention`. Until creds arrive, the highest-value optional work is **growing the vitest
suite** (19 tests now) toward `insight.ts` + `orders/handleOrder.ts` + `privacy/*` with a test DB,
or starting **v2 billing** behind the existing `Entitlement` seam. Confirm direction.
