/**
 * Database schema — Dairy & Bakery Marketplace.
 *
 * Conventions enforced across every table:
 *  - Money is ALWAYS integer paise (bigint). ₹70.00 → 7000. Never a float.
 *  - Quantity is ALWAYS integer milli-units (thousandths). 2 L → 2000, 0.5 L → 500.
 *  - Financial rows (wallet_transactions, order_items) are immutable once written.
 */
import { sql } from "drizzle-orm";
import { SHOP_TYPE_KEYS } from "@/lib/shop-types";
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

/**
 * A shop's primary business category — one of the 44 standard shop types
 * (grocery, dairy, bakery, pharmacy, jewellery, ...). Source of truth is
 * `src/lib/shop-types.ts`; add new types there, not here.
 */
export const shopTypeEnum = pgEnum("shop_type", SHOP_TYPE_KEYS);

/** Operator/Admin-controlled quality classification. Shop owners cannot change this. */
export const classificationEnum = pgEnum("shop_classification", [
  "KESARI",
  "GREEN",
]);

/**
 * Which shop type a product category belongs to. Reuses the same value set as
 * shopTypeEnum: a catalogue category is always scoped to one shop type (e.g.
 * "Milk" → DAIRY, "Rice" → GROCERY_KIRANA).
 */
export const departmentEnum = pgEnum("department", SHOP_TYPE_KEYS);

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

/* ------------------------------------- registration, fees & price approval */

/**
 * Lifecycle of a proposed price change. A request is only ever created for a
 * change that needs someone else's consent — an owner editing their own price
 * writes straight through and never lands here.
 */
export const priceRequestStatusEnum = pgEnum("price_request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  /** A newer request for the same product superseded this one before decision. */
  "SUPERSEDED",
  "CANCELLED",
]);

/** Who originated a price change, for audit and for the owner's review screen. */
export const priceRequestSourceEnum = pgEnum("price_request_source", [
  "SHOP_OWNER",
  "OPERATOR",
  "ADMIN",
]);

export const excelUploadTypeEnum = pgEnum("excel_upload_type", [
  "GOODS",
  "PRICES",
]);

/**
 * An upload is VALIDATED (parsed, previewed, nothing written) before it can be
 * APPLIED. This two-step is what stops a bad sheet corrupting live prices (§21).
 */
export const excelUploadStatusEnum = pgEnum("excel_upload_status", [
  "VALIDATED",
  "APPLIED",
  "CANCELLED",
  "FAILED",
]);

/** Per-row verdict from Excel validation. Only VALID/NO_CHANGE rows are applied. */
export const excelRowStatusEnum = pgEnum("excel_row_status", [
  "VALID",
  "NO_CHANGE",
  "INVALID_PRICE",
  "DUPLICATE",
  "NOT_FOUND",
  "MISSING_FIELD",
  /** GOODS upload only: no code/name match anywhere — a new product will be created. */
  "NEW_PRODUCT",
]);

/** Registration-fee settlement state for one shop (§4.2). */
export const feePaymentStatusEnum = pgEnum("fee_payment_status", [
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "REFUNDED",
  "CANCELLED",
]);

export const shopPaymentTypeEnum = pgEnum("shop_payment_type", [
  "REGISTRATION_FEE",
  "RENEWAL",
  "ADJUSTMENT",
  "REFUND",
  "REVERSAL",
]);

export const shopPaymentMethodEnum = pgEnum("shop_payment_method", [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "CARD",
  "CHEQUE",
  "RAZORPAY",
  "OTHER",
]);

export const referralStatusEnum = pgEnum("referral_status", [
  "ACTIVE",
  "INACTIVE",
  "EXPIRED",
]);

/**
 * Central-catalogue visibility for a product a SHOP_OWNER created (§ product
 * management brief). ACTIVE/INACTIVE already exist via `products.isActive` and
 * soft-delete, so this enum covers only the approval dimension — mirrors the
 * PENDING_APPROVAL/APPROVED/REJECTED vocabulary `shops.status` already uses.
 */
