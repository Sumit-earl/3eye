# v1 — "The Merchant's Mirror"

> **POV: The Merchant.** This plan is written from the chair of *Sam*, a first-time Shopify store owner doing ~$40k/month. Sam is not an engineer and doesn't care about Core Web Vitals. Sam cares about one thing: **why do people leave without buying, and what's it costing me?** Everything below is framed as what Sam needs, sees, and decides — because if Sam doesn't "get it" in one sitting, v1 has failed regardless of the code.

---

## 1. Sam's pain today (grounded)

Sam's Shopify analytics say **cart abandonment is ~70%**. That number matches the documented average (`research/01`, Baymard 70.22%) — and it is **useless to Sam**, because:
- Shopify's native speed report only splits **desktop vs mobile** — no network, no region, no device-class, no revenue tie (`research/02`, S7).
- Sam can't tell whether the loss is **price/shipping** (40% of abandonment — *not* Sam's environment problem) or **experience/technical** (~34%: 17% "errors/crashed" + 17% "too long/complicated checkout" — *exactly* our slice).
- The tools that *do* speak revenue language (Noibu) are **enterprise-priced** and scoped to **errors**, not the **slow-connection / weak-device / bad-browser** environments quietly losing Sam sales.

**Sam's real question:** *"Which groups of shoppers are hitting a broken experience, and how many dollars is each one costing me?"*

## 2. What v1 promises Sam

> **"See which customer environments are quietly losing you sales — in dollars, not jargon. We can't identify your shoppers, and that's the point."**

One screen. One ranked list. Each item: *who* (an environment segment, not a person), *what's wrong*, *how much it's costing*, *how sure we are*, and *what to do first*.

## 3. Sam's first 72 hours (the experience)

1. **Install (2 min):** Sam clicks **Add app** → OAuth → grants minimal scopes → toggles one **theme app embed** in the theme editor (no code). A short notice explains *what is collected and what is never collected* (`PRD.md` PM-01, PR-01).
2. **Wait for traffic:** the app collects consent-gated, aggregated, non-identifying signals. **Honest constraint:** if Sam's store is low-traffic, there isn't enough data yet — v1 shows a **"collecting… N more sessions needed"** state rather than a fake insight (avoids small-sample lies; `PRD.md` PR-09, PM-11).
3. **First insight (~48–72h):** Sam opens the dashboard and sees the **Revenue Leak list** (below).
4. **Act:** Sam clicks the top leak, reads the plain-language explanation + recommended fix, and either does it or shares it with their developer/freelancer.
5. **Control:** Sam can **refresh**, see **what's saved**, and **delete** their data (`PRD.md` PM-08, PM-10).

## 4. The one screen: "Revenue Leaks"

A ranked list. Each row:

| Field | Example | Rule |
|---|---|---|
| **Segment** (environment, not person) | "Mobile · cellular · Brazil · Chrome" | Coarse buckets only — never an identifier (`research/04`) |
| **What's wrong** | "Checkout page took 6.8s to become interactive" | Observed metric |
| **Est. revenue impact** | "~$410/mo at risk" | **Estimated** — computed from latency→conversion curves (Portent −0.3%/sec; Deloitte), always labelled estimate + method (`PRD.md` §10.5, OB-05) |
| **Confidence** | "Medium · 1,240 sessions" | Sample size + reliability label (ED-03) |
| **Status** | Observed vs Estimated | Every claim labelled (`PRD.md` PM-04) |
| **Recommended fix** | "Serve a lite checkout theme for slow connections" | Advisory, never auto-applied (OB-06, OB-14) |

**Plus, always visible:**
- A **"What we can't see"** panel — we do **not** collect identity, exact location, contacts, camera/mic; we can't read other sites (`PRD.md` PM-06, §14.4). This is a **trust feature**, prominently placed.
- **"Observed vs Estimated" legend** so Sam never confuses a fact with a model (`PRD.md` §4.1).

## 5. Scope

**In (v1):**
- Consent-gated capture (theme app embed): device class, browser family, connection type + rough quality (Network Information API), page/checkout responsiveness (web-vitals LCP/INP), secure-connection status, approximate region, screen bucket.
- Funnel join: client-side `pageview → add-to-cart → begin-checkout` + Shopify `orders` webhook for completion.
- Aggregation pipeline + min-group-size threshold (k-anonymity) before any segment is shown.
- **One** dashboard: Revenue Leaks (ranked by est. impact), with explanation, confidence, status, recommended fix.
- "What we can't see" trust panel; refresh; delete-my-data.
- **Free** (no billing in v1).

