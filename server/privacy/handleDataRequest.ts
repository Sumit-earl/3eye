import prisma from "../../app/db.server";
import { normalizeDomain } from "../core/domain";
import { logPrivacyEvent } from "./audit";
import type { DataRequestResult } from "./types";

// ---------------------------------------------------------------------------
// customers/data_request core.
//
// Shopify fires this when someone asks a merchant for all data held about them, and the
// merchant forwards it to each installed app. 3eye's honest answer is structural: we store NO
// customer-identifying personal data — only coarse environment buckets and salted, rotated,
// short-TTL visit hashes that cannot be reversed to a person or correlated across visits.
// So there is nothing personal to hand back. We record the request (for accountability) and
// return a statement the merchant can relay. We deliberately do NOT log the customer's email/id.
// ---------------------------------------------------------------------------

export const NO_PERSONAL_DATA_STATEMENT =
  "3eye stores no customer-identifying personal data. It records only coarse, aggregate " +
  "storefront-environment signals (device class, connection quality, approximate country) " +
  "linked to a salted, rotated, short-lived visit hash that cannot identify a person. There is " +
  "no name, email, account, precise location, or browsing identity to export.";

export async function handleDataRequest(shopDomain: string): Promise<DataRequestResult> {
  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: normalizeDomain(shopDomain) },
    select: { id: true },
  });
  if (!shop) {
    return { status: "ignored", holdsPersonalData: false, reason: "unknown_shop" };
  }

  await logPrivacyEvent(shop.id, {
    action: "CUSTOMER_DATA_REQUEST",
    metadata: { holdsPersonalData: false, statement: NO_PERSONAL_DATA_STATEMENT },
  });

  return { status: "logged", holdsPersonalData: false };
}
