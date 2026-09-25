import prisma from "../db.server";

// ---------------------------------------------------------------------------
// Storefront capture status for the embedded admin. Reads existing telemetry rather than
// adding a write-per-beacon counter, so the hot ingest path stays untouched. The kill-switch
// (Shop.captureEnabled) is honored in server/ingest/handleIngest — flipping it here takes
// effect on the next beacon without redeploying or editing the theme.
// ---------------------------------------------------------------------------

export interface CaptureStatus {
  captureEnabled: boolean;
  // Most recent visit end time across all telemetry for the shop (null = never captured).
  lastBeaconAt: string | null;
  sessionsLast24h: number;
  // Retention settings/observability (drives the "Data retention" card next to capture).
  retentionDays: number;
  lastRetentionPruneAt: string | null;
}

const MS_24H = 24 * 60 * 60 * 1000;

export async function getCaptureStatus(shopId: string): Promise<CaptureStatus> {
  const since = new Date(Date.now() - MS_24H);
  const [shop, last, count] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { captureEnabled: true, retentionDays: true, lastRetentionPruneAt: true },
    }),
    prisma.visitSession.aggregate({ where: { shopId }, _max: { endedAt: true } }),
    prisma.visitSession.count({ where: { shopId, startedAt: { gte: since } } }),
  ]);
  return {
    captureEnabled: shop?.captureEnabled ?? true,
    lastBeaconAt: last._max.endedAt ? last._max.endedAt.toISOString() : null,
    sessionsLast24h: count,
    retentionDays: shop?.retentionDays ?? 30,
    lastRetentionPruneAt: shop?.lastRetentionPruneAt
      ? shop.lastRetentionPruneAt.toISOString()
      : null,
  };
}

export async function setCaptureEnabled(shopId: string, enabled: boolean): Promise<void> {
  await prisma.shop.update({ where: { id: shopId }, data: { captureEnabled: enabled } });
}
