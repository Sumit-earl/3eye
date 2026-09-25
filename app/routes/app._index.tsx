import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  InlineStack,
  Layout,
  List,
  Page,
  Text,
} from "@shopify/polaris";

import { requireShopContext } from "../lib/shop.server";
import {
  getDashboardData,
  recompute,
  resolveEntitlement,
  type DashboardLeak,
} from "../lib/insights.server";
import {
  getCaptureStatus,
  setCaptureEnabled,
  type CaptureStatus,
} from "../lib/capture.server";
import { pruneShopRetention } from "../../server/retention/prune";
import {
  formatCvrBp,
  formatMoney,
  formatMs,
  formatNumber,
  relativeTime,
} from "../lib/format";

// ---------------------------------------------------------------------------
// Revenue Leaks — the ONE screen that matters in v1 (PLANS/v1). Ranked, dollar-denominated,
// every claim labelled observed/estimated with confidence + method, plus a "What we can't
// see" trust panel. Free in v1; the plan/entitlement seam is wired so v2 can gate it.
// ---------------------------------------------------------------------------

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const ctx = await requireShopContext(request);
  const [flags, dash, capture] = await Promise.all([
    resolveEntitlement(ctx.shopId),
    getDashboardData(ctx.shopId),
    getCaptureStatus(ctx.shopId),
  ]);

  return {
    shop: {
      domain: ctx.shopDomain,
      currency: ctx.currency,
      retentionDays: ctx.retentionDays,
      isMock: ctx.isMock,
    },
    flags: {
      planCode: flags.planCode,
      status: flags.status,
      maxLeaksShown: flags.maxLeaksShown,
      aiChat: flags.aiChat,
    },
    dash,
    capture,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const ctx = await requireShopContext(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "recompute");

  if (intent === "toggleCapture") {
    await setCaptureEnabled(ctx.shopId, form.get("enabled") === "true");
    return redirect("/app");
  }

  if (intent === "pruneRetention") {
    await pruneShopRetention(ctx.shopId);
    return redirect("/app");
  }

  const days = Number(new URL(request.url).searchParams.get("days") ?? 30) || 30;
  await recompute(ctx.shopId, days);
  return redirect("/app");
};

const STATUS_TONE: Record<string, "success" | "info" | "attention"> = {
  OBSERVED: "success",
  ESTIMATED: "attention",
  CORRELATED: "info",
};

const CONFIDENCE_TONE: Record<string, "success" | "attention" | "info"> = {
  HIGH: "success",
  MEDIUM: "attention",
  LOW: "info",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <BlockStack gap="100">
      <Text as="span" variant="bodySm" tone="subdued">
        {label}
      </Text>
      <Text as="span" variant="headingMd">
        {value}
      </Text>
    </BlockStack>
  );
}

