# Q2 — Competitive landscape

**Section confidence: HIGH** for *who the players are and what they do* (sourced from vendor primary pages + Shopify App Store listings). Pricing is point-in-time and changes; treat as indicative.

**The core finding:** the market splits into two camps that **don't overlap** — and 3eye's wedge sits in the gap between them.

- **Merchant-facing, revenue-language tools** (Noibu, Exatom, Zuko) → but scoped to **errors / checkout-form fields**, *not* visitor **environment** (device+network+latency) segments.
- **Environment-capturing tools** (Datadog RUM, Adobe observability, OpenTelemetry, SpeedCurve, GA4/Clarity) → but **engineering/SEO-facing**, and they **don't tie signals to revenue** in merchant language.

> **No incumbent joins "visitor-environment segment → lost revenue" for the SMB Shopify merchant.** That join is the product.

---

## 2.1 Comparison table

| Product | Category | Captures *environment* (device/browser/network/latency)? | Ties to **revenue** in merchant language? | Audience | Pricing (indicative) | Platform(s) |
|---|---|---|---|---|---|---|
| **Noibu** | Ecommerce error + checkout monitoring | Partial — errors, site performance, behaviour; **not network/connection quality** | **Yes — strongest** ("where you're losing revenue, how much each issue costs") | Mid-market / enterprise | **Custom, quote-based**, traffic+modules | Shopify(+Plus), BigCommerce, SFCC, commercetools |
| **Exatom Checkout Analytics** | Shopify checkout analytics | No — checkout step/field + errors | Yes — conversion framing | SMB Shopify | **$75/mo (7.5k sessions) → $450/mo (50k)** | Shopify |
| **Zuko Checkout Analytics** | Shopify checkout-form analytics | No — field-level form behaviour | Partial — "monetary loss reporting" | SMB Shopify | **Free (500 sess); $29 / $49 / $99** tiers | Shopify |
| **Plug in Speed** | Shopify speed *optimization* | No — optimizes code/images | No — SEO/conversion *claims*, no measurement | SMB Shopify | **Free; $19 / $29 / $39** | Shopify |
| **Shopify native Speed report** | Platform built-in | Partial — CWV (LCP/INP/CLS), **desktop vs mobile only** | **No** | Merchant | Free | Shopify |
| **Datadog RUM** | Engineering RUM | **Yes** — CWV, load, device, 30+ metrics | No — "business impact" in *engineering* terms | Dev/SRE | Session-volume ("RUM Without Limits"); price not published; 14-day trial | Platform-agnostic |
| **Microsoft Clarity** | Free session replay/heatmaps | Partial — device-level | No | Startups/small marketing | **Free** | Platform-agnostic |
| **FullStory** | Premium product analytics/replay | Partial — device-level + custom events | No (not natively) | Enterprise product/eng/data | Premium, not published | Platform-agnostic |
| **SpeedCurve** | Web performance (RUM+synthetic+CrUX) | **Yes** — real field device/network | No — Core Web Vitals framing | Engineering/perf teams | Subscription (not in source) | Platform-agnostic |
| **FingerprintJS** | Browser fingerprinting (**identity/fraud**) | Yes — but for **identity**, not experience | No | Fraud/security teams | Usage-based | Platform-agnostic |

Sources: S1/S2/S11 (Noibu), S9 (Exatom), S10 (Zuko), S12 (Plug in Speed), S7/S8 (Shopify native), S3 (Datadog), S6 (Clarity/FullStory), S5 (SpeedCurve), S17/S18 (FingerprintJS distinction).

---

## 2.2 Closest competitor deep-dive: Noibu

Noibu is the one player that already sells the *concept* — "experience problems → revenue impact" — in merchant language. Know it cold.

- **What it does:** detects JS errors + monitors checkout funnel; **prioritizes issues by revenue impact**; session replay with ecommerce context; claims **$1.8B+ annual revenue saved**, **250B+ sessions**, **100M+ errors** (vendor-claimed).
- **Three pillars:** technical issues, site performance, user behaviour — "ties every insight directly to business impact."
- **Notable feature — "Release Monitoring":** detects a merchant's **theme/template change** and attributes downstream conversion shifts to it. This is *exactly* the before/after attribution we planned (PRD OB-07) — they have it. Differentiate elsewhere.
- **Multi-platform:** Shopify (+Plus), BigCommerce, SFCC, commercetools.
- **Its weaknesses = our opening:**
  1. Scoped to **errors/friction**, *not* **environment** (device class + network/connection type + connection quality + latency segments).
  2. **Enterprise/mid-market, quote-based pricing** → **no affordable product for the SMB Shopify long tail** (gap confirmed in source S2).
  3. Not positioned around **consent-first / aggregate / non-identifying** capture.

**Positioning vs Noibu:** *"Noibu tells you which errors cost you sales. 3eye tells you which **customer environments** — slow connections, weak devices, specific browsers/regions — are silently losing you sales, at a price a normal Shopify store can afford, without fingerprinting your shoppers."*

---

## 2.3 Shopify-native reality check

- **Native Speed report (S7/S8):** Core Web Vitals, **desktop vs mobile only**; no network/connection/region/device-class segmentation; **no conversion/revenue tie**; top-75% percentile; trailing 90 days, up to 36h delay; gated behind Reports staff permission. The storefront-performance "score" Shopify uses for apps is **synthetic Lighthouse** (weighted Home 17% / PDP 40% / Collection 43%), not real-user environment telemetry. → **Confirms gap (e): merchants lack a native segment-level environment→revenue view.**
- **Exatom (S9):** cookieless, GDPR-friendly (aligns with our positioning!), but **checkout-funnel** focused. Session-tiered $75–$450/mo → proves SMB merchants **will pay** for segment-level checkout analytics.
- **Zuko (S10):** field-level checkout analytics, monetary-loss reporting, **Free/$29/$49/$99**; launched Feb 2025, **5.0★ from only 6 reviews** → niche has **small, early-stage entrants, no entrenched dominant player.** Good entry timing.
- **Plug in Speed (S12):** *optimizes* speed (SEO framing), $19–$39; launched 2018, 4.4★/30 reviews. **Optimizes but does not measure/monetize environment-driven conversion loss** → complements rather than competes; potential integration/partner.

---

## 2.4 The white space (what to build against)

1. **Environment-segment → revenue**, not errors → revenue (vs Noibu/Exatom/Zuko).
2. **SMB Shopify price point** (vs Noibu enterprise/quote).
3. **Consent-first, aggregate, non-identifying** as a *feature* (vs Clarity's ad-profiling ToS, fingerprinting's GDPR friction — see doc 04).
4. **Connection/network quality** as a first-class signal — nobody in the merchant-facing set captures it; only engineering RUM does, and they don't monetize it for merchants.

**Risk to respect:** Noibu could add environment signals and move down-market; Exatom/Zuko could add network quality. Our defensibility is the **consent-first aggregate data asset + cross-merchant benchmarks (opt-in)** (PRD §15.3), built before they pivot.

Sources: see [`06-sources.md`](./06-sources.md).
