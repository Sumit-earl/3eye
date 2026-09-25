# v3 — "From App to Platform"

> **POV: The Architect / Strategist.** v1 proved the insight; v2 proved the revenue. Both are trapped inside one fact: **Shopify-only caps out around $1–3M ARR** (`research/05`). v3 is written from the systems-and-strategy chair because escaping that ceiling is an *architecture* problem before it's a *marketing* problem. If we build v1/v2 as a Shopify-shaped app, expansion means a rewrite. If we build the **core platform-agnostic from day one** and add one defensible asset — an **opt-in aggregated benchmark** — we convert a nice app into a business with a moat. This plan is about that core, that moat, and the sequence to $10M+.

---

## 1. The strategic problem

| Truth | Source | Implication |
|---|---|---|
| Shopify-only ceiling ≈ **$1–3M ARR** | `research/05` SOM | Shopify is the **wedge + cash-flow engine**, not the end state |
| The environment→revenue gap exists on **every** platform (Woo, Adobe/Magento, BigCommerce — none has a native merchant-facing view) | `research/03` | The product is **platform-agnostic by nature**; only distribution is Shopify-specific |
| EUEM market **$4.4B (2025) → $9.12B (2030), 15.7% CAGR**; CRO **$1.7B → $5B (2035)** | `research/05` | Base case **$10–30M ARR** is reachable *off*-Shopify |
| Incumbent RUM/DEM leaders are **all IT vendors**, none merchant-facing | `research/05` S29, `research/04` | The merchant-facing lane is **structurally open** |
| Noibu already proves **cross-platform** is how this category scales (Shopify, BigCommerce, SFCC, commercetools) | `research/02` | Multi-platform is table stakes for the $10M+ path |

**Thesis:** keep the Shopify app (it funds us), but **refactor the core into a platform-neutral engine**, add **platform adapters**, and build the **benchmark data moat** that no competitor can copy without our installed base.

## 2. Target architecture (decouple the core from Shopify)

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION (thin, swappable)                               │
│  • Shopify embedded app (Remix)   • Standalone web app (SaaS) │
│  • Org workspace / dashboards     • Public API / webhooks      │
└───────────────▲─────────────────────────────▲────────────────┘
                │                             │