function LeakCard({ leak, currency }: { leak: DashboardLeak; currency: string }) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack gap="300" align="center" blockAlign="center" wrap={false}>
          <Box
            background="bg-fill-critical"
            borderRadius="200"
            paddingInlineStart="200"
            paddingInlineEnd="200"
            paddingBlockStart="100"
            paddingBlockEnd="100"
          >
            <Text as="span" variant="headingSm" tone="critical">
              #{leak.rank}
            </Text>
          </Box>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text as="h2" variant="headingMd">
              {leak.title}
            </Text>
          </div>
          <BlockStack gap="0" align="end">
            <Text as="span" variant="headingLg" fontWeight="bold">
              {formatMoney(leak.estImpactCents, currency)}
            </Text>
            <Text as="span" variant="bodySm" tone="subdued">
              est. at risk / {leak.windowDays}d
            </Text>
          </BlockStack>
        </InlineStack>

        <InlineStack gap="200" wrap>
          <Badge tone={STATUS_TONE[leak.status] ?? "info"}>{leak.status}</Badge>
          <Badge tone={CONFIDENCE_TONE[leak.confidence] ?? "info"}>
            {`${leak.confidence} confidence`}
          </Badge>
          <Badge>{`${formatNumber(leak.segment.sessionCount)} sessions`}</Badge>
        </InlineStack>

        <Text as="p" variant="bodyMd">
          {leak.whatIsWrong}
        </Text>

        <InlineStack gap="400" wrap>
          <Text as="span" variant="bodySm" tone="subdued">
            Metric: <Text as="span" variant="bodySm">{leak.metric}</Text>
          </Text>
          {leak.segment.p75LcpMs != null && (
            <Text as="span" variant="bodySm" tone="subdued">
              p75 LCP: <Text as="span" variant="bodySm">{formatMs(leak.segment.p75LcpMs)}</Text>
            </Text>
          )}
          <Text as="span" variant="bodySm" tone="subdued">
            Began checkout:{" "}
            <Text as="span" variant="bodySm">{formatNumber(leak.segment.beginCheckoutCount)}</Text>
          </Text>
        </InlineStack>

        <Divider />

        <BlockStack gap="100">
          <InlineStack gap="200" align="center" blockAlign="center">
            <Text as="span" variant="headingSm">
              Recommended next step
            </Text>
          </InlineStack>
          <Text as="p" variant="bodyMd">
            {leak.recommendation}
          </Text>
        </BlockStack>

        <Box
          background="bg-surface-secondary"
          borderRadius="200"
          padding="300"
        >
          <BlockStack gap="100">
            <Text as="span" variant="bodySm" fontWeight="bold" tone="subdued">
              How we calculated this
            </Text>
            <Text as="span" variant="bodySm" tone="subdued">
              {leak.method}
            </Text>
            <Text as="span" variant="bodySm" tone="subdued">
              Computed {relativeTime(leak.computedAt)}.
            </Text>
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
}

function TrustPanel({
  suppressedCount,
  retentionDays,
}: {
  suppressedCount: number;
  retentionDays: number;
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          What we can&rsquo;t see
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          3eye is consent-first and aggregate-only. We deliberately cannot identify anyone.
        </Text>
        <List>
          <List.Item>No names, emails, accounts, or devices.</List.Item>
          <List.Item>No exact location — only coarse country buckets.</List.Item>
          <List.Item>No keystrokes, clicks content, or card data.</List.Item>
          <List.Item>No cross-site tracking or fingerprinting.</List.Item>
          <List.Item>
            Visit links are a salted hash, rotated and pruned after {retentionDays} days.
          </List.Item>
        </List>
        <Divider />
        <InlineStack gap="200" align="center" blockAlign="center">
          <Badge>
            {`${formatNumber(suppressedCount)} segment${suppressedCount === 1 ? "" : "s"} hidden`}
          </Badge>
        </InlineStack>
        <Text as="p" variant="bodySm" tone="subdued">
          Groups smaller than 50 sessions are suppressed (k-anonymity) and never shown, so no
          individual can be singled out.
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          Figures are <strong>correlated with</strong>, never proven to have caused, revenue
          changes. Each is labelled observed or estimated with its method.
        </Text>
      </BlockStack>
    </Card>
  );
}

