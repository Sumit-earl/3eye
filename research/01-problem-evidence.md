# Q1 — Does the problem exist? (Problem evidence)

**Section confidence: HIGH.** Multiple independent, primary studies tie page/network performance to conversion and revenue. The strongest merchant case studies were adversarially **VERIFIED** against Google's primary source. Main caveat: most evidence proves *page-speed → conversion*; the finer claim "*connection/network quality* → conversion" is supported but less directly measured, and one causation overreach was **REFUTED** (see below).

---

## 1.1 The canonical quantitative studies

| Finding | Numbers | Source (type, date) | Status |
|---|---|---|---|
| 0.1s mobile speed lift → conversion & AOV | Retail conversion **+8.4%**, AOV **+9.2%**; Travel conversion **+10.1%**, AOV **+1.9%**; luxury page-views **+8.6%**; lead-gen bounce **−8.3%** | Google/Deloitte "Milliseconds Make Millions" — deloitte.com (primary, 2020-03) | Source-extracted |
| Conversion vs load time (large sample) | Ecommerce conversion **−0.3% per extra second**; 1s load = **2.5×** the conversion of 5s (B2C) and **3×** (B2B); ~40% conversion at 1s → 34% at 2s | portent.com (primary, 2022-04; 100M+ pageviews, 20 sites, 30 days) | Source-extracted |
| Bounce vs load time (mobile) | 1s→10s load = **+123% bounce probability**; 400→6,000 page elements = **−95% conversion probability**; "**speed equals revenue**" | business.google.com (primary, 2018-02; ~900k mobile landing pages, 126 countries) | Source-extracted — *2018, predates LCP/CrUX; pair with newer CWV data* |
| Cart/checkout abandonment | Avg documented abandonment **70.22%** (50 studies); **17% "site had errors/crashed"** + **17% "too long/complicated checkout"** = experience/technical; ~**$260B** lost orders recoverable via better checkout design | baymard.com (primary, 2025-09-22) | Source-extracted |

**Key takeaway for 3eye:** Baymard's split is the most important nuance. The largest single abandonment reason is **non-technical (40% "extra costs too high")**. The addressable slice for an *environment/experience* tool is roughly the **~34% that is technical/checkout-friction** — not all 70%. Our revenue-impact model must scope to that slice to stay credible (PRD §4.1 "truth over completeness").

---

## 1.2 Named-merchant case studies (web.dev / Google compilation, primary, 2021-09-01)

These are the "real merchant, before/after" proof points. The first three were **VERIFIED** (3-vote adversarial) against the primary source.

| Merchant | Result | Verification |
|---|---|---|
| **Vodafone (Italy)** | LCP **+31%** → **+8% sales** (via controlled A/B test — the methodologically strong design) | ✅ **VERIFIED** (3/3 high). Primary case study: web.dev/case-studies/vodafone, 2021-03-17; corroborated by Google Search Central blog. |
| **Lazada** | LCP **3×** → **+16.9% mobile conversion** | ✅ **VERIFIED** (3/3, med-high). Caveat: self-reported via Google's case-study program; source says "conversion rate on mobile," **not** specifically *checkout* conversion. |
| **Cdiscount** | Improved all 3 Core Web Vitals → **+6% revenue uplift** | ✅ **VERIFIED** (2/2 high). Caveat: measured during **Black Friday sale**, not full-year baseline. |
| **Agrofy Market** | 70% better LCP **correlated to** 76% reduction in load-abandonment | ❌ **REFUTED as stated.** The claim that this proves slow load is a "**direct cause**" of abandonment **overreaches** — Google's own page says "**correlated**," not "caused" (observational, Q3-2020 data, agricultural marketplace). Use only as *correlation*. |
| **NDTV / Flipkart** | NDTV: 50% better bounce after halving LCP. Flipkart: 2.6% bounce reduction from CWV. | Source-extracted (web.dev compilation) |
| Tokopedia (+23% session duration), Redbus (mobile CVR +80–100%, their own attribution), iCook (+10% ad revenue), Renault (bounce/conversion improvement) | — | **From search-result snippet of the web.dev compilation — NOT extracted/verified in this run.** Treat as leads to confirm. |

> **Honesty note (carries into the whole product):** the verification process caught us turning a *correlation* (Agrofy) into a *causation*. This is exactly the failure mode PRD §4.5 ("correlation is not identity/causation") and §10.5 warn about. The 3eye UI must label derived results as observed vs. estimated vs. correlated, and never overclaim causation from a single signal.

---

## 1.3 Experience-failure → revenue-loss (secondary / vendor — handle with care)

| Claim | Source (type) | Caution |
|---|---|---|
| Amazon Prime Day 2018: ~2-hour checkout glitch → est. **$72.4M–$99M** lost sales | bigcommerce.com (blog, 2024) | Widely repeated; original estimate from third-party analytics. Directional. |
| Noibu merchant cases: Pampered Chef prevented **$1.9M** loss; King Arthur Baking **+15% revenue**; "18× ROI in 12 months"; Mejuri POC projected **$1.2M** recovered CLV | noibu.com (vendor case studies) | **Vendor-claimed, unaudited.** Good as *category* evidence that merchants pay for this; do **not** cite as independent proof. |
| "32% of customers never return after one bad experience; 79% less likely to repurchase after performance issues" | bigcommerce.com (blog) | **Unsourced vendor marketing stat** — page says only "Research shows," names no study. Do not cite externally without finding the primary. |

---

## 1.4 What this means for the build

1. **The premise holds:** environment/performance measurably moves conversion and revenue — enough to sell a tool that finds and ranks those leaks. Anchor the pitch on **Deloitte (+8.4%/0.1s)**, **Portent (−0.3%/sec)**, and the **VERIFIED** Vodafone/Lazada/Cdiscount cases.
2. **Scope the addressable slice honestly:** target the **~34% technical/checkout-friction** portion of abandonment (Baymard), not the full 70%.
3. **Revenue-impact model:** convert per-segment latency deltas → estimated conversion loss using the Portent/Deloitte curves, and **label it an estimate** with confidence + method (PRD §10.5, OB-05).
4. **Beware the causation trap:** ship "correlated with," not "caused by," unless we can A/B it (the Vodafone result is strong *because* it was an A/B test).

**Primary sources:** see [`06-sources.md`](./06-sources.md) — S21 (Deloitte), S22 (Baymard), S23 (web.dev), S24 (Portent), S25 (Google), S4 (BigCommerce), S1/S2/S11 (Noibu).
