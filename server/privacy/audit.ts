import prisma from "../../app/db.server";

// ---------------------------------------------------------------------------
// Privacy audit log.
//
// Every privacy action (data request, redaction, delete-my-data) is recorded for
// accountability — but the record itself must never become a privacy liability. We therefore
// log ONLY non-identifying facts: the action, an actor type, an internal target id, and coarse
// counts. NEVER a customer email, name, or the raw visit id. If the shop is later erased
// (shop/redact) these rows cascade away with it, which is exactly what erasure requires.
// ---------------------------------------------------------------------------

export type PrivacyActor = "WEBHOOK" | "VISITOR" | "SYSTEM" | "MERCHANT";

export interface PrivacyEventInput {
  actorType?: PrivacyActor;
  action: string; // CUSTOMER_DATA_REQUEST | CUSTOMER_REDACT | SHOP_REDACT | DELETE_MY_DATA
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logPrivacyEvent(shopId: string, evt: PrivacyEventInput): Promise<void> {
  await prisma.auditEvent
    .create({
      data: {
        shopId,
        actorType: evt.actorType ?? "WEBHOOK",
        action: evt.action,
        targetType: evt.targetType ?? null,
        targetId: evt.targetId ?? null,
        metadata: (evt.metadata ?? {}) as object,
      },
    })
    .catch((err) => {
      // Auditing must never break the erasure/request flow; surface but swallow.
      console.error("[privacy] failed to write audit event", evt.action, err);
    });
}
