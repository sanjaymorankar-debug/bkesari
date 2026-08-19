/**
 * Database schema — Dairy & Bakery Marketplace.
 *
 * Conventions enforced across every table:
 *  - Money is ALWAYS integer paise (bigint). ₹70.00 → 7000. Never a float.
 *  - Quantity is ALWAYS integer milli-units (thousandths). 2 L → 2000, 0.5 L → 500.
 *  - Financial rows (wallet_transactions, order_items) are immutable once written.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */

export const userRoleEnum = pgEnum("user_role", [
  "CUSTOMER",
  "SHOP_OWNER",
  "OPERATOR",
  "ADMIN",
]);

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "SUSPENDED",
  "DELETED",
]);

export const shopStatusEnum = pgEnum("shop_status", [
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "INACTIVE",
]);

/** A shop sells dairy, bakery, or both. */
export const shopTypeEnum = pgEnum("shop_type", ["DAIRY", "BAKERY", "BOTH"]);

/** Operator/Admin-controlled quality classification. Shop owners cannot change this. */
export const classificationEnum = pgEnum("shop_classification", [
  "KESARI",
  "GREEN",
]);

/** Top-level department a category belongs to. */
export const departmentEnum = pgEnum("department", ["DAIRY", "BAKERY"]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "PAYMENT_FAILED",
  "WALLET_INSUFFICIENT",
  "REFUND_PENDING",
  "REFUNDED",
]);

export const orderSourceEnum = pgEnum("order_source", [
  "DIRECT",
  "SUBSCRIPTION",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "CREATED",
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
]);

export const walletTxnTypeEnum = pgEnum("wallet_txn_type", [
  "TOP_UP",
  "PRODUCT_PURCHASE",
  "SUBSCRIPTION_DEDUCTION",
  "REFUND",
  "PROMOTIONAL_CREDIT",
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "REVERSAL",
]);

export const walletTxnStatusEnum = pgEnum("wallet_txn_status", [
  "COMPLETED",
  "REVERSED",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "PAUSED",
  "CANCELLED",
  "COMPLETED",
  "PAYMENT_PENDING",
]);

export const subscriptionFrequencyEnum = pgEnum("subscription_frequency", [
  "DAILY",
  "WEEKLY",
]);

/** A per-date deviation from the standing subscription quantity. */
export const overrideTypeEnum = pgEnum("override_type", ["QUANTITY", "SKIP"]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "IN_APP",
  "EMAIL",
  "SMS",
  "PUSH",
]);

/* ------------------------------------------------- auth (Auth.js managed) */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    phone: text("phone"),
    // Role is server-owned. It is never read from a request body.
    role: userRoleEnum("role").notNull().default("CUSTOMER"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_idx").on(t.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* -------------------------------------------------- roles & permissions */
/**
 * The capability matrix lives in code (authz/permissions.ts) for fast, typed checks.
 * These tables mirror it so permissions are inspectable/reportable from the database
 * and so future per-user grants can be layered on without a schema change.
 */

export const roles = pgTable("roles", {
  key: userRoleEnum("key").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
});

export const permissions = pgTable("permissions", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleKey: userRoleEnum("role_key")
      .notNull()
      .references(() => roles.key, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleKey, t.permissionKey] })],
);

/* ------------------------------------------------------------ addresses */

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    area: text("area"),
    city: text("city").notNull(),
    state: text("state"),
    pincode: text("pincode").notNull(),
    latitude: text("latitude"),
    longitude: text("longitude"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("addresses_user_idx").on(t.userId),
    index("addresses_pincode_idx").on(t.pincode),
  ],
);

/* ---------------------------------------------------------------- shops */