**Out (v1 — explicitly):**
- Billing/paid tiers (→ v2), before/after comparison, alerts, email digest (→ v2).
- Cross-merchant benchmarks, other platforms, org RBAC/audit (→ v3).
- Exact location, fingerprinting/identity, camera/mic/notifications, any "uniqueness" claim (`PRD.md` §14.4).
- Overall privacy/anonymity "score" (`PRD.md` §14.4 — no unexplained scores).

## 6. Technical approach (light — deep architecture is v3)

- **Shopify Remix app template** (official): gives OAuth, session tokens, App Bridge, billing scaffolding (billing unused in v1), webhooks.
- **Capture:** Google `web-vitals` (Apache-2.0) + Network Information API behind our own **consent-gated collector**; consider OpenTelemetry Browser (Apache-2.0) but **it's experimental** — abstract behind an interface (`research/03`, S16).
- **Consent:** hook Shopify's **Customer Privacy API** / store's existing consent; cookieless, session-scoped.
- **Store:** Postgres; **aggregate at ingest, store no raw identifiers**, short-TTL session hashes; retention window (`PRD.md` PR-06).
- **Perf gate:** the embed must be tiny — Shopify measures app impact via Lighthouse and rejects slow apps (`research/02`, S8). Budget the snippet (target < ~10KB, async, non-blocking).

## 7. Success criteria (measurable — these gate v2)

Mapped to `PRD.md` §14.5–14.6 MVP validation/exit:
- **Comprehension:** in usability tests, ≥80% of merchants can, after one look, name **one leaking segment** and **why** it's leaking (adapted from PRD consumer target §17.1).
- **Truthfulness:** **100%** of displayed items carry status + confidence + source + timestamp; **zero** unavailable-data items presented as obtainable (PR-05, §14.6).
- **No surprise permissions:** zero sensitive-permission requests without deliberate user action (PM-07).
- **Time-to-first-insight:** a store with adequate traffic sees its first leak within **72h**.
- **Real-data proof:** ≥3–5 pilot stores (design partners) each identify **at least one** concrete, evidence-backed leak they didn't know about (`PRD.md` §15.4 pilot success).
- **Deletion works:** merchant can delete/redact without support (PR-07).

## 8. Risks & honest dependencies

| Risk | Impact | Mitigation |
|---|---|---|
| **Low-traffic stores** → no meaningful segments | Core value invisible for small merchants | Minimum-sessions threshold before showing insights; honest "collecting" state; target ICP with enough traffic |
| **Checkout is Shopify-hosted** → can't inject on checkout page | Funnel observed only up to checkout handoff | Client-side funnel to begin-checkout + `orders` webhook for completion; document the limitation (PR-11) |
| **App Store review** flags environment signals as fingerprinting | Rejection/delay | Consent-first, aggregate, non-identifying design + explicit "we can't identify shoppers" messaging (`research/04`); scopes least-privilege |
| **Est. $ impact could overclaim** | Trust damage (the Agrofy causation trap, `research/01`) | Label every $ figure **estimate + method + confidence**; "correlated with," never "caused by," unless A/B'd |
| **Capture snippet slows the store** | Perf-gate rejection / merchant churn | Strict size/async budget; measure Lighthouse before/after (S8) |
| **Network Information API** unsupported on some browsers (esp. iOS Safari) | Missing connection-quality signal for a key segment | Graceful degradation; mark as "variable by browser" (`PRD.md` §7.2), never guess |

## 9. Timeline (rough)

~**3–4 weeks** to an installable pilot (matches `research` Phase 0–1):
- **Wk 1:** Partner org, dev store, Remix scaffold, OAuth/session tokens, theme app embed, consent wiring.
- **Wk 2:** capture SDK + aggregation pipeline + Postgres + `orders` webhook.
- **Wk 3:** Revenue Leak dashboard + est-impact model + trust panel + refresh/delete.
- **Wk 4:** min-sample thresholds, graceful-degradation passes, 3–5 design-partner installs, usability test.

## 10. Open decisions (need Sam-side input)

1. **Minimum sessions** before showing a leak? (e.g., ≥200 sessions/segment) — trades insight availability vs statistical honesty.
2. **Est-impact methodology** — which latency→conversion curve to expose, and how to phrase confidence so it's honest but not paralyzing.
3. **Free-tier ceiling** (if any) — or fully free in v1 and gate everything at v2.
4. **Region granularity** — country-level only (safer) vs broader; must stay non-identifying.

---
**Grounded in:** `research/01` (problem), `research/02` (white space + native-report gap), `research/04` (privacy moat), `research/03` (OSS building blocks); `PRD.md` §4, §7, §10.1–10.2, §14. **Next:** [`../v2/PLAN.md`](../v2/PLAN.md) (Growth POV) once v1 exit criteria pass.
