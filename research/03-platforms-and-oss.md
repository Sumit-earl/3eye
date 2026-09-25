# Q3/Q4 — Other ecommerce platforms & open-source building blocks

**Section confidence: MED-HIGH.** Platform-native capabilities are sourced from official docs (high). Open-source license/maturity from vendor comparisons + repos (med — two are vendor-authored, bias noted).

---

## Part A — Q3: Multi-platform landscape (expansion targets)

The pattern is consistent: **every platform frames performance as an engineering/SEO concern, and none ships a native merchant-facing "environment → revenue" view.** That's good for Phase-4 expansion — the gap isn't Shopify-specific.

| Platform | Native capability | Environment→revenue view? | Notes / opening |
|---|---|---|---|
| **Shopify** | Speed report (CWV, desktop/mobile only); synthetic Lighthouse for app gating | **No** | See doc 02. Beachhead. |
| **WooCommerce / WordPress** | None native — official guidance points to **Google's suite** (PageSpeed Insights, Search Console, CrUX, Lighthouse, Web Vitals ext) + GA4 + Clarity via GTM | **No** | Official blog even warns WP Core-Web-Vitals plugins "**almost never work and break sites**" → a *dependable* Woo environment tool is an open lane. (woocommerce.com, blog, 2024-03-29) |
| **Adobe Commerce / Magento (Cloud Service)** | Built-in **observability**: metrics/logs/traces via New Relic, Grafana, Jaeger, Zipkin, Elasticsearch, Prometheus, Splunk; **RUM = CDN-proxied collection**, engineering framing | **No** — explicitly server-side request telemetry (API response times, error rates, utilization); docs **do not** tie RUM to conversion/revenue | Enterprise/ops-oriented. (experienceleague.adobe.com, primary, updated 2026-09-11) |
| **BigCommerce** | No native tool found; **Noibu has a one-click BigCommerce partnership** | Via 3rd party only | Confirms the checkout-error category is already multi-platform; environment-segment category is not. (bigcommerce.com, blog, 2024) |
| **Salesforce Commerce Cloud (SFCC)** | Not directly fetched; **Noibu lists SFCC support** | Via 3rd party only | Lead to confirm in a follow-up pass. |
| **Wix** | **Not covered in this run** | Unknown | ⚠️ Research gap — re-run needed if Wix matters. |

**CWV thresholds (useful spec detail, woocommerce.com):** LCP ≤ 2.5s, CLS < 0.1; **FID replaced by INP in early 2024.** These map directly to the "page/checkout responsiveness" signals 3eye captures (PRD §7.3 category 4).

**Strategic read:** Shopify is the right beachhead (built-in distribution + billing), but the *architecture* should keep the capture SDK and insight engine **platform-agnostic** from day one, because (a) the same gap exists on Woo/Adobe/BigCommerce, and (b) Noibu already proved cross-platform is how this category scales.

---

## Part B — Q4: Open-source building blocks (build vs. buy)

**Bottom line: don't build telemetry from scratch.** Mature OSS covers the *capture* layer; our defensible value is the **join to revenue + merchant-language segment ranking + consent-first aggregation**, which no OSS tool does.

| Building block | What it gives us | License | Maturity | Verdict |
|---|---|---|---|---|
| **OpenTelemetry Browser** (`@opentelemetry/browser-instrumentation`) | Captures **navigation timing, resource timing, web vitals, user actions, console logs** — most of our client signal set | **Apache-2.0** (commercial-friendly) | ⚠️ **Experimental / pre-1.0** — breaking-change risk; active (315 commits) | Use for capture, **pin versions**, abstract behind our own interface. No built-in commerce/revenue linkage. (github.com, primary) |
| **Google `web-vitals`** (referenced via WooCommerce/Google suite) | Field LCP/INP/CLS collection | Apache-2.0 (well-known) | Stable, widely used | The lightweight default for CWV; pair with OTel for richer timing. *(Referenced in sources, not separately fetched — confirm license/version when adopting.)* |
| **PostHog** | Product analytics + session replay + feature flags; self-hostable | **MIT core** + paid features | Mature | Reference architecture / possible analytics backbone. (posthog.com comparison — **vendor-authored, bias noted**) |
| **Matomo** | Self-hosted web analytics | **GPL** | Mature | GPL is **copyleft** — careful if linking into a proprietary SaaS; better as a reference than a dependency. (posthog.com / umami.is — vendor-authored) |
| **Plausible** | Lightweight, **cookieless, privacy-first** analytics | **AGPL** | Mature | Strong **philosophical alignment** (consent-first); AGPL is restrictive for embedding. Study their privacy positioning, don't link. (posthog.com / umami.is) |
| **"Core Web Vitals RUM" WP plugin** | Proves the exact signal set (**device type, connection type, UA, CWV across networks**) is collectable in a lightweight, **GDPR/IP-anonymized/aggregate** plugin | Open source (GPL-family) | ⚠️ **Very low** — ~10+ installs, 0 reviews | Validates feasibility + privacy approach; not a dependency. Forwards CWV to GA4 as **raw metrics, unjoined to revenue** — illustrating the fragmentation gap. (wordpress.org, primary, 2026) |
| **OpenReplay / Umami** (mentioned in self-hosted roundup) | Session replay / analytics, self-hosted | OSS (varied) | Mature-ish | Adjacent options for replay; not environment→revenue. (umami.is, blog, 2026-09 — vendor-authored) |

**License caution:** PostHog (MIT) is safe to depend on; **Matomo (GPL)** and **Plausible (AGPL)** are copyleft and risky to *link into* a closed-source commercial SaaS — use them as design references, not libraries. OTel Browser (Apache-2.0) and `web-vitals` (Apache-2.0) are the safe capture foundation.

**Recommended capture stack (derived):** Google `web-vitals` + Network Information API + a thin OTel-Browser layer for timing, all behind our own consent-gated collector that **aggregates at the edge and never stores identifiers**. This is the technically feasible, privacy-safe design the WP plugin proves works at small scale — we add the revenue join and the merchant UI.

Sources: S13 (WP plugin), S14 (Adobe), S15 (WooCommerce), S16 (OTel Browser); vendor comparisons from search angle 4 (posthog.com, umami.is — bias noted). See [`06-sources.md`](./06-sources.md).
