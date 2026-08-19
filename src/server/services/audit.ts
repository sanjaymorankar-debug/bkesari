/**
 * Audit logging (requirement §46).
 *
 * Every sensitive mutation records who did what, to which entity, and the
 * before/after values. Audit writes must never break the operation they
 * describe, so failures are logged and swallowed — but they are always written
 * inside the caller's transaction when one is supplied, so a rolled-back
 * operation does not leave a phantom audit entry.
 */
import { db, type DbClient } from "@/server/db";
import { auditLogs, type UserRole } from "@/server/db/schema";

export const AUDIT_ACTIONS = {
  SHOP_REGISTERED: "shop.registered",
  SHOP_APPROVED: "shop.approved",
  SHOP_REJECTED: "shop.rejected",
  SHOP_SUSPENDED: "shop.suspended",
  SHOP_UPDATED: "shop.updated",
  SHOP_CLASSIFICATION_CHANGED: "shop.classification_changed",
  PRODUCT_PRICE_CHANGED: "shop_product.price_changed",
  PRODUCT_AVAILABILITY_CHANGED: "shop_product.availability_changed",
  PRODUCT_CREATED: "shop_product.created",
  CATEGORY_CREATED: "category.created",
  WALLET_ADJUSTED: "wallet.adjusted",
  WALLET_REFUNDED: "wallet.refunded",
  WALLET_TOPUP_VERIFIED: "wallet.topup_verified",
  USER_ROLE_CHANGED: "user.role_changed",
  USER_SUSPENDED: "user.suspended",
  ORDER_STATUS_CHANGED: "order.status_changed",
  ORDER_PLACED: "order.placed",
  SUBSCRIPTION_CREATED: "subscription.created",
  SUBSCRIPTION_MODIFIED: "subscription.modified",
  SUBSCRIPTION_PAUSED: "subscription.paused",
  SUBSCRIPTION_RESUMED: "subscription.resumed",
  SUBSCRIPTION_CANCELLED: "subscription.cancelled",
  SUBSCRIPTION_OVERRIDE_SET: "subscription.override_set",
  SUBSCRIPTION_ORDER_GENERATED: "subscription.order_generated",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: UserRole | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * @param client Pass the surrounding transaction so the audit row commits or
 *               rolls back atomically with the change it records.
 */
export async function recordAudit(
  entry: AuditEntry,
  client: DbClient = db,
): Promise<void> {
  try {
    await client.insert(auditLogs).values({
      actorId: entry.actorId ?? null,
      actorRole: entry.actorRole ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      previousValue: (entry.previousValue ?? null) as never,
      newValue: (entry.newValue ?? null) as never,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    });
  } catch (error) {
    // Never let observability break the business operation.
    console.error("[audit] failed to record entry", entry.action, error);
  }
}