export const productApprovalStatusEnum = pgEnum("product_approval_status", [
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
]);

/**
 * Voucher lifecycle (§21). EXPIRED and BUDGET_EXHAUSTED are computed states —
 * nothing ever writes them directly except the redemption engine flipping
 * BUDGET_EXHAUSTED the moment a redemption exhausts the budget; expiry is
 * derived from `end_date` at read time so a voucher is never "deleted",
 * matching §21's "maintain historical records".
 */
export const voucherStatusEnum = pgEnum("voucher_status", [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "EXPIRED",
  "BUDGET_EXHAUSTED",
]);

export const voucherApplyModeEnum = pgEnum("voucher_apply_mode", [
  "CODE",
  "AUTO_APPLY",
]);

export const voucherRedemptionStatusEnum = pgEnum("voucher_redemption_status", [
  "PENDING",
  "APPLIED",
  "REVERSED",
  "REJECTED",
]);

export const voucherUploadStatusEnum = pgEnum("voucher_upload_status", [
  "VALIDATED",
  "APPLIED",
  "CANCELLED",
]);

export const voucherUploadRowStatusEnum = pgEnum("voucher_upload_row_status", [
  "VALID",
  "DUPLICATE_IN_FILE",
  "DUPLICATE_EXISTING",
  "INVALID",
]);

/**
 * Grievance redressal (Part 58 — Information Technology Rules 2021, Rule
 * 3(2): an intermediary must acknowledge a complaint within 24 hours and
 * dispose of it within 15 days). Deliberately a plain status ladder, not a
 * generic support-ticket system — this table's whole purpose is to be the
 * thing a Grievance Officer can point to as their compliance record.
 */
