# 3eye — Version Plans (v1 · v2 · v3)

Three plans for taking 3eye's B2B side — the **"Environment Revenue Leak"** product — from idea to a real income source. Each version lives in its own directory and is written from a **different point of view**, so you get three lenses on the same roadmap instead of one plan repeated.

| Version | Directory | POV (lens) | One-line mission | Gate to next version |
|---|---|---|---|---|
| **v1** | [`v1/PLAN.md`](./v1/PLAN.md) | **The Merchant** (first-time Shopify store owner) | Prove the insight is real and understandable: *"which customer environments are quietly losing me sales?"* | A merchant can correctly name their biggest leak + why, from real store data |
| **v2** | [`v2/PLAN.md`](./v2/PLAN.md) | **The Growth Operator** (us, running the app business) | Turn the validated insight into recurring revenue + an App Store presence | First paying customers; activation→paid funnel works; public listing live |
| **v3** | [`v3/PLAN.md`](./v3/PLAN.md) | **The Architect / Strategist** (systems + moat) | Break the Shopify-only ceiling: platform-agnostic core + opt-in benchmark data moat | Multi-platform capture + standalone SaaS retaining at scale |

---

## Why these three POVs

- **v1 (Merchant):** an MVP fails if the *customer* doesn't "get it" in one sitting. This plan is written from the store owner's chair — their pain, their first 72 hours, their trust concerns — because comprehension and trust are the actual MVP exit criteria (`PRD.md` §14.5–14.6).
- **v2 (Growth):** a great insight nobody pays for is a hobby. This plan switches to the operator's dashboard — install→activate→pay→retain, pricing anchored to real competitors, Shopify's revenue-share economics, App Store distribution.
- **v3 (Architect):** Shopify-only caps out around **$1–3M ARR** (`research/05-market-sizing.md`). The **$10M+** path requires leaving Shopify. This plan is about the systems and the defensible data asset that make that possible without a rewrite.

## How they connect

```
v1  Merchant POV        v2  Growth POV          v3  Architect POV
───────────────────     ───────────────────     ────────────────────────
capture + join          + billing + tiers       + platform-agnostic core
1 leak dashboard        + comparison/alerts     + opt-in benchmark MOAT
free, consent-first     + App Store launch      + multi-tenant SaaS (Stripe)
   │                        │                        │
 validates the           monetizes +              scales + defends
 insight (wedge)         distributes              (ceiling-breaker)
   └── weeks ──┘          └── ~Q1 ──┘             └── Q2+ ──┘
```

Each version's **exit criteria gate the next** — we do not build v2 monetization until v1 proves comprehension, and we do not invest in v3 platform work until v2 proves people pay.

## Grounded in

- `research/01-problem-evidence.md` — the problem is real (Deloitte +8.4%/0.1s; Portent −0.3%/sec; Baymard ~34% technical slice).
- `research/02-competitive-landscape.md` — the white space (nobody joins *environment segment → revenue* for SMB Shopify; Noibu is errors + enterprise).
- `research/04-privacy-and-gaps.md` — consent-first aggregate is a moat, not a tax.
- `research/05-market-sizing.md` — Shopify ceiling ~$1–3M ARR; $10M+ needs Phase-4 expansion.
- `PRD.md` — product principles (§4), org requirements OB-01…OB-14 (§10.4), MVP definition (§14), release phases (§16).

## Honest framing (all three plans)

These are **plans, not promises**. Every version lists its **risks, dependencies, and what it explicitly will NOT do**. The biggest cross-cutting risks: (1) low-traffic stores may not generate enough sessions to show meaningful segments — v1 must set a minimum-sessions threshold; (2) Shopify App Store review may scrutinize environment signals as "fingerprinting" — our consent-first, non-identifying design (`research/04`) is the mitigation and must be front-and-center in the listing; (3) market/store-count numbers rest partly on aggregator sources and need primary verification before any external pitch.
