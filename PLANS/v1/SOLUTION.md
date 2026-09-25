# v1 Solution Design — "The Merchant's Mirror"

Companion to [`PLAN.md`](./PLAN.md). Answers five questions: (1) the solution idea + how the merchant benefits, (2) developer-handled billing + the freemium model, (3) problems v1 solves and how, (4) problems v1 deliberately avoids and why, (5) how we approach Shopify App Review.

---

## 1. The solution idea

A tiny, consent-gated collector on the storefront watches each **visit's environment** and **funnel progress**, aggregates it (no identifiers stored), and turns it into one ranked answer for the merchant:

```
   storefront visit                our pipeline                     merchant sees
 ┌───────────────────┐   ┌──────────────────────────────┐   ┌──────────────────────────┐
 │ device · browser   │   │ consent gate → capture        │   │ REVENUE LEAKS (ranked)    │
 │ connection type/   │──▶│ → bucket to coarse segments   │──▶│ 1. Mobile·cellular·BR·... │
 │ quality · latency  │   │ → join funnel + orders        │   │    ~$410/mo · Med conf    │
 │ region · secure    │   │ → k-anonymity gate (min N)    │   │    "checkout 6.8s → fix"  │
 │ + funnel events    │   │ → est. $ impact + confidence  │   │ 2. ...                    │
 └───────────────────┘   └──────────────────────────────┘   └──────────────────────────┘
        (per session)            (aggregate only)                 (merchant language)
```

**Worked example (Sam, ~$40k/mo):** Sam's analytics say "70% cart abandonment" — a dead end. 3eye instead says: *"Shoppers on **mobile · cellular · Brazil · Chrome** reach your checkout but it takes **6.8s** to become interactive; that segment converts **~40% worse** than your desktop shoppers and represents **~$410/month** at risk. Confidence: medium (1,240 sessions). Likely fix: serve a lighter checkout for slow connections."* That is a decision Sam can act on Monday.

## 2. How the merchant benefits

| Benefit | What Sam gets | Why it matters |
|---|---|---|
| **From "what" to "why"** | Abandonment explained by *environment segment*, not a flat 70% | The native number is un-actionable; the segment is (`research/01`, `research/02`) |
| **Ranked by dollars** | Leaks ordered by **est. revenue impact**, not by tech severity | Sam fixes the biggest $ first — ROI, not engineering trivia |
| **Honest confidence** | Every $ figure labelled *estimate + method + sample size* | Sam trusts it and isn't misled (the Agrofy causation trap, `research/01`) |
| **Privacy as reassurance** | "We can't identify your shoppers" panel | Removes the merchant's own GDPR/ethics worry; a selling point vs Clarity's ad-profiling ToS (`research/04`) |
| **No expertise needed** | Plain language + one recommended fix | Sam isn't an engineer; the product must teach, not display (`PRD.md` §4.4) |
| **Shareable** | Export/hand a leak to a dev or agency | Sam often can't fix it personally; the report carries the context |

**Net benefit:** Sam recovers revenue that was invisible before, spends effort where it pays, and never has to trade that insight for a privacy risk.

## 3. Billing — developer-handled, and the freemium model

### Who handles what (Shopify App Pricing, 2026)
- **Shopify processes the money.** Charges are **added directly to the merchant's Shopify invoice**; Shopify handles payment collection and chargebacks. The developer does **not** run card infrastructure on-Shopify.
- **The developer defines the plans and the gating.** We create pricing plans, and our app **checks the merchant's active subscription** (via the admin billing flow) to unlock/limit features.
- **Shopify pays the developer** the revenue share: **keep 100% of the first $1M USD gross, then 85%**, **+2.9% processing** (`research/05`, S26). ⚠️ Confirm *annual vs lifetime* threshold at shopify.dev before final projections.