export const shops = pgTable(
  "shops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ownerName: text("owner_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    area: text("area"),
    city: text("city").notNull(),
    state: text("state"),
    pincode: text("pincode").notNull(),
    latitude: text("latitude"),
    longitude: text("longitude"),
    shopType: shopTypeEnum("shop_type").notNull(),
    status: shopStatusEnum("status").notNull().default("PENDING_APPROVAL"),
    // Only OPERATOR/ADMIN may write this column (enforced in the service layer).
    classification: classificationEnum("classification"),
    logoUrl: text("logo_url"),
    photos: jsonb("photos").$type<string[]>().notNull().default([]),
    /** [{ day: 0-6, open: "06:00", close: "22:00", closed?: boolean }] */
    openingHours: jsonb("opening_hours")
      .$type<
        { day: number; open: string; close: string; closed?: boolean }[]
      >()
      .notNull()
      .default([]),
    deliveryAvailable: boolean("delivery_available").notNull().default(false),
    deliveryFeePaise: bigint("delivery_fee_paise", { mode: "number" })
      .notNull()
      .default(0),
    /** Orders below this value incur the delivery fee; at/above it delivery is free. */
    freeDeliveryAbovePaise: bigint("free_delivery_above_paise", {
      mode: "number",
    }),
    description: text("description"),
    rejectionReason: text("rejection_reason"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("shops_slug_unique").on(t.slug),
    index("shops_owner_idx").on(t.ownerId),
    index("shops_status_idx").on(t.status),
    index("shops_city_idx").on(t.city),
    index("shops_pincode_idx").on(t.pincode),
    check(
      "shops_delivery_fee_non_negative",
      sql`${t.deliveryFeePaise} >= 0`,
    ),
  ],
);

/** Immutable audit trail of Kesari/Green changes (requirement §10). */
export const shopClassificationHistory = pgTable(
  "shop_classification_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    previousValue: classificationEnum("previous_value"),
    newValue: classificationEnum("new_value").notNull(),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("shop_class_hist_shop_idx").on(t.shopId)],
);

/* ---------------------------------------------------- catalogue (master) */

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    department: departmentEnum("department").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("product_categories_slug_unique").on(t.slug),
    index("product_categories_dept_idx").on(t.department),
  ],
);

/**
 * Master catalogue entry (e.g. "Cow Milk 1 L"). Shops attach to these via
 * shop_products, so the same product is comparable across shops.
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    /** Display unit: L, ml, kg, g, piece, pack. */
    unit: text("unit").notNull(),
    /** Size of one sellable unit in milli-units (1 L → 1000). */
    unitSizeMilli: integer("unit_size_milli").notNull().default(1000),
    /** Whether this product can be sold as a recurring daily subscription. */
    subscribable: boolean("subscribable").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("products_slug_unique").on(t.slug),
    index("products_category_idx").on(t.categoryId),
  ],
);

/**
 * A shop's offering of a master product: independent online/offline
 * availability, pricing and stock (requirements §11–§14).
 */
export const shopProducts = pgTable(
  "shop_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    description: text("description"),
    imageUrl: text("image_url"),
    onlinePricePaise: bigint("online_price_paise", { mode: "number" }),
    offlinePricePaise: bigint("offline_price_paise", { mode: "number" }),
    // Both channels default OFF: a shop must explicitly enable each one and
    // supply its price, so a product is never accidentally sellable.
    onlineSaleEnabled: boolean("online_sale_enabled").notNull().default(false),
    offlineSaleEnabled: boolean("offline_sale_enabled")
      .notNull()
      .default(false),
    trackInventory: boolean("track_inventory").notNull().default(true),
    onlineStock: integer("online_stock").notNull().default(0),
    offlineStock: integer("offline_stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    /** Temporary availability toggle (e.g. sold out today) distinct from isActive. */
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("shop_products_shop_product_unique").on(t.shopId, t.productId),
    index("shop_products_shop_idx").on(t.shopId),
    index("shop_products_product_idx").on(t.productId),
    // §13: selling online without a price is structurally impossible.
    check(
      "shop_products_online_requires_price",
      sql`(${t.onlineSaleEnabled} = false) OR (${t.onlinePricePaise} IS NOT NULL)`,
    ),
    check(
      "shop_products_offline_requires_price",
      sql`(${t.offlineSaleEnabled} = false) OR (${t.offlinePricePaise} IS NOT NULL)`,
    ),
    check(
      "shop_products_prices_non_negative",
      sql`(${t.onlinePricePaise} IS NULL OR ${t.onlinePricePaise} >= 0)
          AND (${t.offlinePricePaise} IS NULL OR ${t.offlinePricePaise} >= 0)`,
    ),
    check(
      "shop_products_stock_non_negative",
      sql`${t.onlineStock} >= 0 AND ${t.offlineStock} >= 0`,
    ),
  ],
);

