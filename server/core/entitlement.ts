import type { EntitlementStatus, PlanCode, Prisma } from "@prisma/client";
import prisma from "../../app/db.server";

// Entitlement / gating seam (PLANS/v1 §3, PLANS/v2).
//
// v1 ships everyone on FREE, but every feature reads its limits through here so v2 can
// flip paid tiers on WITHOUT touching UI or query code — we just change the shop's Plan.
// The AI conversation is one of those gated features (features.aiChat).

export interface FeatureFlags {
  planCode: PlanCode;
  status: EntitlementStatus;
  sessionLimitMonthly: number;
  maxLeaksShown: number; // -1 = unlimited
  historyDays: number;
  aiChat: boolean;
  comparison: boolean;
  alerts: boolean;
  digest: boolean;
}

// Hard fallback if the FREE plan row is somehow missing (keeps the app usable).
const SAFE_DEFAULTS: FeatureFlags = {
  planCode: "FREE",
  status: "FREE",
  sessionLimitMonthly: 5000,
  maxLeaksShown: 1,
  historyDays: 7,
  aiChat: false,
  comparison: false,
  alerts: false,
  digest: false,
};

function flagsFromPlan(
  plan: {
    code: PlanCode;
    sessionLimitMonthly: number;
    maxLeaksShown: number;
    historyDays: number;
    features: Prisma.JsonValue;
  },
  status: EntitlementStatus,
): FeatureFlags {
  const f = (plan.features ?? {}) as Record<string, unknown>;
  const bool = (k: string) => f[k] === true;
  return {
    planCode: plan.code,
    status,
    sessionLimitMonthly: plan.sessionLimitMonthly,
    maxLeaksShown: plan.maxLeaksShown,
    historyDays: plan.historyDays,
    aiChat: bool("aiChat"),
    comparison: bool("comparison"),
    alerts: bool("alerts"),
    digest: bool("digest"),
  };
}

/** Resolve the effective feature flags for a shop. Never throws — falls back to FREE. */
export async function resolveEntitlement(shopId: string): Promise<FeatureFlags> {
  const entitlement = await prisma.entitlement.findUnique({
    where: { shopId },
    include: { plan: true },
  });

  if (entitlement) return flagsFromPlan(entitlement.plan, entitlement.status);

  const freePlan = await prisma.plan.findUnique({ where: { code: "FREE" } });
  return freePlan ? flagsFromPlan(freePlan, "FREE") : SAFE_DEFAULTS;
}

/** How many sessions the shop has metered in the current period (for cap enforcement). */
export async function sessionsUsedThisPeriod(shopId: string): Promise<number> {
  const ent = await prisma.entitlement.findUnique({ where: { shopId } });
  return ent?.sessionsUsedPeriod ?? 0;
}
