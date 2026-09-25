# v2 — "Turning Insight into Income"

> **POV: The Growth Operator.** This plan is written from *our* side of the table — the person running 3eye as a business. v1 proved a merchant can *understand* the leak. v2's only job is to prove a merchant will **pay** for it, **keep** paying, and **find us** in the first place. Every feature here exists to move a number in the funnel: install → activate → pay → retain → refer. If a feature doesn't move one of those, it doesn't ship in v2.

---

## 1. The funnel we're engineering

```
Impression → Install → ACTIVATE (first leak seen) → HABIT (weekly value) → PAY → RETAIN → REVIEW/REFER
   App Store    OAuth      ≤72h, needs traffic        digest+alerts        trial→paid   churn     social proof
```

The two conversion points that decide whether this is a business or a hobby:
- **Install → Activate:** a merchant who never sees a real leak (low traffic, or insight buried) never pays. Activation = *saw ≥1 ranked leak with a $ figure.*
- **Activate → Pay:** the free tier must deliver a genuine "aha" but leave the *habit-forming* value (history, comparison, alerts, more segments) behind the paywall.

## 2. Monetization (grounded in real Shopify economics)

**Rail:** Shopify Billing — the new hosted **Shopify App Pricing** + **App Events API** for usage (from earlier research). No Stripe needed on-Shopify.
**Economics:** developers keep **100% of the first $1M USD gross app revenue, then 85%**, +2.9% processing (`research/05`, S26). ⚠️ Confirm **annual vs lifetime** threshold at shopify.dev before finalizing projections.

**Pricing — anchored to what merchants already pay** (`research/02`): Zuko Free/$29/$49/$99 · Exatom $75→$450 · Plug in Speed $19/$29/$39.

| Plan | Price | Sessions/mo | Leaks | Data history | Comparison | Alerts | Digest |
|---|---|---|---|---|---|---|---|
| **Free** | $0 | ≤5,000 | Top 1 | 7 days | — | — | — |
| **Starter** | **$29** | ≤10,000 | Top 5 | 90 days | — | — | Weekly |
| **Growth** | **$79** | ≤25,000 | All | 12 mo | ✅ before/after | ✅ | Weekly |
| **Scale** | **$199** | ≤50,000 | All | 24 mo | ✅ | ✅ + thresholds | Weekly + CSV export |
| **Overage** | usage | via App Events API | | | | | |

- **14-day free trial** of Growth (Shopify-supported), then downgrade-or-pay.
- **Blended ARPU target ≈ $79/mo** (the anchor used in `research/05` SOM).
- Free tier is a **teaser, not a cripple**: one real leak is enough to prove value; *history + comparison + alerts* are the habit that earns the upgrade.

## 3. Features (each tied to a funnel metric)

| Feature | Funnel metric it moves | Why | Grounding |
|---|---|---|---|
| **Paid tiers + gating + trial→pay** | Activate→Pay | The actual monetization | Shopify Billing |
| **Before/After comparison** (pick a date range or auto-detect a theme/app change → show conversion shift by segment) | Pay, Retain | Turns a one-off insight into ongoing measurement; **directly counters Noibu's "Release Monitoring"** | `research/02` S11; `PRD.md` OB-07 |
| **Recommended action per leak** (evidence-backed, advisory) | Activate, Retain | "Insight → what I do Monday" is the retention hook | `PRD.md` OB-06 |
| **Weekly email digest** ("your top 3 leaks + what changed") | Retain (habit) | Brings Sam back without opening the app | — |
| **Threshold alerts** ("mobile checkout latency spiked 40% since your theme update") | Retain | Proactive value = low churn | — |
| **Onboarding checklist → first insight** | Install→Activate | Gets low-traffic stores to "collecting… N sessions" and sets expectation honestly | `PLANS/v1` risk table |
| **More segments** (region, browser family added to device/connection) | Pay (higher-tier value) | Richer segmentation justifies Growth/Scale | `PRD.md` §7.3 |
| **Exportable report** (CSV/PDF, with status+confidence+limitations) | Pay (Scale), Refer | Shareable to a dev/agency; embeds our trust framing | `PRD.md` §10.5 |

**Out of scope for v2 (defer to v3):** other platforms, cross-merchant benchmarks, org RBAC/multi-tenant workspaces, Stripe/self-serve web app, industry profiles. v2 stays **Shopify-only, single-store**.

## 4. Distribution (App Store is the growth engine)

