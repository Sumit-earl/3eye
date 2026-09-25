-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('SHOPIFY');

-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('ACTIVE', 'UNINSTALLED', 'FROZEN');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'SCALE');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('FREE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "DeviceClass" AS ENUM ('MOBILE', 'TABLET', 'DESKTOP', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BrowserFamily" AS ENUM ('CHROME', 'SAFARI', 'FIREFOX', 'EDGE', 'SAMSUNG', 'OPERA', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OsFamily" AS ENUM ('IOS', 'ANDROID', 'WINDOWS', 'MACOS', 'LINUX', 'CHROMEOS', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('CELLULAR', 'WIFI', 'ETHERNET', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConnectionQuality" AS ENUM ('SLOW_2G', 'G2', 'G3', 'G4', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'DENIED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "FunnelEventType" AS ENUM ('PAGEVIEW', 'ADD_TO_CART', 'BEGIN_CHECKOUT', 'CHECKOUT_HANDOFF');

-- CreateEnum
CREATE TYPE "PageKind" AS ENUM ('HOME', 'PRODUCT', 'COLLECTION', 'CART', 'CHECKOUT', 'OTHER');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('OBSERVED', 'ESTIMATED', 'CORRELATED');

-- CreateEnum
CREATE TYPE "AiRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT', 'TOOL');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL DEFAULT 'SHOPIFY',
    "shopifyDomain" TEXT NOT NULL,
    "shopifyShopId" TEXT,
    "name" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "ShopStatus" NOT NULL DEFAULT 'ACTIVE',
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "benchmarkOptIn" BOOLEAN NOT NULL DEFAULT false,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" TIMESTAMP(3),

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "sessionLimitMonthly" INTEGER NOT NULL,
    "maxLeaksShown" INTEGER NOT NULL DEFAULT 1,
    "historyDays" INTEGER NOT NULL DEFAULT 7,
    "features" JSONB NOT NULL DEFAULT '{}',
    "shopifyPlanHandle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'FREE',
    "shopifySubscriptionId" TEXT,
    "sessionsUsedPeriod" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitSession" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "consent" "ConsentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "deviceClass" "DeviceClass" NOT NULL DEFAULT 'UNKNOWN',
    "browserFamily" "BrowserFamily" NOT NULL DEFAULT 'UNKNOWN',
    "osFamily" "OsFamily" NOT NULL DEFAULT 'UNKNOWN',
    "connectionType" "ConnectionType" NOT NULL DEFAULT 'UNKNOWN',
    "connectionQuality" "ConnectionQuality" NOT NULL DEFAULT 'UNKNOWN',
    "regionCountry" TEXT,
    "screenBucket" TEXT,
    "secureContext" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VisitSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "FunnelEventType" NOT NULL,
    "pageKind" "PageKind" NOT NULL DEFAULT 'OTHER',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lcpMs" INTEGER,
    "inpMs" INTEGER,
    "clsScore" DOUBLE PRECISION,
    "ttfbMs" INTEGER,
    "fcpMs" INTEGER,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalCents" INTEGER NOT NULL,
    "subtotalCents" INTEGER,
    "placedAt" TIMESTAMP(3) NOT NULL,
    "attributedSessionId" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentSnapshot" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "deviceClass" "DeviceClass",
    "browserFamily" "BrowserFamily",
    "connectionType" "ConnectionType",
    "connectionQuality" "ConnectionQuality",
    "regionCountry" TEXT,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "pageviewCount" INTEGER NOT NULL DEFAULT 0,
    "addToCartCount" INTEGER NOT NULL DEFAULT 0,
    "beginCheckoutCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedOrders" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION,
    "p75LcpMs" INTEGER,
    "p75InpMs" INTEGER,
    "avgTtfbMs" INTEGER,
    "kThreshold" INTEGER NOT NULL DEFAULT 50,
    "suppressed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SegmentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leak" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "segmentSnapshotId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "whatIsWrong" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "estImpactCents" INTEGER NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "status" "ClaimStatus" NOT NULL,
    "method" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Leak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benchmark" (
    "id" TEXT NOT NULL,
    "cohortKey" TEXT NOT NULL,
    "deviceClass" "DeviceClass",
    "connectionQuality" "ConnectionQuality",
    "regionCountry" TEXT,
    "distribution" JSONB NOT NULL,
    "sampleShops" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "title" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiRole" NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AggregationRun" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sessionsProcessed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AggregationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopifyDomain_key" ON "Shop"("shopifyDomain");

-- CreateIndex
CREATE INDEX "Shop_status_idx" ON "Shop"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_shopId_key" ON "Entitlement"("shopId");

-- CreateIndex
CREATE INDEX "Entitlement_planId_idx" ON "Entitlement"("planId");

-- CreateIndex
CREATE INDEX "VisitSession_shopId_startedAt_idx" ON "VisitSession"("shopId", "startedAt");

-- CreateIndex
CREATE INDEX "VisitSession_shopId_deviceClass_connectionQuality_idx" ON "VisitSession"("shopId", "deviceClass", "connectionQuality");

-- CreateIndex
CREATE UNIQUE INDEX "VisitSession_shopId_sessionHash_key" ON "VisitSession"("shopId", "sessionHash");

-- CreateIndex
CREATE INDEX "FunnelEvent_sessionId_idx" ON "FunnelEvent"("sessionId");

-- CreateIndex
CREATE INDEX "FunnelEvent_shopId_type_occurredAt_idx" ON "FunnelEvent"("shopId", "type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_shopifyOrderId_key" ON "Order"("shopifyOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_attributedSessionId_key" ON "Order"("attributedSessionId");

-- CreateIndex
CREATE INDEX "Order_shopId_placedAt_idx" ON "Order"("shopId", "placedAt");

-- CreateIndex
CREATE INDEX "SegmentSnapshot_shopId_windowStart_idx" ON "SegmentSnapshot"("shopId", "windowStart");

-- CreateIndex
CREATE INDEX "SegmentSnapshot_shopId_deviceClass_connectionQuality_region_idx" ON "SegmentSnapshot"("shopId", "deviceClass", "connectionQuality", "regionCountry");

-- CreateIndex
CREATE INDEX "Leak_shopId_computedAt_rank_idx" ON "Leak"("shopId", "computedAt", "rank");

-- CreateIndex
CREATE INDEX "Benchmark_cohortKey_idx" ON "Benchmark"("cohortKey");

-- CreateIndex
CREATE INDEX "AiConversation_shopId_updatedAt_idx" ON "AiConversation"("shopId", "updatedAt");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AggregationRun_shopId_windowStart_windowEnd_key" ON "AggregationRun"("shopId", "windowStart", "windowEnd");

-- CreateIndex
CREATE INDEX "AuditEvent_shopId_createdAt_idx" ON "AuditEvent"("shopId", "createdAt");

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitSession" ADD CONSTRAINT "VisitSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_attributedSessionId_fkey" FOREIGN KEY ("attributedSessionId") REFERENCES "VisitSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentSnapshot" ADD CONSTRAINT "SegmentSnapshot_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leak" ADD CONSTRAINT "Leak_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leak" ADD CONSTRAINT "Leak_segmentSnapshotId_fkey" FOREIGN KEY ("segmentSnapshotId") REFERENCES "SegmentSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AggregationRun" ADD CONSTRAINT "AggregationRun_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
