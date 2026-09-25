# Q6 — Market sizing: "how big can this become if it worked?"

**Section confidence: MED for top-down (analyst sources, but they conflict), LOW for bottom-up (single aggregator + our derived model).** Treat every number here as **directional**. Do **not** put any of it in an external pitch without re-verifying against primary sources (flagged below).

---

## 6.1 Top-down (analyst market sizes)

| Market | Size | Forecast | CAGR | Source (type, date) |
|---|---|---|---|---|
| **End-User Experience Monitoring (EUEM)** — the RUM/DEM category 3eye sits in | **$3.90B (2024), $4.40B (2025)** | **$9.12B by 2030** | **15.7%** (2025–30) | grandviewresearch.com (secondary; live page 403, retrieved via Wayback 2025-07-24) |
| **Conversion Rate Optimization (CRO) software** — the value-prop category | **$1.7B (2025)** | **$5.0B by 2035** | **11.6%** | futuremarketinsights.com (secondary, 2025-08-13) |
| Web analytics (outer bound for Phase-4 SaaS) | — | — | — | technavio.com / mordorintelligence.com — **referenced, not fetched** (leads) |

**Useful structural facts (Grand View, S29):** EUEM leaders are **all IT/observability vendors** (Dynatrace, New Relic, Datadog, IBM, SAP, Oracle, Catchpoint…) — **none merchant-facing**; **NA = >39%** of demand (aligns with Shopify's US-heavy base); **cloud = >67%**; **mobile segment growing fastest (17.1% CAGR)**. The report **explicitly links app performance → ecommerce conversion** (retail/BFSI use RUM to cut cart abandonment) — third-party validation of our premise.

**Useful structural facts (FMI, S28):** A/B testing = largest CRO segment (39%); **Large Enterprises = 61% of CRO revenue → SMEs/long-tail merchants are underserved**; NA >40%.

> ⚠️ **Source conflict — do not trust top-down CRO numbers.** FMI says CRO = **$5.0B by 2035**; Business Research Insights (referenced, not fetched) projects **~$201.8B by 2033** — a **~40× divergence**. Analyst "CRO/DEM" market definitions vary wildly. **Use these only to establish direction and growth, never a precise TAM.** The trustworthy anchor is the bottom-up Shopify data below.

---

## 6.2 Bottom-up (Shopify — the real, near-term money pool)

**Primary (shopify.dev, S26):** developers keep **100% of the first $1,000,000 USD gross app revenue, then 85%**; **+2.9% processing fee** + tax; calculated on **gross**, not net; payouts at Partner-account level.
> ⚠️ **Ambiguity to resolve:** sources differ on whether the $1M threshold is **annual or lifetime**. Confirm against current `shopify.dev/docs/apps/launch/distribution/revenue-share` before modeling billing.

**Aggregator (craftberry.co, S27 — ⚠️ single blog source, cross-check vs Shopify earnings/partner docs):**
- **~6.9M** Shopify stores
- **87%** of merchants use apps; **avg 6 apps/store**
- App developers earned **$1B+ in 2024** (whole App Store)
- Average app costs **$58–$67/month**
- **~17,600+** active apps; app count growing **50%+ YoY**

**Price anchor (from doc 02, primary listings):** Zuko $29/$49/$99; Exatom $75–$450; Plug in Speed $19/$29/$39. → 3eye blended **ARPU ≈ $79/mo (~$948/yr)** is defensible.

---

## 6.3 Derived TAM / SAM / SOM (our model — **LOW confidence, assumptions explicit**)

| Layer | Definition | Assumptions | Estimate |
|---|---|---|---|
| **TAM** (theoretical, Shopify-only) | Every Shopify store paying our ARPU | 6.9M stores × $948/yr | **~$6.5B/yr** — *not capturable; ceiling only* |
| **TAM** (grounded) | Actual Shopify app-developer money pool | 2024 dev revenue, all apps | **~$1B+/yr** — *the real pool we compete for a slice of* |
| **SAM** (serviceable) | Stores with enough traffic to care about environment→revenue **and** that buy analytics apps | ~10–15% of stores (≈690k–1.0M) × $948/yr | **~$0.65B–$0.95B/yr** |
| **SAM** (today's actual spend) | What merchants *currently* pay for adjacent checkout/CRO apps | analytics/checkout slice of $1B+ dev revenue | **~$50M–$100M/yr** — *the realistic near-term pool* |
| **SOM** (obtainable, 3 yrs) | A *strong* niche Shopify app's paying base | 1,000–3,000 paying merchants × $948/yr | **~$0.95M–$2.8M ARR** |

**Reality check on SOM:** Zuko (launched Feb 2025) had **6 reviews**; Plug in Speed (**8 years**) has **30 reviews**. Shopify app adoption is **power-law** — most apps earn little, a few earn most. So **$1–3M ARR is a *good* outcome**, not a floor. Reaching it requires strong App Store ranking + reviews (our Phase 1–3 motion).

---

## 6.4 "How big if it worked?" — scenarios

| Scenario | Scope | Plausible ARR | Basis |
|---|---|---|---|
| **Conservative** | Shopify app only, executes well | **$1–3M** | SOM above; keep ~100% up to $1M, 85% after |
| **Base** | + WooCommerce/BigCommerce/Magento/SFCC + standalone SaaS (Phase 4) | **$10–30M** (5–7 yrs) | Multiplies SAM across platforms; the gap is platform-agnostic (doc 03); Noibu proves cross-platform scales |
| **Bull** | Category leader for *merchant-facing environment→revenue* + opt-in cross-merchant benchmark moat | **$50M+ / acquisition target** | Captures a few % of the underserved SMB slice of EUEM ($9.12B by 2030) + CRO ($5B by 2035) |

**The honest framing:** Shopify alone is a **$1–3M** business — a good indie/small-team outcome with near-100% margin under the revenue-share threshold. The **$10M+** outcomes **require leaving Shopify** (Phase 4): multi-platform + the standalone SaaS for software/streaming/gaming (PRD §11.2–11.4). Shopify is the **wedge and cash-flow engine**, not the ceiling.

---

## 6.5 Verification debt before external use

1. **Store counts, app spend, dev revenue (S27)** — single aggregator. Re-verify vs **Shopify quarterly shareholder letters** + **Partner docs** (primary).
2. **CRO/DEM market sizes** — analyst definitions conflict (40×). Cite **one** source with its exact definition, or use only as a range/direction.
3. **Revenue-share threshold** — confirm **annual vs lifetime** at shopify.dev (S26).
4. **GMV ~$116B (chargeflow)** — secondary, **not fetched**; verify vs Shopify primary before using in a revenue-at-risk model.

Sources: S26, S27, S28, S29 (+ referenced-not-fetched: Mordor, Technavio, Business Research Insights, Chargeflow). See [`06-sources.md`](./06-sources.md).