/** Immutable price-change trail (§13). */
export const productPriceHistory = pgTable(
  "product_price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopProductId: uuid("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "cascade" }),
    priceType: text("price_type", { enum: ["ONLINE", "OFFLINE"] }).notNull(),
    previousPricePaise: bigint("previous_price_paise", { mode: "number" }),
    newPricePaise: bigint("new_price_paise", { mode: "number" }).notNull(),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("price_history_shop_product_idx").on(t.shopProductId)],
);

/** Append-only stock ledger; shop_products holds the running balance. */
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopProductId: uuid("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: ["ONLINE", "OFFLINE"] }).notNull(),
    /** Negative for consumption, positive for restock. */
    deltaUnits: integer("delta_units").notNull(),
    previousUnits: integer("previous_units").notNull(),
    newUnits: integer("new_units").notNull(),
    reason: text("reason").notNull(),
    orderId: uuid("order_id"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("inventory_movements_sp_idx").on(t.shopProductId)],
);

/* ----------------------------------------------------------------- cart */

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("carts_user_unique").on(t.userId)],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    shopProductId: uuid("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "cascade" }),
    /** Number of sellable units (not milli-units) — carts sell whole units. */
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("cart_items_cart_product_unique").on(t.cartId, t.shopProductId),
    index("cart_items_cart_idx").on(t.cartId),
    check("cart_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

/* --------------------------------------------------------------- orders */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    addressId: uuid("address_id").references(() => addresses.id),
    /** Address is snapshotted so later edits never rewrite delivery history. */
    deliveryAddressSnapshot: jsonb("delivery_address_snapshot").$type<{
      line1: string;
      line2?: string | null;
      area?: string | null;
      city: string;
      pincode: string;
    } | null>(),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    source: orderSourceEnum("source").notNull().default("DIRECT"),
    subtotalPaise: bigint("subtotal_paise", { mode: "number" }).notNull(),
    deliveryFeePaise: bigint("delivery_fee_paise", { mode: "number" })
      .notNull()
      .default(0),
    taxPaise: bigint("tax_paise", { mode: "number" }).notNull().default(0),
    totalPaise: bigint("total_paise", { mode: "number" }).notNull(),
    /** Set once the wallet deduction has actually completed. */
    paidAt: timestamp("paid_at", { withTimezone: true }),
    deliveryDate: date("delivery_date"),
    notes: text("notes"),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_number_unique").on(t.orderNumber),
    index("orders_user_idx").on(t.userId),
    index("orders_shop_idx").on(t.shopId),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    check(
      "orders_totals_non_negative",
      sql`${t.subtotalPaise} >= 0 AND ${t.totalPaise} >= 0`,
    ),
  ],
);

/**
 * Immutable line items. Price and product name are snapshotted at order time so a
 * later price change can never rewrite the value of a completed order (§13, §34).
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    shopProductId: uuid("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "restrict" }),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    unitSnapshot: text("unit_snapshot").notNull(),
    unitPricePaise: bigint("unit_price_paise", { mode: "number" }).notNull(),
    /** Milli-units, so 2.5 L is exactly 2500. */
    quantityMilli: integer("quantity_milli").notNull(),
    lineTotalPaise: bigint("line_total_paise", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_quantity_positive", sql`${t.quantityMilli} > 0`),
    check(
      "order_items_amounts_non_negative",
      sql`${t.unitPricePaise} >= 0 AND ${t.lineTotalPaise} >= 0`,
    ),
  ],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    previousStatus: orderStatusEnum("previous_status"),
    newStatus: orderStatusEnum("new_status").notNull(),
    changedBy: uuid("changed_by").references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)],
);