function CaptureCard({
  capture,
  isMock,
}: {
  capture: CaptureStatus;
  isMock: boolean;
}) {
  const live = capture.captureEnabled && (capture.sessionsLast24h > 0 || capture.lastBeaconAt);
  const tone = !capture.captureEnabled ? "attention" : live ? "success" : "info";
  const label = !capture.captureEnabled
    ? "Paused"
    : live
      ? "Live"
      : "Waiting for data";

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack gap="200" align="space-between" blockAlign="center" wrap={false}>
          <Text as="h2" variant="headingMd">
            Storefront capture
          </Text>
          <Badge tone={tone as "attention" | "success" | "info"}>{label}</Badge>
        </InlineStack>

        {capture.captureEnabled ? (
          <Text as="p" variant="bodySm" tone="subdued">
            {live
              ? `${formatNumber(capture.sessionsLast24h)} visit${
                  capture.sessionsLast24h === 1 ? "" : "s"
                } in the last 24h${
                  capture.lastBeaconAt ? ` · last ${relativeTime(capture.lastBeaconAt)}` : ""
                }.`
              : "No visits captured yet. Enable the 3eye Capture app embed in your theme to start collecting."}
          </Text>
        ) : (
          <Text as="p" variant="bodySm" tone="subdued">
            Capture is paused — incoming beacons are dropped at the door. Resume to start
            collecting again. Already-stored data is untouched.
          </Text>
        )}

        {!isMock && (
          <Text as="p" variant="bodySm" tone="subdued">
            Install: Theme editor → App embeds → enable <strong>3eye Capture</strong>. It loads
            site-wide through the App Proxy, so no theme code or backend URL is needed.
          </Text>
        )}
        {isMock && (
          <Text as="p" variant="bodySm" tone="subdued">
            Mock mode: use the <a href="/storefront">Mock Storefront</a> to emit live beacons.
            On a real shop, the 3eye Capture app embed injects the same snippet site-wide.
          </Text>
        )}

        <Divider />

        <Form method="post">
          <input type="hidden" name="intent" value="toggleCapture" />
          <input
            type="hidden"
            name="enabled"
            value={capture.captureEnabled ? "false" : "true"}
          />
          <Button submit icon={capture.captureEnabled ? "PauseMinor" : "PlayMinor"}>
            {capture.captureEnabled ? "Pause capture" : "Resume capture"}
          </Button>
        </Form>
      </BlockStack>
    </Card>
  );
}

function RetentionCard({ capture }: { capture: CaptureStatus }) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          Data retention
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          Raw visit and event data is automatically deleted after{" "}
          <strong>{capture.retentionDays} days</strong> — a privacy commitment we enforce in
          code, not just policy. Orders and your computed reports are kept.
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          Last prune:{" "}
          {capture.lastRetentionPruneAt ? relativeTime(capture.lastRetentionPruneAt) : "never"}
        </Text>
        <Form method="post">
          <input type="hidden" name="intent" value="pruneRetention" />
          <Button submit icon="DeleteMinor">
            Prune now
          </Button>
        </Form>
      </BlockStack>
    </Card>
  );
}

