# 3eye — Market & Competitive Research

**Product studied:** the B2B half of 3eye — an "Environment Revenue Leak" analytics app. It installs into an online store, captures **consent-gated, aggregated, non-identifying** visitor-environment signals (device class, browser family, connection type/quality, page & checkout latency, secure-connection status, approximate region, screen), **joins them to commerce outcomes** (bounce → add-to-cart → begin-checkout → order), and ranks which environment segments are losing the merchant revenue. Beachhead = **Shopify**; later expands to other platforms and a standalone SaaS. (See `PRD.md` §8.6, §10.4, §11.)

**Research date:** 23 September 2026
**Method:** deep-research workflow (`wf_8170671b-4cd`) — 6 search angles → 29 sources fetched → 139 claims extracted → 3-vote adversarial verification.

> ⚠️ **Completeness caveat (read first).** The workflow was **killed during the final synthesis phase**. The search, fetch, and claim-extraction phases completed in full, but **adversarial verification finished for only 3 claims** (2 confirmed, 1 refuted) before the kill. Everything else below is **source-extracted** (pulled directly from a cited source, with quotes) but **not independently re-verified**. Confidence labels reflect this. If you want full verification, re-run the workflow with `resumeFromRunId` — completed agents are cached, so it resumes cheaply.

---

## Confidence legend

| Label | Meaning |
|---|---|
| **VERIFIED** | Passed 3-vote adversarial verification against the primary source. |
| **Source-extracted** | Taken verbatim/near-verbatim from a cited source, with quote, but not independently re-verified in this run. |
| **Vendor-claimed** | From a vendor's own marketing/case study — treat as directional, not audited. |
| **Aggregator** | From a stats-roundup blog, not a primary source — cross-check before citing externally. |
| **Derived** | Our own estimate/model built on sourced inputs. Assumptions stated. |
| **High / Med / Low** | Confidence in the section's overall conclusion. |

---

## Headline findings

1. **The problem is real and well-documented (High confidence).** Independent studies tie page/network performance to conversion: a 0.1s mobile speed lift → **+8.4% retail conversion** (Google/Deloitte); ecommerce conversion **−0.3% per extra second** of load (Portent, 100M+ pageviews); **1s→10s load = +123% bounce** (Google). Named-merchant case studies (Vodafone, Lazada, Cdiscount) are **VERIFIED**.
2. **But ~1/3 of abandonment is the addressable slice, not all of it.** Baymard: avg cart abandonment **70.22%**, of which **17% "errors/crashed" + 17% "too long/complicated checkout"** are experience/technical; the single biggest reason (**40%**) is non-technical (extra costs). Our wedge targets the experience/technical third.
3. **No incumbent owns "visitor-environment → revenue" for merchants (High).** The merchant-facing players (**Noibu**, **Exatom**, **Zuko**) speak revenue language but are scoped to **errors / checkout-form fields**, not **device+network+latency environment segments**. The environment-capturing players (**Datadog RUM**, **Adobe observability**, **OpenTelemetry**, **SpeedCurve**) are **engineering/SEO-facing** and don't tie to revenue. **Shopify's native speed report** is desktop-vs-mobile only, no network/segment/revenue view.
4. **Privacy is a genuine moat, not just ethics (Med-High).** Fingerprinting = personal data under GDPR (EFF); **>75% of tracking happens before/against consent** (peer-reviewed, WWW 2021); **GA4 captures only ~55.6% of real traffic** due to consent declines (Plausible). A **consent-first, aggregate-only, session-scoped** collector avoids this friction and keeps fuller coverage.
5. **Market is sizable and growing, top-down (Med).** End-User-Experience-Monitoring: **$4.4B (2025) → $9.12B (2030), 15.7% CAGR** (Grand View). CRO software: **$1.7B (2025) → $5.0B (2035), 11.6% CAGR** (Future Market Insights). Both note the merchant-facing/SMB slice is **underserved** (enterprises = 61% of CRO spend; EUEM leaders are all IT vendors).
6. **Realistic Shopify-only ceiling is modest but cheap to reach (Derived, Low-Med).** ~**6.9M stores**, **87% use apps**, avg app **$58–$67/mo**, devs keep **100% up to $1M then 85%**. A strong niche app plausibly reaches **~$1–3M ARR**; the larger prize requires Phase-4 expansion off Shopify. **All store-count figures come from one aggregator blog and must be verified against Shopify primary sources.**

---

## Doc index

| Doc | Covers | Section confidence |
|---|---|---|
| [`01-problem-evidence.md`](./01-problem-evidence.md) | Q1 — does the problem exist? studies + case studies | **High** |
| [`02-competitive-landscape.md`](./02-competitive-landscape.md) | Q2 — competitors + comparison table | **High** |
| [`03-platforms-and-oss.md`](./03-platforms-and-oss.md) | Q3/Q4 — other ecommerce platforms + open-source building blocks | **Med-High** |
| [`04-privacy-and-gaps.md`](./04-privacy-and-gaps.md) | Q5 — gap hypotheses + consent/ITP friction | **Med-High** |
| [`05-market-sizing.md`](./05-market-sizing.md) | Q6 — top-down + bottom-up TAM/SAM/SOM | **Med (top-down) / Low (bottom-up)** |
| [`06-sources.md`](./06-sources.md) | Full source list w/ URLs, type, date, verification status | — |

---

## What this research changes about the plan

- **The wedge is validated but must be sharpened against Noibu.** Noibu already sells "experience problems → revenue" to merchants. Our differentiation is **(a) environment/network signals** (not just JS errors), **(b) SMB-Shopify price point** (Noibu is enterprise/quote-based), and **(c) consent-first aggregate** positioning. Lead with all three.
- **Don't build telemetry from scratch.** OpenTelemetry Browser (Apache-2.0) + Google `web-vitals` cover capture; our value is the **join to revenue + merchant-language segment ranking**, not the collection layer.
- **Verification debt.** Before any external pitch/investor use, re-verify the market-size numbers (analyst sources conflict wildly — see doc 05) and the Shopify store-count figures (single aggregator).