/* ------------------------------------------------------------- payments */

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    gateway: text("gateway").notNull().default("RAZORPAY"),
    /** Razorpay order id — unique so one intent cannot be created twice. */
    gatewayOrderId: text("gateway_order_id").notNull(),
    /** Razorpay payment id — UNIQUE, which is what blocks replayed callbacks. */
    gatewayPaymentId: text("gateway_payment_id"),
    gatewaySignature: text("gateway_signature"),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("INR"),
    status: paymentStatusEnum("status").notNull().default("CREATED"),
    purpose: text("purpose", { enum: ["WALLET_TOPUP"] })
      .notNull()
      .default("WALLET_TOPUP"),
    failureReason: text("failure_reason"),
    rawPayload: jsonb("raw_payload"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("payments_gateway_order_unique").on(t.gatewayOrderId),
    uniqueIndex("payments_gateway_payment_unique").on(t.gatewayPaymentId),
    index("payments_user_idx").on(t.userId),
    check("payments_amount_positive", sql`${t.amountPaise} > 0`),
  ],
);

/* --------------------------------------------------------------- wallet */

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    balancePaise: bigint("balance_paise", { mode: "number" })
      .notNull()
      .default(0),
    currency: text("currency").notNull().default("INR"),
    lowBalanceThresholdPaise: bigint("low_balance_threshold_paise", {
      mode: "number",
    })
      .notNull()
      .default(50000), // ₹500
    autoRechargeEnabled: boolean("auto_recharge_enabled")
      .notNull()
      .default(false),
    autoRechargeTriggerPaise: bigint("auto_recharge_trigger_paise", {
      mode: "number",
    }),
    autoRechargeAmountPaise: bigint("auto_recharge_amount_paise", {
      mode: "number",
    }),
    status: text("status", { enum: ["ACTIVE", "FROZEN"] })
      .notNull()
      .default("ACTIVE"),
    lowBalanceNotifiedAt: timestamp("low_balance_notified_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("wallets_user_unique").on(t.userId),
    // Last line of defence: a negative balance cannot be persisted, ever.
    check("wallets_balance_non_negative", sql`${t.balancePaise} >= 0`),
  ],
);

/**
 * Immutable ledger. Never UPDATE or DELETE a row here — corrections are written
 * as a new REVERSAL entry.
 */
export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: walletTxnTypeEnum("type").notNull(),
    status: walletTxnStatusEnum("status").notNull().default("COMPLETED"),
    /** Signed: positive credits, negative debits. */
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    previousBalancePaise: bigint("previous_balance_paise", {
      mode: "number",
    }).notNull(),
    newBalancePaise: bigint("new_balance_paise", { mode: "number" }).notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    subscriptionId: uuid("subscription_id"),
    paymentId: uuid("payment_id").references(() => payments.id),
    reversalOfId: uuid("reversal_of_id"),
    /**
     * UNIQUE. This single index is what makes every wallet mutation safely
     * retryable: a duplicate attempt collides here instead of double-charging.
     */
    idempotencyKey: text("idempotency_key").notNull(),
    description: text("description").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("wallet_txn_idempotency_unique").on(t.idempotencyKey),
    index("wallet_txn_wallet_idx").on(t.walletId),
    index("wallet_txn_user_idx").on(t.userId),
    index("wallet_txn_created_idx").on(t.createdAt),
    check("wallet_txn_amount_non_zero", sql`${t.amountPaise} <> 0`),
    check(
      "wallet_txn_balances_non_negative",
      sql`${t.previousBalancePaise} >= 0 AND ${t.newBalancePaise} >= 0`,
    ),
    // The ledger must be arithmetically self-consistent.
    check(
      "wallet_txn_arithmetic",
      sql`${t.newBalancePaise} = ${t.previousBalancePaise} + ${t.amountPaise}`,
    ),
  ],
);