┌───────────────┴─────────────────────────────┴────────────────┐
│  INSIGHT ENGINE (the product; platform-neutral)                │
│  • segment→outcome attribution   • est. $ impact model         │
│  • k-anonymity / min-group gate  • benchmark comparison        │
│  • recommendation engine (advisory)                            │
└───────────────▲──────────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────┐
│  INGESTION + AGGREGATION (aggregate at edge; store no IDs)     │
│  • consent-gated collector  • session hash (salted, short-TTL) │
│  • dimension bucketing      • funnel-event normalization       │
└───────────────▲──────────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────┐
│  CAPTURE SDK + PLATFORM ADAPTERS                               │
│  • core JS (web-vitals + Network Info API + OTel behind iface) │
│  • adapters: Shopify · WooCommerce · BigCommerce · Adobe/SFCC  │
│              · generic JS snippet                              │
└───────────────────────────────────────────────────────────────┘
```

**Build vs buy (`research/03`, S16):** capture on **Google `web-vitals`** (Apache-2.0, stable) + Network Information API, optionally **OpenTelemetry Browser** (Apache-2.0) *behind our own interface* — it's **experimental/pre-1.0**, so we never let its API leak into our core. **PostHog (MIT)** is a safe reference/possible analytics backbone; **Matomo (GPL)/Plausible (AGPL)** are copyleft — study, don't link. **Our IP is the insight engine + benchmark, not the collection.**

## 3. Data model (concrete enough to build against)

| Entity | Key fields | Privacy rule |
|---|---|---|
| `session` | salted hash (short TTL), platform, store_id, started_at | **no raw identifiers**; hash rotates; TTL ≤ retention window (`PRD.md` PR-06) |
| `environment` | device_class, browser_family, conn_type, conn_quality_bucket, region_approx, screen_bucket, secure | **coarse buckets only**; never a uniqueness/fingerprint claim (PR-12) |
| `funnel_event` | session_ref, type (pageview/atc/begin_checkout), ts, page_kind, web_vitals | client-observed; Shopify checkout is handoff-limited (documented) |
| `order` | store_id, ts, value, currency, (segment refs) | from platform webhook; joined to segments **in aggregate only** |
| `segment` | dimension combo, session_count, outcome_rates | **k-anonymity:** suppressed if count < threshold (PR-09) |
| `leak` | segment_ref, metric, est_impact, confidence, method, recommendation | every field labelled observed vs estimated (`PRD.md` §10.5) |
| `benchmark` (v3 moat) | segment_ref, cohort, aggregate distribution, opt_in_flag | **only from opted-in merchants**; aggregated; no single-merchant exposure |

**Non-negotiables:** aggregate at the edge, store no identifiers, k-anonymity gate on every output, retention windows, per-tenant isolation (`PRD.md` OB-10, PR-09, PR-06).

## 4. The moat: opt-in cross-merchant benchmarks

The one asset competitors can't replicate without our installed base:

> **"Your mobile-checkout latency for cellular shoppers in Brazil is in the worst 20% of similar stores. Fixing it to the cohort median is worth ~$X/mo."**

- **Permissioned by design** — `PRD.md` §15.3 *forbids* cross-org benchmarking without permission; we make opt-in explicit and revocable.
- **Compounding** — every opted-in merchant makes every other merchant's benchmark better → switching cost → network effect.
- **Privacy-safe** — aggregated, k-anonymized, no single merchant exposed (PR-09).
- **Defensible vs Noibu/RUM** — they have sessions but not a *consent-first, merchant-facing, cross-store environment* dataset.

## 5. Multi-tenant SaaS + org requirements (the off-Shopify product)

When we go beyond Shopify (standalone web app, Stripe billing — **no 15% cut**), we inherit the full org feature set from `PRD.md` §10.4:

| Requirement | What we build |
|---|---|
| **OB-03** authorized association | Merchant joins 3eye segments with their own first-party data, for an approved purpose |
| **OB-09** access control | RBAC — only approved org members view/export |
| **OB-10** isolation | Hard tenant isolation (no cross-org leakage) |
| **OB-11** retention/deletion | Org-controlled retention + deletion |
| **OB-12** auditability | Who viewed/exported/changed/deleted a report |
| **OB-13** fair-use boundaries | Prohibit sensitive-attribute targeting / discrimination |
| **OB-14** human oversight | High-impact recommendations require human review |

Plus the **safety/fairness reviews** from `PRD.md` §12 (PR-10 fairness, PR-14 dual-use safety) — mandatory before benchmark/org features ship.

## 6. Industry profiles (expansion surface, `PRD.md` §11.2–11.5)

Same engine, different segment configs + report templates:
- **Software services** — slow dashboards / workflow failures by environment.
- **Streaming** — buffering concentrated by device+connection; realistic quality recommendation per segment.
- **Gaming** — latency/instability concentration; connection-failure segments.
- **Marketing** — reachability ("can this audience actually use the promoted experience?").

Each profile = a config, not a new product (`PRD.md` OB-08, Phase 4–5).

## 7. Expansion sequence

1. **WooCommerce** next — largest DIY merchant base, officially weak tooling ("WP CWV plugins almost never work," `research/03` S15). Adapter + WordPress plugin.
2. **BigCommerce / SFCC** — where Noibu already validated enterprise demand; we go **merchant-facing + mid-market**.
3. **Generic JS snippet** — any site → opens software/streaming/gaming verticals (the real TAM expansion).
4. **Standalone SaaS + Stripe** — org workspaces, benchmarks, industry profiles → the $10–30M base case.

## 8. Market outcome (honest, `research/05`)

| Scenario | Scope | ARR |
|---|---|---|
| Conservative | Shopify only (v1+v2) | $1–3M |
| **Base** | + multi-platform + standalone SaaS (v3) | **$10–30M** (5–7 yrs) |
| Bull | category leader + benchmark moat | $50M+ / acquisition target |

## 9. Risks (architecture + strategy)

| Risk | Mitigation |
|---|---|
| **OTel Browser experimental** | Abstract behind our interface; `web-vitals` as the stable default |
| **Cross-platform capture fragmentation** (APIs differ per platform/checkout) | Adapter pattern; normalize to one funnel/environment schema; document per-platform limits |
| **Benchmark privacy/legal** (the moat is also the biggest liability) | Explicit opt-in, aggregation, k-anonymity, fairness + dual-use review before ship (`PRD.md` §12, §15.3) |
| **Enterprise sales ≠ self-serve motion** | Keep Shopify self-serve; add sales-led only for the org tier; don't blend motions early |
| **Data residency / infra cost at scale** | Edge aggregation (store less), region-pinned storage, retention TTLs |
| **Moat needs critical mass** | Sequence benchmarks *after* enough opted-in merchants; don't ship a thin benchmark that misleads |
| **Rewrite risk if v1/v2 built Shopify-shaped** | **This is why v3 is planned now:** keep capture/ingest/insight platform-neutral from v1, even while only shipping the Shopify presentation |

## 10. Timeline (rough — quarters, not weeks)

- **Q (post-v2):** refactor core to platform-neutral; define adapters + schema; ship WooCommerce adapter.
- **+1Q:** opt-in benchmark (behind privacy/fairness review); standalone web app skeleton + Stripe.
- **+1–2Q:** org workspace (RBAC/isolation/audit/retention); 1–2 industry profiles.
- **+2Q:** BigCommerce/SFCC adapters; generic snippet; self-serve org tier.

## 11. Open decisions

1. **Second platform** — WooCommerce (volume) vs BigCommerce/SFCC (validated enterprise demand)?
2. **Benchmark governance** — opt-in default, cohort definitions, minimum k, legal sign-off process.
3. **Motion** — stay self-serve, or add sales-led for the org/enterprise tier (and when)?
4. **Hosting/residency** — single-region vs region-pinned; affects enterprise + GDPR posture.
5. **Core neutrality now vs later** — how much platform-agnostic discipline to enforce in v1/v2 to avoid a v3 rewrite (recommend: enforce the seam now).

---
**Grounded in:** `research/03` (platform-agnostic gap + OSS licenses), `research/05` (ceiling + market), `research/02` (Noibu cross-platform proof), `research/04` (privacy moat); `PRD.md` §10.4 (OB-*), §11 (industry profiles), §12 (safety/fairness), §15.3 (no cross-org without permission), §16 (Phases 4–6). **Prev:** [`../v2/PLAN.md`](../v2/PLAN.md). **Index:** [`../README.md`](../README.md).
