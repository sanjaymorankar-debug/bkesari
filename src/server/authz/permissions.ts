/**
 * Capability matrix (requirement §4, §42, §43).
 *
 * Authorization is decided here and nowhere else. Route handlers call `can()` or
 * `requirePermission()`; UI may *also* hide controls, but hiding is cosmetic —
 * the server check is the real boundary.
 *
 * Two distinct questions are always asked separately:
 *   1. Capability — may this ROLE ever perform this action?  (this file)
 *   2. Ownership  — does this specific row belong to this user? (guards.ts)
 * Both must pass.
 */
import type { UserRole } from "@/server/db/schema";

export const PERMISSIONS = {
  // Shops
  SHOP_CREATE: "shop:create",
  SHOP_UPDATE_OWN: "shop:update:own",
  SHOP_UPDATE_ANY: "shop:update:any",
  SHOP_APPROVE: "shop:approve",
  SHOP_REJECT: "shop:reject",
  SHOP_SUSPEND: "shop:suspend",
  /** Kesari/Green. Deliberately NOT granted to SHOP_OWNER (§10). */
  SHOP_SET_CLASSIFICATION: "shop:set-classification",

  // Catalogue
  CATEGORY_MANAGE: "category:manage",
  PRODUCT_MANAGE: "product:manage",
  SHOP_PRODUCT_MANAGE_OWN: "shop-product:manage:own",
  SHOP_PRODUCT_MANAGE_ANY: "shop-product:manage:any",

  // Orders
  ORDER_PLACE: "order:place",
  ORDER_VIEW_OWN: "order:view:own",
  ORDER_VIEW_SHOP: "order:view:shop",
  ORDER_VIEW_ANY: "order:view:any",
  ORDER_UPDATE_STATUS_SHOP: "order:update-status:shop",
  ORDER_UPDATE_STATUS_ANY: "order:update-status:any",
  ORDER_CANCEL_OWN: "order:cancel:own",

  // Wallet
  WALLET_VIEW_OWN: "wallet:view:own",
  WALLET_TOPUP_OWN: "wallet:topup:own",
  WALLET_VIEW_ANY: "wallet:view:any",
  /** Manual credit/debit — admin only; every use is audit-logged. */
  WALLET_ADJUST: "wallet:adjust",
  WALLET_REFUND: "wallet:refund",

  // Subscriptions
  SUBSCRIPTION_MANAGE_OWN: "subscription:manage:own",
  SUBSCRIPTION_VIEW_SHOP: "subscription:view:shop",
  SUBSCRIPTION_MANAGE_ANY: "subscription:manage:any",

  // Users & system
  USER_VIEW_ANY: "user:view:any",
  USER_SET_ROLE: "user:set-role",
  USER_SUSPEND: "user:suspend",
  SYSTEM_CONFIG: "system:config",
  AUDIT_LOG_VIEW: "audit-log:view",

  // Reports
  REPORT_VIEW_SHOP: "report:view:shop",
  REPORT_VIEW_OPERATIONAL: "report:view:operational",
  REPORT_VIEW_ALL: "report:view:all",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const CUSTOMER_PERMISSIONS: readonly Permission[] = [
  PERMISSIONS.SHOP_CREATE, // any customer may apply to register a shop
  PERMISSIONS.ORDER_PLACE,
  PERMISSIONS.ORDER_VIEW_OWN,
  PERMISSIONS.ORDER_CANCEL_OWN,
  PERMISSIONS.WALLET_VIEW_OWN,
  PERMISSIONS.WALLET_TOPUP_OWN,
  PERMISSIONS.SUBSCRIPTION_MANAGE_OWN,
];

const SHOP_OWNER_PERMISSIONS: readonly Permission[] = [
  ...CUSTOMER_PERMISSIONS,
  PERMISSIONS.SHOP_UPDATE_OWN,
  PERMISSIONS.SHOP_PRODUCT_MANAGE_OWN,
  PERMISSIONS.ORDER_VIEW_SHOP,
  PERMISSIONS.ORDER_UPDATE_STATUS_SHOP,
  PERMISSIONS.SUBSCRIPTION_VIEW_SHOP,
  PERMISSIONS.REPORT_VIEW_SHOP,
  // Deliberately absent: SHOP_SET_CLASSIFICATION, CATEGORY_MANAGE,
  // SHOP_UPDATE_ANY, SYSTEM_CONFIG.
];

const OPERATOR_PERMISSIONS: readonly Permission[] = [
  PERMISSIONS.SHOP_CREATE,
  PERMISSIONS.ORDER_PLACE,
  PERMISSIONS.ORDER_VIEW_OWN,
  PERMISSIONS.ORDER_CANCEL_OWN,
  PERMISSIONS.WALLET_VIEW_OWN,
  PERMISSIONS.WALLET_TOPUP_OWN,
  PERMISSIONS.SUBSCRIPTION_MANAGE_OWN,

  PERMISSIONS.SHOP_UPDATE_ANY,
  PERMISSIONS.SHOP_APPROVE,
  PERMISSIONS.SHOP_REJECT,
  PERMISSIONS.SHOP_SUSPEND,
  PERMISSIONS.SHOP_SET_CLASSIFICATION,
  PERMISSIONS.CATEGORY_MANAGE,
  PERMISSIONS.PRODUCT_MANAGE,
  PERMISSIONS.SHOP_PRODUCT_MANAGE_ANY,
  PERMISSIONS.ORDER_VIEW_ANY,
  PERMISSIONS.ORDER_UPDATE_STATUS_ANY,
  PERMISSIONS.SUBSCRIPTION_MANAGE_ANY,
  PERMISSIONS.USER_VIEW_ANY,
  PERMISSIONS.REPORT_VIEW_OPERATIONAL,
  // Deliberately absent (§43 "not unrestricted system access"):
  // USER_SET_ROLE, USER_SUSPEND, WALLET_ADJUST, SYSTEM_CONFIG,
  // AUDIT_LOG_VIEW, REPORT_VIEW_ALL, WALLET_VIEW_ANY.
];

const ADMIN_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS: Readonly<
  Record<UserRole, readonly Permission[]>
> = {
  CUSTOMER: CUSTOMER_PERMISSIONS,
  SHOP_OWNER: SHOP_OWNER_PERMISSIONS,
  OPERATOR: OPERATOR_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
};

const PERMISSION_SETS: Readonly<Record<UserRole, ReadonlySet<Permission>>> = {
  CUSTOMER: new Set(CUSTOMER_PERMISSIONS),
  SHOP_OWNER: new Set(SHOP_OWNER_PERMISSIONS),
  OPERATOR: new Set(OPERATOR_PERMISSIONS),
  ADMIN: new Set(ADMIN_PERMISSIONS),
};

export function can(role: UserRole, permission: Permission): boolean {
  return PERMISSION_SETS[role].has(permission);
}

export function canAny(
  role: UserRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((p) => can(role, p));
}

/** Roles a user may never assign to themselves (§5). */
export const SELF_ASSIGNABLE_ROLES: readonly UserRole[] = [];

/** Human labels for dashboards. */
export const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  SHOP_OWNER: "Shop Owner",
  OPERATOR: "Operator",
  ADMIN: "Administrator",
};

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [PERMISSIONS.SHOP_CREATE]: "Submit a shop registration",
  [PERMISSIONS.SHOP_UPDATE_OWN]: "Edit own shop details",
  [PERMISSIONS.SHOP_UPDATE_ANY]: "Edit any shop's details",
  [PERMISSIONS.SHOP_APPROVE]: "Approve a pending shop",
  [PERMISSIONS.SHOP_REJECT]: "Reject a pending shop",
  [PERMISSIONS.SHOP_SUSPEND]: "Suspend an approved shop",
  [PERMISSIONS.SHOP_SET_CLASSIFICATION]: "Change Kesari/Green classification",
  [PERMISSIONS.CATEGORY_MANAGE]: "Create and edit product categories",
  [PERMISSIONS.PRODUCT_MANAGE]: "Create and edit catalogue products",
  [PERMISSIONS.SHOP_PRODUCT_MANAGE_OWN]: "Manage own shop's products",
  [PERMISSIONS.SHOP_PRODUCT_MANAGE_ANY]: "Manage any shop's products",
  [PERMISSIONS.ORDER_PLACE]: "Place an order",
  [PERMISSIONS.ORDER_VIEW_OWN]: "View own orders",
  [PERMISSIONS.ORDER_VIEW_SHOP]: "View orders for own shop",
  [PERMISSIONS.ORDER_VIEW_ANY]: "View all orders",
  [PERMISSIONS.ORDER_UPDATE_STATUS_SHOP]: "Advance own shop's order status",
  [PERMISSIONS.ORDER_UPDATE_STATUS_ANY]: "Advance any order's status",
  [PERMISSIONS.ORDER_CANCEL_OWN]: "Cancel own order",
  [PERMISSIONS.WALLET_VIEW_OWN]: "View own wallet",
  [PERMISSIONS.WALLET_TOPUP_OWN]: "Top up own wallet",
  [PERMISSIONS.WALLET_VIEW_ANY]: "View any wallet",
  [PERMISSIONS.WALLET_ADJUST]: "Manually credit or debit a wallet",
  [PERMISSIONS.WALLET_REFUND]: "Issue a refund to a wallet",
  [PERMISSIONS.SUBSCRIPTION_MANAGE_OWN]: "Manage own subscriptions",
  [PERMISSIONS.SUBSCRIPTION_VIEW_SHOP]: "View subscriptions for own shop",
  [PERMISSIONS.SUBSCRIPTION_MANAGE_ANY]: "Manage any subscription",
  [PERMISSIONS.USER_VIEW_ANY]: "View user records",
  [PERMISSIONS.USER_SET_ROLE]: "Change a user's role",
  [PERMISSIONS.USER_SUSPEND]: "Suspend a user",
  [PERMISSIONS.SYSTEM_CONFIG]: "Change system configuration",
  [PERMISSIONS.AUDIT_LOG_VIEW]: "View audit logs",
  [PERMISSIONS.REPORT_VIEW_SHOP]: "View own shop reports",
  [PERMISSIONS.REPORT_VIEW_OPERATIONAL]: "View operational reports",
  [PERMISSIONS.REPORT_VIEW_ALL]: "View all reports",
};