export const grievanceStatusEnum = pgEnum("grievance_status", [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

export const grievanceCategoryEnum = pgEnum("grievance_category", [
  "PAYMENT",
  "WALLET",
  "ORDER",
  "SUBSCRIPTION",
  "SELLER",
  "PRODUCT",
  "PRIVACY",
  "OTHER",
]);

/** What a user consented to, and to which version — the DPDPA-relevant trail. */
export const consentTypeEnum = pgEnum("consent_type", [
  "TERMS_AND_PRIVACY",
  "MARKETING_COMMUNICATIONS",
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

    /* --------------------------------------------- registration & fee (§4.1) */
    /**
     * Human-readable registration id shown to the owner, e.g. BKS-000123.
     * Allocated by a sequence so concurrent registrations cannot collide.
     */
    registrationNumber: text("registration_number")
      .notNull()
      .default(sql`'BKS-' || lpad(nextval('shop_registration_seq')::text, 6, '0')`),
    registrationDate: date("registration_date"),
    /**
     * SNAPSHOT of the fee that applied when this shop registered (§12).
     * Deliberately a copy, not a join: changing the current registration fee
     * must never rewrite what an existing shop was charged.
     */
    registrationFeePaise: bigint("registration_fee_paise", { mode: "number" }),
    /** Which fee row was in force at registration — provenance for the snapshot. */
    registrationFeeId: uuid("registration_fee_id"),
    referralCodeId: uuid("referral_code_id"),
    feePaymentStatus: feePaymentStatusEnum("fee_payment_status")
      .notNull()
      .default("PENDING"),
    /**
     * Running total of settled payments, maintained in the same transaction that
     * writes shop_payments — same pattern as wallets.balance_paise. Denormalised
     * so §13's "amount paid < registration fee" filter stays indexable.
     */
    amountPaidPaise: bigint("amount_paid_paise", { mode: "number" })
      .notNull()
      .default(0),

    /* ------------------------------- seller & compliance transparency (Part
     * 58: Consumer Protection (E-Commerce) Rules 2020 require the seller's
     * legal identity, not just a storefront display name, to be available to
     * a buyer before purchase. All nullable — not every shop is a registered
     * legal entity distinct from its owner, and only food-category shops need
     * an FSSAI number, so nothing here is force-collected at registration. */
    /** Registered legal/business name, if different from the storefront `name`. */
    legalBusinessName: text("legal_business_name"),
    /** GST Identification Number, where the seller is GST-registered. */
    gstin: text("gstin"),
    /** FSSAI licence/registration number — relevant for food-category shop types. */
    fssaiLicenseNumber: text("fssai_license_number"),
    /**
     * Shop-specific return/refund terms shown to buyers before purchase. Null
     * means the platform default (Refund & Cancellation Policy) applies.
     */
    returnPolicyText: text("return_policy_text"),

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
    uniqueIndex("shops_registration_number_unique").on(t.registrationNumber),
    index("shops_owner_idx").on(t.ownerId),
    index("shops_status_idx").on(t.status),
    index("shops_city_idx").on(t.city),
    index("shops_pincode_idx").on(t.pincode),
    index("shops_fee_status_idx").on(t.feePaymentStatus),
    index("shops_referral_idx").on(t.referralCodeId),
    check(
      "shops_delivery_fee_non_negative",
      sql`${t.deliveryFeePaise} >= 0`,
    ),
    check(
      "shops_registration_amounts_non_negative",
      sql`(${t.registrationFeePaise} IS NULL OR ${t.registrationFeePaise} >= 0)
          AND ${t.amountPaidPaise} >= 0`,
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
    /**
     * Stable human-readable SKU (P00001…). This — not the uuid — is what the
     * "Product ID" column of an uploaded sheet is matched against, so operators
     * can hand-edit spreadsheets without pasting uuids.
     *
     * Allocated by a database sequence so callers never have to supply one and
     * two concurrent inserts cannot collide.
     */
    code: text("code")
      .notNull()
      .default(sql`'P' || lpad(nextval('product_code_seq')::text, 5, '0')`),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    /** Structured spec sheet (bullet points), distinct from prose description. */
    specifications: text("specifications"),
    /** Freeform, optional — the schema has no subcategory table to join to. */
    subCategory: text("sub_category"),
    imageUrl: text("image_url"),
    /** Display unit: L, ml, kg, g, piece, pack. */
    unit: text("unit").notNull(),
    /** Size of one sellable unit in milli-units (1 L → 1000). */
    unitSizeMilli: integer("unit_size_milli").notNull().default(1000),
    /** Whether this product can be sold as a recurring daily subscription. */
    subscribable: boolean("subscribable").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    /**
     * Central-catalogue visibility. Defaults APPROVED so every seeded/reference
     * product behaves exactly as before. Only a product a SHOP_OWNER creates
     * themselves starts PENDING_APPROVAL — it is immediately usable in their own
     * shop via shop_products regardless of this value; this column only gates
     * whether OTHER shops can discover it through search/suggestions.
     */
    approvalStatus: productApprovalStatusEnum("approval_status")
      .notNull()
      .default("APPROVED"),
    /** Who created this product row. Null for seeded/reference catalogue rows. */
    createdBy: uuid("created_by").references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("products_slug_unique").on(t.slug),
    uniqueIndex("products_code_unique").on(t.code),
    index("products_category_idx").on(t.categoryId),
    index("products_approval_status_idx").on(t.approvalStatus),
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
    /**
     * The voucher code committed to at order-creation time (§19, §32) — read
     * back at verification rather than re-accepted from the client, so a
     * caller cannot swap in a better voucher after the price/amount was
     * already fixed. Null when no voucher was applied.
     */
    voucherCode: text("voucher_code"),
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
    /**
     * The promotional/voucher-funded SLICE of balancePaise — not a second
     * balance. balancePaise is always customer-funded + promotional; this
     * column exists so spending priority (§28, promotional-first) and refund
     * source-preservation (§29) can be computed without re-scanning the
     * ledger on every purchase. It is maintained atomically alongside
     * balancePaise inside the same wallet-mutation transaction, so the two
     * can never drift.
     */
    promotionalBalancePaise: bigint("promotional_balance_paise", {
      mode: "number",
    })
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
    check(
      "wallets_promotional_balance_bounded",
      sql`${t.promotionalBalancePaise} >= 0 AND ${t.promotionalBalancePaise} <= ${t.balancePaise}`,
    ),
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
    /**
     * Signed slice of `amountPaise` that moved the PROMOTIONAL balance (§27,
     * §28, §29). Zero for a plain TOP_UP. Equal to `amountPaise` for a
     * VOUCHER_BONUS credit. For a debit, the (negative) amount promotional
     * funds covered — read back on refund so the original customer-funded /
     * promotional split is restored rather than refunded as one lump sum.
     */
    promotionalAmountPaise: bigint("promotional_amount_paise", {
      mode: "number",
    })
      .notNull()
      .default(0),
    orderId: uuid("order_id").references(() => orders.id),
    subscriptionId: uuid("subscription_id"),
    paymentId: uuid("payment_id").references(() => payments.id),
    reversalOfId: uuid("reversal_of_id"),
    /**
     * voucher_redemptions.id — a plain uuid rather than .references() because
     * voucher_redemptions is declared later in this file (same rationale as
     * shops.registration_fee_id above); the FK constraint is added via raw
     * SQL in the migration once that table exists.
     */
    voucherRedemptionId: uuid("voucher_redemption_id"),
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
    // The promotional slice can never exceed, or point the opposite direction
    // from, the transaction it is a slice of.
    check(
      "wallet_txn_promotional_within_amount",
      sql`(${t.amountPaise} >= 0 AND ${t.promotionalAmountPaise} >= 0 AND ${t.promotionalAmountPaise} <= ${t.amountPaise})
          OR (${t.amountPaise} < 0 AND ${t.promotionalAmountPaise} <= 0 AND ${t.promotionalAmountPaise} >= ${t.amountPaise})`,
    ),
  ],
);

/* ---------------------------------------------------------- vouchers */

/**
 * A promotional top-up bonus rule (Part B of the wallet/voucher brief).
 *
 * A voucher never touches money the customer paid — it only ever describes
 * how big a PROMOTIONAL_CREDIT to add alongside a verified TOP_UP. The
 * percentage/limits here are advisory to the UI; the redemption engine
 * (services/vouchers.ts) recomputes everything server-side and never trusts a
 * client-supplied bonus amount (§32).
 */
export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Stored upper-cased; NULL when applyMode is AUTO_APPLY. */
    code: text("code"),
    description: text("description"),
    termsAndConditions: text("terms_and_conditions"),
    applyMode: voucherApplyModeEnum("apply_mode").notNull().default("CODE"),
    /** Basis points would overcomplicate this; whole/fractional percent as numeric. */
    bonusPercent: bigint("bonus_percent", { mode: "number" }).notNull(),
    minimumTopupPaise: bigint("minimum_topup_paise", { mode: "number" })
      .notNull()
      .default(0),
    maximumBonusPaise: bigint("maximum_bonus_paise", { mode: "number" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    /** NULL = unlimited. */
    usageLimit: integer("usage_limit"),
    perCustomerLimit: integer("per_customer_limit").notNull().default(1),
    /** NULL = unlimited promotional liability. */
    totalBudgetPaise: bigint("total_budget_paise", { mode: "number" }),
    /** Running total of bonus paise issued — maintained atomically with every redemption. */
    budgetUsedPaise: bigint("budget_used_paise", { mode: "number" })
      .notNull()
      .default(0),
    redemptionCount: integer("redemption_count").notNull().default(0),
    status: voucherStatusEnum("status").notNull().default("DRAFT"),
    /** Free-text scope hook for §26 (category/shop restriction) — unused by
     *  the engine in this first implementation, which applies vouchers to any
     *  eligible top-up per the brief's explicit "for the first implementation" scope. */
    applicableScope: text("applicable_scope"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("vouchers_code_unique").on(t.code),
    index("vouchers_status_idx").on(t.status),
    index("vouchers_dates_idx").on(t.startDate, t.endDate),
    // Upper bound is a sanity ceiling, not the "configured maximum" of §17 —
    // that is enforced (and can be tightened) in the service layer; this is
    // the backstop that makes a triple-zero typo impossible to persist.
    check(
      "vouchers_bonus_percent_range",
      sql`${t.bonusPercent} > 0 AND ${t.bonusPercent} <= 100`,
    ),
    check("vouchers_minimum_topup_non_negative", sql`${t.minimumTopupPaise} >= 0`),
    check(
      "vouchers_maximum_bonus_non_negative",
      sql`${t.maximumBonusPaise} IS NULL OR ${t.maximumBonusPaise} >= 0`,
    ),
    check("vouchers_dates_valid", sql`${t.endDate} >= ${t.startDate}`),
    check(
      "vouchers_usage_limit_positive",
      sql`${t.usageLimit} IS NULL OR ${t.usageLimit} > 0`,
    ),
    check("vouchers_per_customer_limit_positive", sql`${t.perCustomerLimit} > 0`),
    check(
      "vouchers_budget_non_negative",
      sql`(${t.totalBudgetPaise} IS NULL OR ${t.totalBudgetPaise} >= 0) AND ${t.budgetUsedPaise} >= 0`,
    ),
  ],
);

/**
 * One application of a voucher to one top-up (§24). This is the audit trail
 * AND the enforcement mechanism: the UNIQUE index on (voucher, customer) when
 * per_customer_limit = 1 — and more generally the row-count check under lock
 * in the redemption engine — is what makes "prevent duplicate use even under
 * concurrent requests" (§22) true rather than aspirational.
 */
export const voucherRedemptions = pgTable(
  "voucher_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    voucherId: uuid("voucher_id")
      .notNull()
      .references(() => vouchers.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "restrict" }),
    paymentId: uuid("payment_id").references(() => payments.id),
    topupAmountPaise: bigint("topup_amount_paise", { mode: "number" }).notNull(),
    bonusPercent: bigint("bonus_percent", { mode: "number" }).notNull(),
    bonusAmountPaise: bigint("bonus_amount_paise", { mode: "number" }).notNull(),
    status: voucherRedemptionStatusEnum("status").notNull().default("PENDING"),
    /**
     * Idempotency anchor: one redemption per payment. A retried/duplicate
     * verify call for the same payment can never double-apply the bonus.
     */
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("voucher_redemptions_idempotency_unique").on(t.idempotencyKey),
    index("voucher_redemptions_voucher_idx").on(t.voucherId),
    index("voucher_redemptions_user_idx").on(t.userId),
    check("voucher_redemptions_amounts_non_negative", sql`${t.topupAmountPaise} >= 0 AND ${t.bonusAmountPaise} >= 0`),
  ],
);

/** One uploaded voucher spreadsheet (§16), mirroring excel_uploads' two-phase shape. */
export const voucherUploads = pgTable(
  "voucher_uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    fileName: text("file_name").notNull(),
    status: voucherUploadStatusEnum("status").notNull().default("VALIDATED"),
    totalRecords: integer("total_records").notNull().default(0),
    successfulRecords: integer("successful_records").notNull().default(0),
    failedRecords: integer("failed_records").notNull().default(0),
    summary: jsonb("summary").$type<Record<string, unknown>>(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("voucher_uploads_uploader_idx").on(t.uploadedBy)],
);

export const voucherUploadItems = pgTable(
  "voucher_upload_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uploadId: uuid("upload_id")
      .notNull()
      .references(() => voucherUploads.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
    voucherName: text("voucher_name"),
    voucherCode: text("voucher_code"),
    status: voucherUploadRowStatusEnum("status").notNull(),
    errorMessage: text("error_message"),
    createdVoucherId: uuid("created_voucher_id").references(() => vouchers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("voucher_upload_items_row_unique").on(t.uploadId, t.rowNumber),
    index("voucher_upload_items_upload_idx").on(t.uploadId),
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

/* --------------------------------------------------- registration fees */

/**
 * The registration fee schedule (§12). Rows are append-only: changing the fee
 * inserts a new row and deactivates the previous one, so the amount in force on
 * any past date stays recoverable.
 */
export const registrationFees = pgTable(
  "registration_fees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("INR"),
    effectiveFrom: date("effective_from").notNull(),
    /** Exactly one row is active at a time; enforced by a partial unique index. */
    isActive: boolean("is_active").notNull().default(true),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("registration_fees_effective_idx").on(t.effectiveFrom),
    check("registration_fees_amount_non_negative", sql`${t.amountPaise} >= 0`),
  ],
);

/** Immutable trail of fee changes (§12). Never updated, never deleted. */
export const registrationFeeHistory = pgTable(
  "registration_fee_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationFeeId: uuid("registration_fee_id")
      .notNull()
      .references(() => registrationFees.id, { onDelete: "restrict" }),
    previousAmountPaise: bigint("previous_amount_paise", { mode: "number" }),
    newAmountPaise: bigint("new_amount_paise", { mode: "number" }).notNull(),
    effectiveFrom: date("effective_from").notNull(),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("registration_fee_history_created_idx").on(t.createdAt)],
);

/* -------------------------------------------------------- referral codes */

export const referralCodes = pgTable(
  "referral_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stored upper-cased; matching is case-insensitive at the service layer. */
    code: text("code").notNull(),
    label: text("label"),
    /** Optional: the person or partner the referral is credited to. */
    referrerName: text("referrer_name"),
    referrerUserId: uuid("referrer_user_id").references(() => users.id),
    status: referralStatusEnum("status").notNull().default("ACTIVE"),
    expiresAt: date("expires_at"),
    note: text("note"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("referral_codes_code_unique").on(t.code),
    index("referral_codes_status_idx").on(t.status),
  ],
);

/** One row per shop that registered under a referral code. */
export const referralRedemptions = pgTable(
  "referral_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referralCodeId: uuid("referral_code_id")
      .notNull()
      .references(() => referralCodes.id, { onDelete: "restrict" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    registrationFeePaise: bigint("registration_fee_paise", { mode: "number" }),
    redeemedBy: uuid("redeemed_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // A shop is attributed to at most one referral code.
    uniqueIndex("referral_redemptions_shop_unique").on(t.shopId),
    index("referral_redemptions_code_idx").on(t.referralCodeId),
  ],
);

/* --------------------------------------------------------- shop payments */

/**
 * Registration-fee and renewal payments (§3, §15). Immutable: a correction is a
 * new REVERSAL/REFUND row pointing at the original, never an UPDATE or DELETE —
 * the same discipline wallet_transactions uses.
 */
export const shopPayments = pgTable(
  "shop_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-readable receipt id shown to the owner, e.g. PAY-2026-000045. */
    reference: text("reference").notNull(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    paymentType: shopPaymentTypeEnum("payment_type").notNull(),
    /** Signed: positive for receipts, negative for refunds/reversals. */
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("INR"),
    method: shopPaymentMethodEnum("method").notNull().default("CASH"),
    /** Bank/UPI/gateway reference supplied by the operator. */
    transactionId: text("transaction_id"),
    /** The fee this payment was settling — snapshot for reconciliation. */
    feeSnapshotPaise: bigint("fee_snapshot_paise", { mode: "number" }),
    paidAt: timestamp("paid_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    note: text("note"),
    receiptUrl: text("receipt_url"),
    /** Set on a REVERSAL/REFUND row to point at the payment being corrected. */
    reversalOfId: uuid("reversal_of_id"),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("shop_payments_reference_unique").on(t.reference),
    index("shop_payments_shop_idx").on(t.shopId),
    index("shop_payments_owner_idx").on(t.ownerId),
    index("shop_payments_paid_idx").on(t.paidAt),
    check("shop_payments_amount_non_zero", sql`${t.amountPaise} <> 0`),
  ],
);

/* -------------------------------------------------- excel bulk uploads */

/**
 * One uploaded spreadsheet. Rows land in excel_upload_items first and nothing
 * touches live prices until the upload is explicitly applied (§8, §24).
 */
export const excelUploads = pgTable(
  "excel_uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    uploadType: excelUploadTypeEnum("upload_type").notNull().default("PRICES"),
    status: excelUploadStatusEnum("status").notNull().default("VALIDATED"),
    fileName: text("file_name").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull().default(0),
    totalRows: integer("total_rows").notNull().default(0),
    validRows: integer("valid_rows").notNull().default(0),
    invalidRows: integer("invalid_rows").notNull().default(0),
    unchangedRows: integer("unchanged_rows").notNull().default(0),
    duplicateRows: integer("duplicate_rows").notNull().default(0),
    notFoundRows: integer("not_found_rows").notNull().default(0),
    /** Counts and headline diffs, rendered on the preview screen. */
    summary: jsonb("summary").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("excel_uploads_shop_idx").on(t.shopId),
    index("excel_uploads_uploader_idx").on(t.uploadedBy),
    index("excel_uploads_created_idx").on(t.createdAt),
  ],
);

/** One parsed spreadsheet row, with its validation verdict. */
export const excelUploadItems = pgTable(
  "excel_upload_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uploadId: uuid("upload_id")
      .notNull()
      .references(() => excelUploads.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    /** Verbatim cell values, so an operator can see exactly what they sent. */
    rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
    productCode: text("product_code"),
    productName: text("product_name"),
    unit: text("unit"),
    parsedPricePaise: bigint("parsed_price_paise", { mode: "number" }),
    previousPricePaise: bigint("previous_price_paise", { mode: "number" }),
    matchedShopProductId: uuid("matched_shop_product_id").references(
      () => shopProducts.id,
      { onDelete: "set null" },
    ),
    /**
     * GOODS upload only: the row matched a product in the CENTRAL catalogue
     * that this shop does not yet carry — apply() attaches it via
     * createShopProduct rather than creating a new products row.
     */
    matchedProductId: uuid("matched_product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    /**
     * GOODS upload only: set when a NEW_PRODUCT row's name is close to an
     * existing product, so the preview can warn "this looks like X" without
     * blocking the row (§ "flag it for review").
     */
    possibleDuplicateProductId: uuid("possible_duplicate_product_id").references(
      () => products.id,
      { onDelete: "set null" },
    ),
    status: excelRowStatusEnum("status").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("excel_upload_items_row_unique").on(t.uploadId, t.rowNumber),
    index("excel_upload_items_upload_idx").on(t.uploadId),
  ],
);

/* ------------------------------------------------- price update workflow */

/**
 * A group of proposed price changes submitted together (§2.4, §7). Batching is
 * what makes "Approve all" / "Reject all" a single decision.
 */
export const priceUpdateBatches = pgTable(
  "price_update_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    source: priceRequestSourceEnum("source").notNull(),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id),
    excelUploadId: uuid("excel_upload_id").references(() => excelUploads.id, {
      onDelete: "set null",
    }),
    status: priceRequestStatusEnum("status").notNull().default("PENDING"),
    note: text("note"),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("price_update_batches_shop_idx").on(t.shopId),
    index("price_update_batches_status_idx").on(t.status),
  ],
);

/**
 * One proposed price for one channel of one shop product. The live price in
 * shop_products is untouched until this row reaches APPROVED (§10).
 */
export const priceUpdateRequests = pgTable(
  "price_update_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => priceUpdateBatches.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    shopProductId: uuid("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "cascade" }),
    priceType: text("price_type", { enum: ["ONLINE", "OFFLINE"] }).notNull(),
    previousPricePaise: bigint("previous_price_paise", { mode: "number" }),
    proposedPricePaise: bigint("proposed_price_paise", {
      mode: "number",
    }).notNull(),
    status: priceRequestStatusEnum("status").notNull().default("PENDING"),
    source: priceRequestSourceEnum("source").notNull(),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("price_update_requests_batch_idx").on(t.batchId),
    index("price_update_requests_shop_idx").on(t.shopId),
    index("price_update_requests_status_idx").on(t.status),
    index("price_update_requests_sp_idx").on(t.shopProductId),
    check(
      "price_update_requests_price_non_negative",
      sql`${t.proposedPricePaise} >= 0`,
    ),
  ],
);

/* -------------------------------------------------- grievance redressal */

/**
 * A complaint filed through the grievance mechanism required by IT Rules
 * 2021 Rule 3(2). Deliberately open to unauthenticated submitters
 * (`submittedByUserId` nullable, `email` always required) — a grievance
 * about being unable to sign in must not itself require signing in.
 */
export const grievances = pgTable(
  "grievances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-readable reference, e.g. GRV-000123 — what the complainant quotes back. */
    ticketNumber: text("ticket_number")
      .notNull()
      .default(sql`'GRV-' || lpad(nextval('grievance_ticket_seq')::text, 6, '0')`),
    submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    category: grievanceCategoryEnum("category").notNull().default("OTHER"),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: grievanceStatusEnum("status").notNull().default("OPEN"),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolutionNotes: text("resolution_notes"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("grievances_ticket_number_unique").on(t.ticketNumber),
    index("grievances_status_idx").on(t.status),
    index("grievances_email_idx").on(t.email),
    index("grievances_submitted_by_idx").on(t.submittedByUserId),
  ],
);

/** Append-only — a consent is never edited or deleted, only superseded by a newer row. */
export const userConsents = pgTable(
  "user_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    consentType: consentTypeEnum("consent_type").notNull(),
    /** The policy version consented to, e.g. "2026-08-21" — matches the policy page's "Last updated" date. */
    version: text("version").notNull(),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("user_consents_user_idx").on(t.userId),
    index("user_consents_type_idx").on(t.consentType),
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
export type Voucher = typeof vouchers.$inferSelect;
export type VoucherRedemption = typeof voucherRedemptions.$inferSelect;
export type VoucherUpload = typeof voucherUploads.$inferSelect;
export type VoucherUploadItem = typeof voucherUploadItems.$inferSelect;
export type VoucherStatus = (typeof voucherStatusEnum.enumValues)[number];
export type VoucherApplyMode = (typeof voucherApplyModeEnum.enumValues)[number];
export type VoucherRedemptionStatus =
  (typeof voucherRedemptionStatusEnum.enumValues)[number];
export type Grievance = typeof grievances.$inferSelect;
export type GrievanceStatus = (typeof grievanceStatusEnum.enumValues)[number];
export type GrievanceCategory = (typeof grievanceCategoryEnum.enumValues)[number];
export type UserConsent = typeof userConsents.$inferSelect;
export type ConsentType = (typeof consentTypeEnum.enumValues)[number];
export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionDailyOverride =
  typeof subscriptionDailyOverrides.$inferSelect;
export type SubscriptionOrder = typeof subscriptionOrders.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type RegistrationFee = typeof registrationFees.$inferSelect;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type ShopPayment = typeof shopPayments.$inferSelect;
export type ExcelUpload = typeof excelUploads.$inferSelect;
export type ExcelUploadItem = typeof excelUploadItems.$inferSelect;
export type PriceUpdateBatch = typeof priceUpdateBatches.$inferSelect;
export type PriceUpdateRequest = typeof priceUpdateRequests.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type PriceRequestStatus =
  (typeof priceRequestStatusEnum.enumValues)[number];
export type PriceRequestSource =
  (typeof priceRequestSourceEnum.enumValues)[number];
export type FeePaymentStatus = (typeof feePaymentStatusEnum.enumValues)[number];
export type ShopPaymentType = (typeof shopPaymentTypeEnum.enumValues)[number];
export type ShopPaymentMethod =
  (typeof shopPaymentMethodEnum.enumValues)[number];
export type ExcelRowStatus = (typeof excelRowStatusEnum.enumValues)[number];
export type ExcelUploadType = (typeof excelUploadTypeEnum.enumValues)[number];
export type ReferralStatus = (typeof referralStatusEnum.enumValues)[number];
export type ProductApprovalStatus =
  (typeof productApprovalStatusEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type ShopStatus = (typeof shopStatusEnum.enumValues)[number];
export type Classification = (typeof classificationEnum.enumValues)[number];
export type Department = (typeof departmentEnum.enumValues)[number];
