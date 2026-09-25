# 3eye — Project Summary & Context Recovery

> **Purpose of this doc:** a single place to re-orient after the prior session was lost. It captures what 3eye *is now*, what's **actually built and working**, what's **missing**, and the **roadmap**. Written 25 Sep 2026 from a full read of the repo, `PLANS/`, and `research/`.
>
> **Source-of-truth order:** `PLANS/` (v1→v3) + `research/` = current direction. The code implements **v1**. `Prev_PRD.md` is the *ancestor* doc (consumer "Personal Internet Mirror" + org "Environment Intelligence") — code comments cite it as `PRD.md §…`; treat it as background, **possibly outdated**, not the live spec.

---

## 1. What 3eye is (and the pivot)

- **Originally** a consumer privacy-transparency product ("what can the internet see about me?") — that consumer half was **made and sold to an org for public service** (described in `Prev_PRD.md`).
- **Now (this repo):** the **B2B half**, rebuilt as a **Shopify app**. Working name for the product: **"Environment Revenue Leak" / "Revenue Leaks."**

**One-line promise (v1):**
> *"See which customer environments are quietly losing you sales — in dollars, not jargon. We can't identify your shoppers, and that's the point."*

**The idea:** a tiny, consent-gated collector on the merchant's storefront watches each visit's **environment** (device class · browser family · connection type/quality · region · screen · secure context) and **funnel progress** (pageview → add-to-cart → begin-checkout, joined to orders). It aggregates everything (**no identifiers stored**), applies a **k-anonymity** minimum-group gate, and outputs **one ranked screen**: which environment segments are losing the most revenue, each with an **estimated $ impact**, **confidence**, **observed-vs-estimated status**, the **method**, and a **recommended fix**.

**The wedge / white space (`research/02`):** nobody joins *environment-segment → revenue* for **SMB Shopify**. Noibu = JS errors + enterprise-priced. Shopify's native speed report = desktop-vs-mobile only, no network/segment/revenue view. **Privacy-first (consent, aggregate, non-identifying) is positioned as a moat, not a tax** (`research/04`).

---

## 2. Current state — what is BUILT and works

Runs end-to-end **in mock mode with zero Shopify credentials** (`MOCK_SHOPIFY=true`). Postgres container `threeye_db` is **up and healthy**.