- **Listing assets** (required to submit): app name, tagline, description, icon, **screenshots**, **demo screencast**, **demo store + test credentials**, **privacy policy URL**, **support URL**, pricing, category (from earlier Shopify research).
- **ASO:** target keywords competitors don't own — *"checkout conversion by device," "slow mobile shoppers," "environment revenue"* — not the saturated "speed optimizer."
- **Privacy as the differentiator in copy:** *"Cookieless. Can't identify your shoppers. Consent-first."* — turns a compliance constraint into a selling point vs Clarity's ad-profiling ToS and GA4's ~44% consent data-loss (`research/04`).
- **Review flywheel:** in-app prompt *after* a merchant acts on a leak and sees a win (peak-end moment). Early reviews → rank → organic installs → compounding, low-CAC growth. **Honest expectation:** adoption is power-law — Zuko has 6 reviews, Plug in Speed 30 after 8 years (`research/02`). Rank, not the product alone, drives discovery.

## 5. Metrics & targets

| Stage | Metric | v2 target | Why it matters |
|---|---|---|---|
| Discovery | App Store rank for target keywords | Top 10 | Distribution is the moat on-Shopify |
| Install→Activate | % installs that see ≥1 real leak | ≥50% | The killer metric; low-traffic stores drag this |
| Activate→Pay | % activated that start paid/trial | ≥8% | Benchmark for niche Shopify apps |
| Revenue | MRR | first **$1–5k MRR** by end of v2 | Proves willingness to pay |
| Retention | monthly logo churn | <5% | Digest+alerts+comparison exist to defend this |
| Unit econ | LTV:CAC | ≥3:1 | CAC is low if App Store organic works |
| Social proof | review count / rating | ≥15 reviews, ≥4.7★ | Gates rank + trust |

**Revenue ceiling (honest, from `research/05`):** a *strong* Shopify-only app reaches ~**$1–3M ARR** (≈1,000–3,000 paying merchants at ~$79). v2's job is to get onto that curve; **v3 breaks the ceiling.** Shopify-only is a good *cash-flow engine*, not the end state.

## 6. Risks

| Risk | Mitigation |
|---|---|
| **App review rejection** (environment signals read as fingerprinting) | Consent-first/aggregate/non-identifying design + explicit messaging + least-privilege scopes; pre-empt in listing (`research/04`) |
| **2026 billing migration** (legacy Billing API → App Events API) | Build on the new hosted App Pricing + App Events from day one |
| **Low-traffic ICP mismatch** (free users who'll never convert) | Segment ICP by traffic; sales/marketing aim at stores with enough sessions to see leaks |
| **Noibu moves down-market** / Exatom-Zuko add network signals | Ship the consent-first aggregate **benchmark moat** in v3 before they pivot; win on SMB price + privacy |
| **CAC rises** as App Store saturates | Invest in reviews/rank early; content ("how much is slow mobile checkout costing you") |
| **Est-impact overclaim → refunds/distrust** | Keep v1's honesty rules (estimate + method + confidence); never auto-apply actions |

## 7. Timeline (rough)

~**5–8 weeks after v1** (Phases 2–3):
- **Wk 5–6:** Shopify Billing (tiers, trial, overage via App Events), gating logic, upgrade prompts.
- **Wk 6–7:** before/after comparison, recommended actions, weekly digest, alerts.
- **Wk 8:** more segments, export, onboarding checklist.
- **Wk 9–12:** listing assets, demo store, privacy/support pages, **App Store submission**, review acquisition, iterate on rejection feedback.

## 8. Open decisions

1. **Free-tier session cap** (5k?) — generous enough to "aha," tight enough to convert.
2. **Flat tiers vs per-session usage** as the primary model — usage scales with merchant success but is harder to predict; consider hybrid.
3. **Comparison baseline** — calendar range vs auto-detected theme/app change (the latter is more magical, harder to get right).
4. **ICP traffic floor** — below what monthly-sessions do we *not* market (to protect activation %)?

---
**Grounded in:** `research/02` (competitor pricing + Noibu Release Monitoring), `research/04` (privacy as differentiator), `research/05` (Shopify economics + SOM ceiling); `PRD.md` §10.4 (OB-06, OB-07), §16 (Phases 2–3). **Prev:** [`../v1/PLAN.md`](../v1/PLAN.md). **Next:** [`../v3/PLAN.md`](../v3/PLAN.md) (Architect POV).