### Current mechanics we design against
- **Hosted "Shopify App Pricing"** is the default model (there's also Manual Pricing). Build on the new hosted model + **App Events API** for usage — the legacy GraphQL Billing webhooks sunset in 2026.
- **Plan types:** **free**, **recurring** (subscription), and **usage-based** (reported via **App Events API**, supports fractional values).
- **Limit: up to 8 public plans** per app.
- **Free trials** are supported and recommended to drive adoption.
- **Testing nuance:** **App Review can select any of your existing plans**, and **free billing testing requires fresh installs** — so the plan list must be presentable and correct *at submission time*.

### The 3eye freemium seam (built in v1, activated in v2)
v1 ships **on the free plan only**, but we **wire the billing seam now** so v2 flips paid tiers on without a rewrite. Define the free plan's *limits* so the upgrade path is self-evident:

| Plan | Price | Sessions/mo | Leaks shown | History | Comparison | Alerts | Digest | Status |
|---|---|---|---|---|---|---|---|---|
| **Free** | $0 | ≤5,000 | Top 1 | 7 days | — | — | — | **v1 (active)** |
| Starter | $29 | ≤10,000 | Top 5 | 90 days | — | — | Weekly | v2 (defined, gated off) |
| Growth | $79 | ≤25,000 | All | 12 mo | ✅ | ✅ | Weekly | v2 |
| Scale | $199 | ≤50,000 | All | 24 mo | ✅ | ✅ thresholds | Weekly + CSV | v2 |
| Usage overage | variable | App Events API | — | — | — | — | — | v2 |

**How gating works technically:** on app load, read the merchant's active subscription/plan → set a server-side feature-flag/entitlement object → the UI and API enforce limits (sessions cap, # leaks, history depth). Free plan = everyone in v1. The **free tier is a teaser, not a cripple**: one real leak proves value; *history + comparison + alerts* are the habit that earns the upgrade (`PLANS/v2`).

**Why design billing in v1 if v1 is free?** Because retrofitting entitlements into a working app is error-prone; defining the plan schema + gating seam now is cheap, and it lets us **A/B the free-tier limits** before we depend on the revenue.

## 4. Problems v1 solves — and how

| Problem (grounded) | How v1 solves it |
|---|---|
| Merchant sees *that* people leave, not *why* (native report = desktop/mobile only, `research/02` S7) | Segment leaks by **device × browser × connection × region**, joined to funnel outcome |
| Can't separate price-driven loss from experience-driven loss (Baymard: 40% costs vs ~34% technical, `research/01`) | Scope insights to the **experience/technical slice** (latency, responsiveness, errors-on-page) and say so |
| Performance data lives in engineering dashboards merchants can't read (`research/04`) | Translate every metric to **plain language + est. $ + one recommended fix** |
| Cookie/consent tools under-measure (GA4 ~55.6% capture, `research/04` S20) | **Cookieless, consent-first, session-scoped** capture → fuller coverage without identifiers |
| No affordable revenue-language tool for SMB (Noibu = enterprise/errors, `research/02`) | **Free** in v1; SMB-priced tiers in v2 |
| Small-sample lies / overclaiming | **k-anonymity min-group gate** + status/confidence labels on every item (`PRD.md` §10.5) |

## 5. Problems v1 deliberately avoids — and why

| Avoided for now | Why | Revisit |
|---|---|---|
| **Paid billing / monetization** | v1's job is to prove *comprehension + trust*, not revenue; charging before value is proven kills adoption (`PRD.md` §14.5) | v2 |
| **Before/after comparison, alerts, digest** | They're retention/monetization features; premature before the core insight is validated | v2 |
| **Cross-merchant benchmarks** | The moat needs critical mass + a privacy/fairness review; a thin benchmark misleads (`PRD.md` §15.3) | v3 |
| **Other platforms / standalone SaaS** | Shopify gives distribution + billing; going multi-platform early spreads thin | v3 |
| **Org RBAC, multi-tenant workspaces, audit** | Single-store MVP doesn't need enterprise controls | v3 |
| **Exact location, fingerprinting/identity, "uniqueness" claims** | Non-goals — legal/ethical risk and the opposite of our positioning (`PRD.md` §5.2, §14.4) | Never |
| **Camera/mic/notifications, an overall privacy "score"** | No surprise permissions; no unexplained scores (`PRD.md` PM-07, §14.4) | Never |

**Principle:** every avoidance is either *"not yet validated enough to spend on"* or *"a non-goal that would break trust."* Nothing is dropped for convenience.

## 6. Approaching Shopify App Review

When v1 is complete and submitted, this is how we approach the reviewer — pre-empting the exact things that get experience/analytics apps rejected.

**What reviewers check → how we satisfy it:**

| Review area | Our approach |
|---|---|
| **Protected customer data / privacy** | Lead with **consent-first, aggregate-only, non-identifying**; implement the **mandatory webhooks** (`customers/data_request`, `customers/redact`, `shop/redact`, `app/uninstalled`, `app/scopes/update`); ship a **data-sale opt-out** + **privacy policy URL**; GDPR/CCPA stance documented. |
| **The fingerprinting concern (our biggest risk)** | Proactively state: *"3eye does **not** fingerprint or identify shoppers. Signals are coarse, session-scoped, aggregated, and cannot single out a person."* Mirror this in the listing, the in-app "What we can't see" panel, and the privacy policy. Cite the design (k-anonymity gate, no raw identifiers, short-TTL hashes). |
| **Least-privilege scopes** | Request only what's needed (e.g., `read_orders` for outcome join; theme embed for capture). Justify each scope in the submission notes. |
| **Storefront performance** | Capture snippet is **tiny, async, non-blocking** (< ~10KB budget); show **Lighthouse before/after** proving negligible impact (`research/02` S8). |
| **GraphQL Admin API + latest App Bridge** | Built on the official Remix template → current by default. |
| **Listing completeness** | Name, tagline, description, icon, **screenshots**, **demo screencast**, **demo store + test credentials**, **privacy policy URL**, **support URL**, category, pricing (free plan visible). |
| **Billing correctness** | Plans presentable at submission (**App Review can select any plan**); **free-tier testing on a fresh install**; usage via App Events API if enabled. |
| **Honest claims** | No "caused by" without A/B; every $ figure is an **estimate with method + confidence** — matches Shopify's quality bar and our own `PRD.md` §4.1. |

**The reviewer narrative (our pitch to Shopify):**
> *"3eye is a privacy-safe storefront analytics app that helps merchants see which **customer environments** — slow connections, weak devices, specific browsers/regions — are losing them sales. It is **cookieless and consent-first**, stores **no identifiers**, aggregates with a **minimum-group threshold**, and never fingerprints shoppers. It adds a **< 10KB async** snippet with negligible Lighthouse impact, requests only **`read_orders`** + a theme embed, and implements all **mandatory compliance webhooks**. A **free plan** is live; paid tiers are defined and gated. Here is a demo store + test credentials + screencast."*

**Likely rejection reasons + mitigation:**
1. *"Environment signals look like fingerprinting"* → the consent-first/aggregate/non-identifying design + explicit messaging + scopes justification (above).
2. *"Storefront slowed down"* → Lighthouse before/after evidence; strict snippet budget.
3. *"Missing mandatory webhooks / privacy policy / data-sale opt-out"* → checklist done pre-submission.
4. *"Overclaiming in listing copy"* → keep copy to observed vs estimated; no absolute causal claims.
5. *"Billing plan unclear"* → free plan visible, plans presentable, testable on fresh install.

**Process reality:** the App Excellence Team runs quality checks and can bounce the app with specific fixes; budget a review cycle (days→weeks) and iterate on feedback rather than assuming one-shot approval.

---

### Sources (billing/review mechanics)
- [Shopify App Pricing (official docs)](https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing)
- [Shopify App Pricing: 8 public plans & free testing (Digital Applied, 2026)](https://www.digitalapplied.com/blog/shopify-app-pricing-plan-limits-free-testing-2026)
- [Usage-based billing GA via App Events API (Weaverse, 2026)](https://weaverse.io/blogs/shopify-app-pricing-usage-billing-app-events-api-platform-2026)
- Internal: `research/01` (problem evidence), `research/02` (competitors, Shopify native, perf gate), `research/04` (privacy moat), `research/05` (Shopify revenue share/SOM); `PRD.md` §4–§5, §10, §12, §14–§15.
