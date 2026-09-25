-- Order ingestion & attribution slice (additive, non-destructive).
--   • Shop.aggregatesStale / lastOrderAt — staleness signal so the UI can show "new data
--     since last compute" without recomputing on every order webhook.
--   • VisitSession.checkoutTokenHash — domain-separated HMAC of a checkout/cart token,
--     enabling a best-effort join from an orders/create webhook back to the visit. Null for
--     most visits (hosted checkout); Postgres permits multiple NULLs under the unique index.

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "aggregatesStale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastOrderAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VisitSession" ADD COLUMN     "checkoutTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VisitSession_shopId_checkoutTokenHash_key" ON "VisitSession"("shopId", "checkoutTokenHash");