/* --------------------------------------------------------- subscriptions */

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    shopProductId: uuid("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "restrict" }),
    addressId: uuid("address_id").references(() => addresses.id),
    /** Standing quantity per delivery, in milli-units (2 L/day → 2000). */
    quantityMilli: integer("quantity_milli").notNull(),
    frequency: subscriptionFrequencyEnum("frequency").notNull().default("DAILY"),
    /** For WEEKLY: ISO weekdays 1-7 the delivery occurs on. */
    weekdays: jsonb("weekdays").$type<number[]>().notNull().default([]),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    nextDeliveryDate: date("next_delivery_date"),
    status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
    pauseFrom: date("pause_from"),
    pauseUntil: date("pause_until"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("subscriptions_user_idx").on(t.userId),
    index("subscriptions_shop_idx").on(t.shopId),
    index("subscriptions_status_idx").on(t.status),
    index("subscriptions_next_delivery_idx").on(t.nextDeliveryDate),
    check("subscriptions_quantity_positive", sql`${t.quantityMilli} > 0`),
    check(
      "subscriptions_pause_window_valid",
      sql`(${t.pauseFrom} IS NULL AND ${t.pauseUntil} IS NULL)
          OR (${t.pauseFrom} IS NOT NULL AND ${t.pauseUntil} IS NOT NULL AND ${t.pauseUntil} >= ${t.pauseFrom})`,
    ),
  ],
);

/**
 * Per-date deviation (§28–§30). Because a row is scoped to exactly one date, the
 * schedule reverts to the standing quantity automatically the following day.
 */
export const subscriptionDailyOverrides = pgTable(
  "subscription_daily_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    deliveryDate: date("delivery_date").notNull(),
    type: overrideTypeEnum("type").notNull(),
    /** NULL when type = SKIP. */
    quantityMilli: integer("quantity_milli"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("sub_override_sub_date_unique").on(
      t.subscriptionId,
      t.deliveryDate,
    ),
    check(
      "sub_override_quantity_matches_type",
      sql`(${t.type} = 'SKIP' AND ${t.quantityMilli} IS NULL)
          OR (${t.type} = 'QUANTITY' AND ${t.quantityMilli} IS NOT NULL AND ${t.quantityMilli} > 0)`,
    ),
  ],
);

/**
 * One materialised delivery for one date. The UNIQUE(subscription_id, delivery_date)
 * index is the mechanism that makes the daily generation job idempotent (§33).
 */
export const subscriptionOrders = pgTable(
  "subscription_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id),
    deliveryDate: date("delivery_date").notNull(),
    quantityMilli: integer("quantity_milli").notNull(),
    unitPricePaise: bigint("unit_price_paise", { mode: "number" }).notNull(),
    totalPaise: bigint("total_paise", { mode: "number" }).notNull(),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    failureReason: text("failure_reason"),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Running the daily job twice cannot create a second delivery for a date.
    uniqueIndex("subscription_orders_sub_date_unique").on(
      t.subscriptionId,
      t.deliveryDate,
    ),
    index("subscription_orders_date_idx").on(t.deliveryDate),
    index("subscription_orders_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------- notifications */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    channel: notificationChannelEnum("channel").notNull().default("IN_APP"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** Deep link into the app, e.g. /wallet or /subscriptions/:id. */
    actionUrl: text("action_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    readAt: timestamp("read_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    /** Set for notifications that must not repeat (e.g. one low-balance alert). */
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_read_idx").on(t.userId, t.readAt),
    uniqueIndex("notifications_dedupe_unique").on(t.dedupeKey),
  ],
);

/* ----------------------------------------------------------- audit logs */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id),
    actorRole: userRoleEnum("actor_role"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_actor_idx").on(t.actorId),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------ inference */

export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ShopProduct = typeof shopProducts.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionDailyOverride =
  typeof subscriptionDailyOverrides.$inferSelect;
export type SubscriptionOrder = typeof subscriptionOrders.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type ShopStatus = (typeof shopStatusEnum.enumValues)[number];
export type Classification = (typeof classificationEnum.enumValues)[number];
export type Department = (typeof departmentEnum.enumValues)[number];