| Layer | File(s) | Status |
|---|---|---|
| **Capture snippet** | `snippet/threeye.ts` → built to `public/threeye.js` (**~9.4 KB IIFE**, within the <10 KB budget) | ✅ Built. web-vitals (LCP/INP/CLS/TTFB/FCP) + Network Info API, `sessionStorage` visit id (no cookie), `sendBeacon`, consent-gated, fires funnel events on add-to-cart / begin-checkout. |
| **Public ingest endpoint** | `app/routes/ingest.tsx` | ✅ CORS `POST /ingest`, no auth, opaque 204/400, country from **trusted edge headers only**. |
| **Ingest core (platform-neutral)** | `server/ingest/handleIngest.ts` + `schema.ts` | ✅ Zod validation of hostile client input, consent gate, coarse-enum normalization, HMAC visit hash, upsert session + append funnel events. |
| **Environment bucketing** | `server/core/environment.ts` | ✅ Clamps everything to fixed coarse enums; derives connection quality; transient UA classifier (**UA never stored**). |
| **Privacy hashing** | `server/core/hash.ts` | ✅ Salted HMAC-SHA256 visit hash + constant-time match helper (for delete-my-data). |
| **Aggregation (Postgres)** | `server/core/aggregate.ts` | ✅ Raw SQL `percentile_cont` segmentation by device × connection-quality × country → `SegmentSnapshot`s, idempotent per window, k-anonymity suppression, materializes an `AggregationRun` summary. |
| **Insight engine (PURE)** | `server/core/insight.ts` | ✅ No DB/IO. Est-revenue-impact model, fully labelled. Conservative: **−7% relative conversion per second of p75 LCP above 2.5 s, capped at 50%**; confidence by session count (≥500 HIGH, ≥150 MED, else LOW); status always `ESTIMATED`; says **"correlated with," never "caused by."** |
| **Entitlement seam** | `server/core/entitlement.ts` | ✅ Resolves FREE/STARTER/GROWTH/SCALE flags (sessions cap, # leaks, history days, aiChat/comparison/alerts/digest). v1 = everyone FREE; **gating wired so v2 flips paid tiers without touching UI/queries.** |
| **Dashboard (the one screen)** | `app/routes/app._index.tsx` | ✅ "Revenue Leaks": ranked leak cards + summary header (total est. risk, sessions, store CVR, p75 LCP, orders, revenue), **"What we can't see" trust panel**, plan-gating teaser, **Recompute** action. Polaris UI. |
| **Read side** | `app/lib/insights.server.ts` | ✅ Reads materialized rows only (fast; header window always matches the leaks shown). |
| **Shop-context seam** | `app/lib/shop.server.ts` | ✅ One switch: mock shop **or** real Shopify embedded auth (`authenticate.admin`) that lazily creates the `Shop` row. **Flipping to real Shopify = one env change, not a rewrite.** |
| **App shell** | `app/routes/app.tsx` | ✅ Mock "chrome" (nav + MOCK MODE badge) when mock; real App Bridge + NavMenu otherwise. |
| **Local storefront simulator** | `app/routes/storefront.tsx` | ✅ Exercises the **real** capture path (snippet → `/ingest` → DB) with device/network/speed/consent controls, a live beacon log, and **bulk traffic generation** to cross k=50 and watch a leak emerge. |
| **Seed** | `prisma/seed.ts` | ✅ Plan catalog + mock shop (on **GROWTH** so the demo shows all leaks + paid-gated features) + synthetic telemetry engineered so an **honest hero leak** emerges (*mobile · G2 · Brazil · slow checkout*) **plus one sub-threshold segment that gets suppressed** (proves k-anonymity). Runs aggregation at the end and prints the leaks. |
| **Schema & migrations** | `prisma/schema.prisma`, 2 migrations | ✅ Applied. Money always **Int cents**; CVR **basis points** (never float). |
| **Config** | `server/core/config.ts`, `.env` / `.env.example` | ✅ Zod-validated, fails fast at boot. Insight constants (`K_ANONYMITY_MIN=50`, currency) runtime-tunable. |
| **Snippet build pipeline** | `vite.snippet.config.ts`, `package.json` scripts | ✅ `pnpm build:snippet` / `snippet:watch`. |

**Lifecycle webhooks present:** `app/uninstalled` (`webhooks.app.uninstalled.tsx`), `app/scopes_update` (`webhooks.app.scopes_update.tsx`).

---

## 3. Architecture & data flow

```
merchant storefront visit
  └─ public/threeye.js (consent-gated, cookieless, sessionStorage visit id)
       └─ sendBeacon → POST /ingest  (CORS, no auth, country from edge header)
            └─ server/ingest/handleIngest  (zod validate → coarse-enum clamp → HMAC hash)
                 └─ Postgres: VisitSession (coarse env) + FunnelEvent (web vitals)
                      └─ [Recompute] server/core/aggregate  (SQL percentile_cont, k-anonymity gate)
                           ├─ SegmentSnapshot (aggregate only; suppressed if < K)
                           └─ server/core/insight (PURE est-$ model) → Leak (ranked, labelled)
                                └─ app._index.tsx "Revenue Leaks" dashboard (Polaris)
Shopify orders/create webhook ──(NOT YET WIRED)──> Order row (revenue join)
```

**Deliberate design discipline (for the v3 platform-agnostic goal):** ingest, environment, hash, aggregate, insight, entitlement all live in `server/core` + `server/ingest` and are **platform-neutral** (no Remix/Shopify imports). The Remix routes are **thin adapters**. Only `aggregate.ts` is Postgres-shaped. This is intentional so going multi-platform later is an adapter, not a rewrite.

---

## 4. Data model (`prisma/schema.prisma`)

v1/v2/v3 tables are **modelled up front** so there's never a risky post-deploy migration to add a core table.

- **Tenancy:** `Shop` (platform, domain, currency, retentionDays, `benchmarkOptIn` for v3, status), `Session` (Shopify auth — fixed shape).
- **Billing seam (v2):** `Plan` (code, priceCents, sessionLimitMonthly, maxLeaksShown, historyDays, features JSON, shopifyPlanHandle), `Entitlement` (status, sessionsUsedPeriod, shopifySubscriptionId).
- **Telemetry (pruned by retention):** `VisitSession` (coarse env buckets + salted `sessionHash`, consent), `FunnelEvent` (type, pageKind, web vitals), `Order` (from webhook; **best-effort attribution** — Shopify checkout is hosted, so client→order join is often impossible; null = aggregate-only).
- **Insights (kept as history):** `SegmentSnapshot` (dimension combo + counts + p75s + `kThreshold`/`suppressed`), `Leak` (rank, title, whatIsWrong, metric, `estImpactCents`, confidence, status, method, recommendation), `AggregationRun` (idempotent per window; materialized store-level summary so the header always matches the leaks).
- **v3 (defined, not populated):** `Benchmark` (opt-in cross-merchant moat), `AiConversation`/`AiMessage` (paid AI, reads aggregates only).
- **Ops:** `AuditEvent` (actor/action/target — for OB-12 auditability + compliance webhooks).

---

## 5. Privacy & trust design (central to positioning **and** App Store review)

This is the product's differentiator and its biggest review risk — baked into the code, not bolted on:

- **Consent-first, cookieless, session-scoped.** No persistent identity. Denied → capture nothing. Pending → buffer until the merchant banner resolves via `window.ThreeEye.consent(...)`.
- **Coarse buckets only** (fixed enums); server **re-normalizes/clamps** untrusted client input (defense-in-depth against a tampered beacon).
- **No raw UA, no exact pixels, no precise location, no keystrokes/element text stored.** UA used transiently to derive enums, then discarded. Country comes from **trusted edge headers**, never the client.
- **HMAC-salted visit hash**, rotated by ops, short TTL, **pruned after the shop's retention window**.
- **k-anonymity** minimum group size (`K_ANONYMITY_MIN=50`) — small segments are stored aggregate-only but **never surfaced**.
- **Honest claims:** every $ figure is `ESTIMATED` with **method + confidence + observed inputs**; **"correlated with," never "caused by"** (the "Agrofy causation trap," `research/01`).
- Dashboard ships a prominent **"What we can't see"** panel (no names/emails/devices, no exact location, no cross-site tracking/fingerprinting, hash rotated + pruned).

**App Review angle (`PLANS/v1/SOLUTION.md` §6):** the #1 rejection risk is *"environment signals look like fingerprinting."* Mitigation = the design above + explicit "we can't identify shoppers" messaging in the listing, in-app panel, and privacy policy; least-privilege scopes (`read_orders` only); a <10 KB async snippet with **Lighthouse before/after** evidence; all **mandatory compliance webhooks**; demo store + screencast.

---

## 6. How to run it (mock mode, no Shopify account needed)

```bash
pnpm install
pnpm db:up          # Postgres 16 (container threeye_db) — already healthy
pnpm setup          # prisma generate + migrate deploy
pnpm db:seed        # plans + mock shop (GROWTH) + synthetic telemetry → prints top leaks
pnpm build:snippet  # → public/threeye.js
pnpm dev:local      # Remix on :3000  (NOT `pnpm dev`, which needs Shopify creds)
```
Then open **`/app`** (Revenue Leaks dashboard) and **`/storefront`** (capture simulator: pick device/network/speed, or "Simulate visits" to bulk-generate traffic, then hit **Recompute** on `/app`).

Env knobs (`.env`): `MOCK_SHOPIFY=true`, `K_ANONYMITY_MIN=50`, `INGEST_SALT` (dev default — **rotate in prod**), `AI_PROVIDER=mock`.

---

## 7. Roadmap (PLANS/ — each version gates the next)

| Ver | POV | Mission | Gate to next |
|---|---|---|---|
| **v1** | The Merchant | Prove the insight is real & understandable ("which environments are quietly losing me sales?"). **Free**, consent-first. One "Revenue Leaks" screen. | A merchant can name their biggest leak + why, from real store data. ≥80% comprehension; 100% of items carry status+confidence+source+timestamp; 3–5 pilot stores each find ≥1 real leak. |
| **v2** | The Growth Operator | Monetize + distribute. **Shopify Billing** tiers (Free / $29 Starter / $79 Growth / $199 Scale + usage via App Events API), 14-day trial, **before/after comparison, threshold alerts, weekly digest, export**, App Store launch + ASO + review flywheel. | First paying customers; install→activate ≥50%, activate→pay ≥8%; first **$1–5k MRR**; public listing live. |
| **v3** | The Architect/Strategist | Break the **Shopify-only ~$1–3M ARR ceiling**. Platform-neutral core + adapters (WooCommerce → BigCommerce/SFCC → generic JS), **opt-in cross-merchant benchmark moat**, multi-tenant SaaS + **Stripe**, org RBAC/isolation/audit, **AI conversation**, industry profiles. | Multi-platform capture + standalone SaaS retaining at scale; base case **$10–30M ARR**. |

**Pricing anchor (`research/02`):** Zuko Free/$29/$49/$99 · Exatom $75→$450 · Plug in Speed $19/$29/$39. **Shopify economics:** devs keep 100% of first $1M gross then 85%, +2.9% processing (⚠️ confirm annual-vs-lifetime at shopify.dev).

**Market context (`research/05`, `00-README`):** EUEM $4.4B(2025)→$9.12B(2030) @15.7%; CRO $1.7B→$5B(2035). Problem evidence (High conf): Deloitte +8.4% conv per 0.1s; Portent −0.3%/sec; Baymard ~70% abandonment of which ~34% is the experience/technical slice we target.
> ⚠️ **Verification debt:** the research workflow was **killed during synthesis** — only **3 claims** were adversarially verified; the rest are source-extracted. **Store-count and market-size numbers come from aggregators and must be re-verified against primary sources before any external/investor pitch.** Can resume cheaply via the deep-research workflow's `resumeFromRunId`.

---

## 8. ⚠️ GAPS — what is NOT done (most important for resuming)

These are the holes between "v1 demo works in mock mode" and "v1 is a shippable Shopify app":

1. **`orders/create` webhook is declared but NOT implemented.** `shopify.app.toml` lists `/webhooks/orders/create`, but **no route file exists** (only `app/uninstalled` + `app/scopes_update` do). → The **revenue-outcome join is not wired to real Shopify**. (Mock/seed mode inserts `Order` rows directly, so the demo works, but the real pipeline can't price a leak without orders.)
2. **All three MANDATORY compliance webhooks are missing** — `customers/data_request`, `customers/redact`, `shop/redact` are declared in the toml but have **no route files**. **Required for public-app review** (PR-07, OB-11, `PLANS/v1/SOLUTION.md` §6). `AuditEvent` model exists to back them.
3. **No theme app extension.** `extensions/` is empty (`.gitkeep`). v1's install path is a **theme app embed** that injects `threeye.js` into storefronts with no code — **not built**. Today only the local `/storefront` simulator injects the snippet.
4. **Delete-my-data / data-request UI + endpoint not implemented.** PRD PM-10/PR-07 and `hash.ts`'s `visitHashMatches` exist for it, but no route/action uses it yet.
5. **Retention pruner not implemented.** `retentionDays` is modelled and surfaced in the trust panel, but there's **no cron/job** that actually prunes raw sessions/events (PR-06).
6. **Landing page is template boilerplate.** `app/routes/_index/route.tsx` still says *"A short heading about [your app]"*; `app.additional.tsx` is the stock Shopify demo page.
7. **No real Shopify wiring.** `client_id = ""`, `MOCK_SHOPIFY=true`, no API key/secret. (By design — **you'll provide Shopify Partner + creds at the end of the project.**) Real mode also needs `shopify app config link`, a Partner app, and a deployed/tunneled URL.
8. **Billing is read-only.** Entitlement *resolves* a plan, but there's **no Shopify Billing checkout/mutation flow** (that's v2).
9. **AI conversation not implemented** (schema + config + `aiChat` flag only; it's a v3/paid feature).
10. **No tests.** No unit/integration tests for the insight engine, ingest validation, or aggregation.
11. **Not a git repo** in this codespace (`git status` → none). No version control / history / remote yet — worth initializing before further work.

**Net:** the **insight engine, privacy model, aggregation, dashboard, capture snippet, and mock harness are solid and working.** The remaining v1 work is mostly **Shopify integration surface** (orders + compliance webhooks, theme app embed, real auth), **data-lifecycle** (delete + retention), and **presentation polish** (landing page).

---

## 9. Open decisions still on the table (`PLANS/v1` §10, `v2` §8, `v3` §11)

- **Minimum sessions** before showing a leak (currently `K=50`) — insight availability vs statistical honesty.
- **Est-impact methodology** — which latency→conversion curve to expose and how to phrase confidence (currently −7%/sec, cap 50%).
- **Region granularity** — country-level (current, safer) vs broader; must stay non-identifying.
- **Free-tier ceiling** — fully free in v1 vs a teaser cap (current seed puts the demo shop on GROWTH to show all features).
- **v2:** flat tiers vs per-session usage; comparison baseline (calendar range vs auto-detected theme/app change); ICP traffic floor.
- **v3:** second platform (WooCommerce vs BigCommerce/SFCC); benchmark governance (opt-in default, cohort defs, min k, legal sign-off); self-serve vs sales-led motion; how much platform-neutrality to enforce now.

---

## 10. File map (where things live)

```
PLANS/            v1/{PLAN,SOLUTION}.md · v2/PLAN.md · v3/PLAN.md · README.md   ← current direction
research/         00-README … 06-sources                                        ← market/competitive evidence (verification debt)
archive/          Prev_PRD.md (ancestor consumer+org PRD, cited as "PRD.md" in code; outdated) · qoder-session-backup.jsonl (old raw session, gitignored)
snippet/threeye.ts        → public/threeye.js   storefront capture snippet
server/core/      aggregate · insight · environment · hash · entitlement · config · mock
server/ingest/    handleIngest · schema         platform-neutral ingest core
app/routes/       app._index (dashboard) · ingest · storefront · app (shell) · _index (landing=boilerplate)
                  webhooks.app.{uninstalled,scopes_update} · auth.* (Shopify template)
app/lib/          shop.server (mock/real seam) · insights.server · env.server · format
prisma/           schema.prisma · migrations/ · seed.ts
shopify.app.toml  scopes=read_orders + webhook subscriptions (2 of 6 implemented)
docker-compose.yml  Postgres 16 (threeye_db)
docs/             shopify-template-README.md
```

**Stack:** Shopify Remix app template · React 18 · Polaris 12 · App Bridge 4 · `@shopify/shopify-app-remix` 4 · Prisma 6 + Postgres 16 · Vite 6 · Zod · web-vitals · TypeScript. Node ≥20.19.