export default function RevenueLeaks() {
  const { shop, flags, dash, capture } = useLoaderData<typeof loader>();
  const currency = shop.currency;
  const { run, leaks, stale, attribution } = dash;

  const unlimited = flags.maxLeaksShown < 0;
  const visibleLeaks = unlimited ? leaks : leaks.slice(0, flags.maxLeaksShown);
  const hiddenByPlan = unlimited ? 0 : Math.max(0, leaks.length - visibleLeaks.length);

  return (
    <Page
      title="Revenue Leaks"
      subtitle="Where your storefront environment is quietly costing you checkout conversions — ranked by estimated dollars at risk."
    >
      <BlockStack gap="500">
        {shop.isMock && (
          <Banner tone="info">
            <Text as="p" variant="bodySm">
              Running on seeded mock data for <strong>{shop.domain}</strong> (plan{" "}
              <strong>{flags.planCode}</strong>). No Shopify credentials required. Load the{" "}
              <a href="/storefront">Mock Storefront</a> to capture live beacons, then Recompute.
            </Text>
          </Banner>
        )}

        {run && stale && (
          <Banner tone="warning" title="Data changed since this report">
            <Text as="p" variant="bodySm">
              Orders or visits have changed (new orders, or an erasure request) since this report
              was computed. Recompute to refresh the rankings and dollar figures.
            </Text>
          </Banner>
        )}

        {!run ? (
          <BlockStack gap="400">
            <CaptureCard capture={capture} isMock={shop.isMock} />
            <RetentionCard capture={capture} />
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  No insights computed yet
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Once we&rsquo;ve captured a few visits, compute your first Revenue Leaks report.
                </Text>
                <Form method="post">
                  <Button submit variant="primary">
                    Compute Revenue Leaks
                  </Button>
                </Form>
              </BlockStack>
            </Card>
          </BlockStack>
        ) : (
          <>
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" align="space-between" blockAlign="center" wrap>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Estimated revenue at risk
                    </Text>
                    <Text as="span" variant="headingXl" fontWeight="bold">
                      {formatMoney(run.totalEstImpactCents, currency)}
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      over the last {run.windowDays} days
                    </Text>
                  </BlockStack>
                  <Form method="post">
                    <InlineStack gap="200" align="center" blockAlign="center">
                      <Text as="span" variant="bodySm" tone="subdued">
                        Updated {relativeTime(run.finishedAt)}
                      </Text>
                      <Button submit icon="RefreshMinor">
                        Recompute
                      </Button>
                    </InlineStack>
                  </Form>
                </InlineStack>

                <Divider />

                <InlineStack gap="500" wrap blockAlign="center">
                  <Stat
                    label="Leaks found"
                    value={`${run.leakCount}`}
                  />
                  <Stat label="Sessions analyzed" value={formatNumber(run.sessionsProcessed)} />
                  <Stat label="Store conversion" value={formatCvrBp(run.storeCvrBp)} />
                  <Stat label="Store p75 LCP" value={formatMs(run.storeP75LcpMs)} />
                  <Stat label="Orders" value={formatNumber(run.storeOrders)} />
                  <Stat
                    label="Revenue"
                    value={formatMoney(run.storeRevenueCents, currency)}
                  />
                </InlineStack>
              </BlockStack>
            </Card>

            <Layout>
              <Layout.Section>
                <BlockStack gap="400">
                  {visibleLeaks.length === 0 ? (
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h2" variant="headingMd">
                          No significant leaks in this window 🎉
                        </Text>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          No environment segment is under-performing your store baseline by a
                          meaningful margin. We&rsquo;ll keep watching as more visits come in.
                        </Text>
                      </BlockStack>
                    </Card>
                  ) : (
                    visibleLeaks.map((leak) => (
                      <LeakCard key={leak.id} leak={leak} currency={currency} />
                    ))
                  )}

                  {hiddenByPlan > 0 && (
                    <Card>
                      <BlockStack gap="200">
                        <InlineStack gap="200" align="center" blockAlign="center">
                          <Badge tone="magic">{`${flags.planCode} plan`}</Badge>
                          <Text as="span" variant="headingSm">
                            {hiddenByPlan} more leak{hiddenByPlan === 1 ? "" : "s"} identified
                          </Text>
                        </InlineStack>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Your plan surfaces the top {flags.maxLeaksShown}. Upgrade to see every
                          ranked leak and unlock the AI assistant.
                        </Text>
                      </BlockStack>
                    </Card>
                  )}
                </BlockStack>
              </Layout.Section>

              <Layout.Section variant="oneThird">
                <BlockStack gap="400">
                  <CaptureCard capture={capture} isMock={shop.isMock} />
                  <RetentionCard capture={capture} />
                  <TrustPanel
                    suppressedCount={run.suppressedCount}
                    retentionDays={shop.retentionDays}
                  />
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h2" variant="headingMd">
                        Segments analyzed
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {run.segmentCount} environment segments across device, connection
                        quality, and country. {run.suppressedCount} suppressed for privacy.
                      </Text>
                      <Divider />
                      <Text as="p" variant="bodySm" tone="subdued">
                        Window: {new Date(run.windowStart).toLocaleDateString()} –{" "}
                        {new Date(run.windowEnd).toLocaleDateString()}
                      </Text>
                      {attribution && attribution.total > 0 && (
                        <>
                          <Divider />
                          <Text as="p" variant="bodySm" tone="subdued">
                            <strong>
                              {formatNumber(attribution.attributed)} of{" "}
                              {formatNumber(attribution.total)}
                            </strong>{" "}
                            orders in this window were joined to a specific visit. The rest are
                            aggregate-only — Shopify checkout is hosted, so a per-order link
                            isn&rsquo;t always possible. Revenue figures use all orders either way.
                          </Text>
                        </>
                      )}
                    </BlockStack>
                  </Card>
                </BlockStack>
              </Layout.Section>
            </Layout>
          </>
        )}
      </BlockStack>
    </Page>
  );
}
