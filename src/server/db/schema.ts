/**
 * Database schema — Your Neighbourhood, Now Online.
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
  foreignKey,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * MySQL has no native UUID type and no `gen_random_uuid()`. IDs stay the same
 * canonical 36-character UUID strings they were on Postgres, generated in the
 * application at insert time so that no MySQL/MariaDB version-specific default
 * expression is relied on.
 */
const uuidCol = (name: string) => varchar(name, { length: 36 });

/**
 * Postgres named enum types (`CREATE TYPE ... AS ENUM`) have no MySQL
 * equivalent — MySQL spells the value list inline on every column. This helper
 * keeps the `pgEnum` call shape, so both the table definitions below
 * (`userRoleEnum("role")`) and the `.enumValues` reads in app code and in the
 * exported row types stay exactly as they were.
 */
function mysqlEnumType<const T extends readonly [string, ...string[]]>(
  values: T,
) {
  return Object.assign((name: string) => mysqlEnum(name, values), {
    enumValues: values,
  });
}

/* ------------------------------------------------------------------ enums */

export const userRoleEnum = mysqlEnumType([
  "CUSTOMER",
  "SHOP_OWNER",
  "OPERATOR",
  "ADMIN",
  "DELIVERY_PARTNER",
]);

export const userStatusEnum = mysqlEnumType([
  "ACTIVE",
  "SUSPENDED",
  "DELETED",
]);

export const shopStatusEnum = mysqlEnumType([
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
export const shopTypeEnum = mysqlEnumType(SHOP_TYPE_KEYS);

/** Operator/Admin-controlled quality classification. Shop owners cannot change this. */
export const classificationEnum = mysqlEnumType([
  "KESARI",
  "GREEN",
]);

/**
 * GST registration status (marketplace GST-readiness follow-up). Not every
 * shop is GST-registered, and GST registration itself is never assumed or
 * invented — a shop starts UNKNOWN until the owner actively says one way or
 * the other. PENDING_VERIFICATION means a GSTIN was submitted but no
 * verification provider is configured yet, so an admin confirms it by hand
 * (see gst-pan-verification.ts) — this is never silently treated as
 * REGISTERED.
 */
export const gstStatusEnum = mysqlEnumType([
  "UNKNOWN",
  "NOT_REGISTERED",
  "PENDING_VERIFICATION",
  "REGISTERED",
  "COMPOSITION",
  "VERIFICATION_FAILED",
]);

/** Mirrors gstStatusEnum's verification states for PAN — a separate credential, verified independently. */
export const panStatusEnum = mysqlEnumType([
  "UNKNOWN",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "VERIFICATION_FAILED",
]);

/** Provenance for a GST/PAN status — same shape as shops.locationSource, for the same audit reason. */
export const identityVerificationSourceEnum = mysqlEnumType([
  "PROVIDER_VERIFIED",
  "SELF_DECLARED",
  "ADMIN_VERIFIED",
]);

/**
 * Which shop type a product category belongs to. Reuses the same value set as
 * shopTypeEnum: a catalogue category is always scoped to one shop type (e.g.
 * "Milk" → DAIRY, "Rice" → GROCERY_KIRANA).
 */
export const departmentEnum = mysqlEnumType(SHOP_TYPE_KEYS);

export const orderStatusEnum = mysqlEnumType([
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

export const orderSourceEnum = mysqlEnumType([
  "DIRECT",
  "SUBSCRIPTION",
]);

/* -------------------------------------------------------- delivery windows
 * (delivery-system Part 58 follow-up, Slice C). Fixed set for Phase 1 per
 * the brief ("initially support 30/60/scheduled") — true admin-defined
 * custom windows are Phase 2/3. Nullable on `orders`: existing orders and
 * any checkout that doesn't pick a window are unaffected. */
export const deliveryWindowEnum = mysqlEnumType([
  "EXPRESS_30",
  "STANDARD_60",
  "SCHEDULED",
]);

export const paymentStatusEnum = mysqlEnumType([
  "CREATED",
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
]);

export const walletTxnTypeEnum = mysqlEnumType([
  "TOP_UP",
  "PRODUCT_PURCHASE",
  "SUBSCRIPTION_DEDUCTION",
  "REFUND",
  "PROMOTIONAL_CREDIT",
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "REVERSAL",
]);

export const walletTxnStatusEnum = mysqlEnumType([
  "COMPLETED",
  "REVERSED",
]);

export const subscriptionStatusEnum = mysqlEnumType([
  "ACTIVE",
  "PAUSED",
  "CANCELLED",
  "COMPLETED",
  "PAYMENT_PENDING",
]);

export const subscriptionFrequencyEnum = mysqlEnumType([
  "DAILY",
  "WEEKLY",
]);

/** A per-date deviation from the standing subscription quantity. */
export const overrideTypeEnum = mysqlEnumType(["QUANTITY", "SKIP"]);

export const notificationChannelEnum = mysqlEnumType([
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
export const priceRequestStatusEnum = mysqlEnumType([
  "PENDING",
  "APPROVED",
  "REJECTED",
  /** A newer request for the same product superseded this one before decision. */
  "SUPERSEDED",
  "CANCELLED",
]);

/** Who originated a price change, for audit and for the owner's review screen. */
export const priceRequestSourceEnum = mysqlEnumType([
  "SHOP_OWNER",
  "OPERATOR",
  "ADMIN",
]);

export const excelUploadTypeEnum = mysqlEnumType([
  "GOODS",
  "PRICES",
]);

/**
 * An upload is VALIDATED (parsed, previewed, nothing written) before it can be
 * APPLIED. This two-step is what stops a bad sheet corrupting live prices (§21).
 */
export const excelUploadStatusEnum = mysqlEnumType([
  "VALIDATED",
  "APPLIED",
  "CANCELLED",
  "FAILED",
]);

/** Per-row verdict from Excel validation. Only VALID/NO_CHANGE rows are applied. */
export const excelRowStatusEnum = mysqlEnumType([
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
export const feePaymentStatusEnum = mysqlEnumType([
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "REFUNDED",
  "CANCELLED",
]);

export const shopPaymentTypeEnum = mysqlEnumType([
  "REGISTRATION_FEE",
  "RENEWAL",
  "ADJUSTMENT",
  "REFUND",
  "REVERSAL",
]);

export const shopPaymentMethodEnum = mysqlEnumType([
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "CARD",
  "CHEQUE",
  "RAZORPAY",
  "OTHER",
]);

export const referralStatusEnum = mysqlEnumType([
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
export const productApprovalStatusEnum = mysqlEnumType([
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
export const voucherStatusEnum = mysqlEnumType([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "EXPIRED",
  "BUDGET_EXHAUSTED",
]);

export const voucherApplyModeEnum = mysqlEnumType([
  "CODE",
  "AUTO_APPLY",
]);

export const voucherRedemptionStatusEnum = mysqlEnumType([
  "PENDING",
  "APPLIED",
  "REVERSED",
  "REJECTED",
]);

export const voucherUploadStatusEnum = mysqlEnumType([
  "VALIDATED",
  "APPLIED",
  "CANCELLED",
]);

export const voucherUploadRowStatusEnum = mysqlEnumType([
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
export const grievanceStatusEnum = mysqlEnumType([
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

export const grievanceCategoryEnum = mysqlEnumType([
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
export const consentTypeEnum = mysqlEnumType([
  "TERMS_AND_PRIVACY",
  "MARKETING_COMMUNICATIONS",
]);

/* ------------------------------------------------- auth (Auth.js managed) */

/* --------------------------------------------------------------- sequences */

/**
 * Postgres allocated the human-readable references below (`BKS-000123`,
 * `P00042`, `GRV-000123`) from `CREATE SEQUENCE` objects, wired up as column
 * defaults. MySQL has neither sequences nor non-deterministic column defaults,
 * so each counter becomes a one-column AUTO_INCREMENT table: inserting a row
 * reserves the next number and hands it straight back as `insertId`. That is
 * atomic without a transaction and never reuses a value — the two properties
 * the sequences provided. See `nextSequenceValue` in ./sequences.ts.
 */
export const shopRegistrationSeq = mysqlTable("shop_registration_seq", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
});

export const productCodeSeq = mysqlTable("product_code_seq", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
});

export const grievanceTicketSeq = mysqlTable("grievance_ticket_seq", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
});

export const users = mysqlTable(
  "users",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: timestamp("email_verified", { fsp: 3 }),
    image: text("image"),
    phone: text("phone"),
    // Role is server-owned. It is never read from a request body.
    role: userRoleEnum("role").notNull().default("CUSTOMER"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { fsp: 3 }),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const accounts = mysqlTable(
  "accounts",
  {
    userId: uuidCol("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: int("expires_at"),
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

export const sessions = mysqlTable(
  "sessions",
  {
    sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
    userId: uuidCol("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { fsp: 3 }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const verificationTokens = mysqlTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { fsp: 3 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* -------------------------------------------------- roles & permissions */
/**
 * The capability matrix lives in code (authz/permissions.ts) for fast, typed checks.
 * These tables mirror it so permissions are inspectable/reportable from the database
 * and so future per-user grants can be layered on without a schema change.
 */

export const roles = mysqlTable("roles", {
  key: userRoleEnum("key").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
});

export const permissions = mysqlTable("permissions", {
  key: varchar("key", { length: 128 }).primaryKey(),
  description: text("description").notNull(),
});

export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    roleKey: userRoleEnum("role_key")
      .notNull()
      .references(() => roles.key, { onDelete: "cascade" }),
    permissionKey: varchar("permission_key", { length: 128 })
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleKey, t.permissionKey] })],
);

/* ------------------------------------------------------------ addresses */

export const addresses = mysqlTable(
  "addresses",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuidCol("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    area: text("area"),
    city: varchar("city", { length: 160 }).notNull(),
    state: text("state"),
    pincode: varchar("pincode", { length: 12 }).notNull(),
    latitude: text("latitude"),
    longitude: text("longitude"),
    landmark: text("landmark"),
    deliveryInstructions: text("delivery_instructions"),
    isDefault: boolean("is_default").notNull().default(false),
    /** Same provenance/verification pattern as shops — see schema.ts's shops table comment. */
    locationVerified: boolean("location_verified").notNull().default(false),
    locationVerifiedAt: timestamp("location_verified_at", { fsp: 3 }),
    locationSource: text("location_source", {
      enum: ["GOOGLE_VERIFIED", "MANUAL_ENTRY"],
    }),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { fsp: 3 }),
  },
  (t) => [
    index("addresses_user_idx").on(t.userId),
    index("addresses_pincode_idx").on(t.pincode),
  ],
);

/* ---------------------------------------------------------------- shops */

export const shops = mysqlTable(
  "shops",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    ownerId: uuidCol("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    ownerName: text("owner_name").notNull(),
    phone: text("phone").notNull(),
    email: varchar("email", { length: 255 }),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    area: text("area"),
    city: varchar("city", { length: 160 }).notNull(),
    state: text("state"),
    pincode: varchar("pincode", { length: 12 }).notNull(),
    latitude: text("latitude"),
    longitude: text("longitude"),
    shopType: shopTypeEnum("shop_type").notNull(),
    status: shopStatusEnum("status").notNull().default("PENDING_APPROVAL"),
    // Only OPERATOR/ADMIN may write this column (enforced in the service layer).
    classification: classificationEnum("classification"),
    logoUrl: text("logo_url"),
    photos: json("photos").$type<string[]>().notNull().default([]),
    /** [{ day: 0-6, open: "06:00", close: "22:00", closed?: boolean }] */
    openingHours: json("opening_hours")
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
    /** Feeds the delivery-window feasibility check (Part 58 §14) — never
     * promise a 30-minute delivery without accounting for how long this shop
     * actually takes to prepare an order. */
    preparationTimeMinutes: int("preparation_time_minutes")
      .notNull()
      .default(15),
    description: text("description"),
    rejectionReason: text("rejection_reason"),
    approvedAt: timestamp("approved_at", { fsp: 3 }),
    approvedBy: uuidCol("approved_by").references(() => users.id),

    /* --------------------------------------------- registration & fee (§4.1) */
    /**
     * Human-readable registration id shown to the owner, e.g. BKS-000123.
     * Allocated by a sequence so concurrent registrations cannot collide.
     */
    registrationNumber: varchar("registration_number", { length: 64 }).notNull(),
    registrationDate: date("registration_date", { mode: "string" }),
    /**
     * SNAPSHOT of the fee that applied when this shop registered (§12).
     * Deliberately a copy, not a join: changing the current registration fee
     * must never rewrite what an existing shop was charged.
     */
    registrationFeePaise: bigint("registration_fee_paise", { mode: "number" }),
    /** Which fee row was in force at registration — provenance for the snapshot. */
    registrationFeeId: uuidCol("registration_fee_id"),
    referralCodeId: uuidCol("referral_code_id"),
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

    /* ---------------------------------------------------- GST/PAN self-service
     * verification (marketplace GST-readiness follow-up). Distinct from the
     * admin-only `legalBusinessName`/`gstin` pair above: those are the
     * platform's own compliance-review edit path (Part 58), while these
     * columns back the shop owner's own self-service submission and its
     * verification state. A successful verification still writes through to
     * `legalBusinessName`/`gstin` above, so there's one source of truth for
     * what's actually displayed to buyers. */
    gstStatus: gstStatusEnum("gst_status").notNull().default("UNKNOWN"),
    gstTradeName: text("gst_trade_name"),
    gstVerificationSource: identityVerificationSourceEnum("gst_verification_source"),
    gstVerifiedAt: timestamp("gst_verified_at", { fsp: 3 }),
    gstVerifiedBy: uuidCol("gst_verified_by").references(() => users.id),

    panStatus: panStatusEnum("pan_status").notNull().default("UNKNOWN"),
    /** AES-256-GCM ciphertext, base64 — see gst-pan-verification.ts. Never stored or logged in plaintext. */
    panNumberEncrypted: text("pan_number_encrypted"),
    /** Last 4 characters only, plaintext — enough for a masked "XXXXXX1234F" display without decrypting. */
    panLast4: text("pan_last4"),
    panHolderName: text("pan_holder_name"),
    panVerificationSource: identityVerificationSourceEnum("pan_verification_source"),
    panVerifiedAt: timestamp("pan_verified_at", { fsp: 3 }),
    panVerifiedBy: uuidCol("pan_verified_by").references(() => users.id),
    /**
     * Shop-specific return/refund terms shown to buyers before purchase. Null
     * means the platform default (Refund & Cancellation Policy) applies.
     */
    returnPolicyText: text("return_policy_text"),

    /* ------------------------------------------------- delivery location.
     * `latitude`/`longitude` above are the shop's main location. Pickup can
     * differ (e.g. a mall unit vs. its service entrance), so it gets its own
     * pair rather than overloading the main one. Google Geocoding is called
     * exactly once, when the merchant clicks "Confirm location" — everything
     * downstream (search, maps, delivery distance) reads these stored
     * columns, never re-geocodes. See src/server/services/geocoding.ts. */
    pickupLatitude: text("pickup_latitude"),
    pickupLongitude: text("pickup_longitude"),
    pickupInstructions: text("pickup_instructions"),
    landmark: text("landmark"),
    locationVerified: boolean("location_verified").notNull().default(false),
    locationVerifiedAt: timestamp("location_verified_at", { fsp: 3 }),
    /** How `latitude`/`longitude` were obtained — provenance for the compliance/audit trail. */
    locationSource: text("location_source", {
      enum: ["GOOGLE_VERIFIED", "MANUAL_ENTRY"],
    }),

    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { fsp: 3 }),
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
export const shopClassificationHistory = mysqlTable(
  "shop_classification_history",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    shopId: uuidCol("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    previousValue: classificationEnum("previous_value"),
    newValue: classificationEnum("new_value").notNull(),
    changedBy: uuidCol("changed_by")
      .notNull()
      .references(() => users.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("shop_class_hist_shop_idx").on(t.shopId)],
);

/* ------------------------------------------------------- delivery partners
 * (delivery-system Part 58 follow-up, Slice B — registration + verification
 * only. No online/offline status, no assignment, no earnings yet — those are
 * Slice C, once deliveryOrders/deliveryPartnerEarnings exist to attach them
 * to. Mirrors the shop registration/approval pattern: self-service create,
 * admin-gated status transitions, every transition audited. */

export const deliveryPartnerStatusEnum = mysqlEnumType([
  "REGISTERED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "DEACTIVATED",
]);

export const deliveryPartners = mysqlTable(
  "delivery_partners",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuidCol("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    /* ------------------------------------------------------- personal info */
    fullName: text("full_name").notNull(),
    mobile: text("mobile").notNull(),
    email: varchar("email", { length: 255 }),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    profilePhotoUrl: text("profile_photo_url"),

    /* --------------------------------------------------- KYC — deliberately
     * minimal and all nullable; a partner can register and be reviewed
     * before supplying bank details, and nothing here is collected that
     * isn't named in the brief's own field list. */
    panNumber: text("pan_number"),
    governmentIdType: text("government_id_type"),
    governmentIdNumber: text("government_id_number"),
    bankAccountHolderName: text("bank_account_holder_name"),
    bankAccountNumber: text("bank_account_number"),
    bankIfsc: text("bank_ifsc"),

    /* ---------------------------------------------------------- vehicle */
    /** One of VEHICLE_TYPES in src/lib/vehicle-types.ts — app-level list, not a DB enum, so adding a type is a code change, not a migration. */
    vehicleType: text("vehicle_type").notNull(),
    vehicleRegistrationNumber: text("vehicle_registration_number"),
    drivingLicenceNumber: text("driving_licence_number"),

    /* -------------------------------------------------- operating area —
     * same stored-coordinates discipline as shops/addresses (see
     * geocoding.ts): verified once, reused thereafter, never re-geocoded on
     * routine reads. */
    latitude: text("latitude"),
    longitude: text("longitude"),
    operatingRadiusKm: int("operating_radius_km").notNull().default(5),
    locationVerified: boolean("location_verified").notNull().default(false),
    locationVerifiedAt: timestamp("location_verified_at", { fsp: 3 }),
    locationSource: text("location_source", {
      enum: ["GOOGLE_VERIFIED", "MANUAL_ENTRY"],
    }),

    /* ------------------------------------------------------- verification */
    status: deliveryPartnerStatusEnum("status").notNull().default("REGISTERED"),
    reviewNotes: text("review_notes"),
    rejectionReason: text("rejection_reason"),
    reviewedBy: uuidCol("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { fsp: 3 }),

    /* --------------------------------------------------- online status (Slice
     * C). Written only while online, from the browser's native geolocation —
     * never a Google Maps Platform call (see haversine.ts). Never polled or
     * updated while offline, per the brief's own privacy requirement. */
    isOnline: boolean("is_online").notNull().default(false),
    lastLocationLatitude: text("last_location_latitude"),
    lastLocationLongitude: text("last_location_longitude"),
    lastLocationAt: timestamp("last_location_at", { fsp: 3 }),

    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { fsp: 3 }),
  },
  (t) => [
    // One delivery-partner profile per user account.
    uniqueIndex("delivery_partners_user_id_unique").on(t.userId),
    index("delivery_partners_status_idx").on(t.status),
  ],
);

/* ---------------------------------------------------- catalogue (master) */

export const productCategories = mysqlTable(
  "product_categories",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    department: departmentEnum("department").notNull(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { fsp: 3 }),
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
export const products = mysqlTable(
  "products",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    categoryId: uuidCol("category_id")
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
    code: varchar("code", { length: 64 }).notNull(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    /** Structured spec sheet (bullet points), distinct from prose description. */
    specifications: text("specifications"),
    /** Freeform, optional — the schema has no subcategory table to join to. */
    subCategory: text("sub_category"),
    imageUrl: text("image_url"),
    /** Display unit: L, ml, kg, g, piece, pack. */
    unit: text("unit").notNull(),
    /** Size of one sellable unit in milli-units (1 L → 1000). */
    unitSizeMilli: int("unit_size_milli").notNull().default(1000),
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
    createdBy: uuidCol("created_by").references(() => users.id),
    approvedBy: uuidCol("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { fsp: 3 }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { fsp: 3 }),
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
export const shopProducts = mysqlTable(
  "shop_products",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    shopId: uuidCol("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    productId: uuidCol("product_id")
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
    onlineStock: int("online_stock").notNull().default(0),
    offlineStock: int("offline_stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    /** Temporary availability toggle (e.g. sold out today) distinct from isActive. */
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { fsp: 3 }),
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
export const productPriceHistory = mysqlTable(
  "product_price_history",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    shopProductId: uuidCol("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "cascade" }),
    priceType: text("price_type", { enum: ["ONLINE", "OFFLINE"] }).notNull(),
    previousPricePaise: bigint("previous_price_paise", { mode: "number" }),
    newPricePaise: bigint("new_price_paise", { mode: "number" }).notNull(),
    changedBy: uuidCol("changed_by")
      .notNull()
      .references(() => users.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("price_history_shop_product_idx").on(t.shopProductId)],
);

/** Append-only stock ledger; shop_products holds the running balance. */
export const inventoryMovements = mysqlTable(
  "inventory_movements",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    shopProductId: uuidCol("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: ["ONLINE", "OFFLINE"] }).notNull(),
    /** Negative for consumption, positive for restock. */
    deltaUnits: int("delta_units").notNull(),
    previousUnits: int("previous_units").notNull(),
    newUnits: int("new_units").notNull(),
    reason: text("reason").notNull(),
    orderId: uuidCol("order_id"),
    createdBy: uuidCol("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("inventory_movements_sp_idx").on(t.shopProductId)],
);

/* ----------------------------------------------------------------- cart */

export const carts = mysqlTable(
  "carts",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuidCol("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("carts_user_unique").on(t.userId)],
);

export const cartItems = mysqlTable(
  "cart_items",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    cartId: uuidCol("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    shopProductId: uuidCol("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "cascade" }),
    /** Number of sellable units (not milli-units) — carts sell whole units. */
    quantity: int("quantity").notNull(),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
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

export const orders = mysqlTable(
  "orders",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    orderNumber: varchar("order_number", { length: 32 }).notNull(),
    userId: uuidCol("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    shopId: uuidCol("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    addressId: uuidCol("address_id").references(() => addresses.id),
    /** Address is snapshotted so later edits never rewrite delivery history. */
    deliveryAddressSnapshot: json("delivery_address_snapshot").$type<{
      line1: string;
      line2?: string | null;
      area?: string | null;
      city: string;
      pincode: string;
      /** Carried forward from the address at order time — delivery-assignment
       * (Slice C) needs the customer's coordinates without re-geocoding. */
      latitude?: string | null;
      longitude?: string | null;
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
    paidAt: timestamp("paid_at", { fsp: 3 }),
    deliveryDate: date("delivery_date", { mode: "string" }),
    notes: text("notes"),
    cancellationReason: text("cancellation_reason"),
    /** Chosen at checkout, when set — see delivery-feasibility.ts. Null for
     * orders placed before this existed, or where no window was offered. */
    deliveryWindow: deliveryWindowEnum("delivery_window"),
    /** The deadline promised for `deliveryWindow`. Never set unless the
     * system determined it was actually achievable at checkout time. */
    promisedByAt: timestamp("promised_by_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
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
export const orderItems = mysqlTable(
  "order_items",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    orderId: uuidCol("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    shopProductId: uuidCol("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "restrict" }),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    unitSnapshot: text("unit_snapshot").notNull(),
    unitPricePaise: bigint("unit_price_paise", { mode: "number" }).notNull(),
    /** Milli-units, so 2.5 L is exactly 2500. */
    quantityMilli: int("quantity_milli").notNull(),
    lineTotalPaise: bigint("line_total_paise", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 })
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

export const orderStatusHistory = mysqlTable(
  "order_status_history",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    orderId: uuidCol("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    previousStatus: orderStatusEnum("previous_status"),
    newStatus: orderStatusEnum("new_status").notNull(),
    changedBy: uuidCol("changed_by").references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)],
);

/* ---------------------------------------------------- delivery assignment
 * (delivery-system Part 58 follow-up, Slice C). One row per order for now —
 * multi-order batching (Phase 2) would attach several deliveryOrders to a
 * shared route/batch, not change this table's shape. */

export const deliveryOrderStatusEnum = mysqlEnumType([
  "OFFERED",
  "ACCEPTED",
  "REJECTED",
  "PICKED_UP",
  "DELIVERED",
  "CANCELLED",
]);

export const deliveryOrders = mysqlTable(
  "delivery_orders",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    orderId: uuidCol("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    deliveryPartnerId: uuidCol("delivery_partner_id")
      .notNull()
      .references(() => deliveryPartners.id, { onDelete: "restrict" }),
    status: deliveryOrderStatusEnum("status").notNull().default("OFFERED"),
    /** Haversine straight-line distance, shop → customer, at assignment time — not a road-distance API call (see haversine.ts). */
    distanceKm: text("distance_km"),
    offeredAt: timestamp("offered_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp("accepted_at", { fsp: 3 }),
    pickedUpAt: timestamp("picked_up_at", { fsp: 3 }),
    deliveredAt: timestamp("delivered_at", { fsp: 3 }),
    cancelledAt: timestamp("cancelled_at", { fsp: 3 }),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One active delivery assignment per order, pre-batching.
    uniqueIndex("delivery_orders_order_id_unique").on(t.orderId),
    index("delivery_orders_partner_idx").on(t.deliveryPartnerId),
    index("delivery_orders_status_idx").on(t.status),
  ],
);

/**
 * Admin-configurable earnings rates (Part 58 §11) — same "one active row"
 * pattern as registrationFees. Changes are audited via recordAudit(), not a
 * dedicated history table: lower-stakes than the registration fee, which
 * has direct legal/billing weight.
 */
export const deliveryEarningsConfig = mysqlTable(
  "delivery_earnings_config",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    baseFeePaise: bigint("base_fee_paise", { mode: "number" }).notNull(),
    perKmFeePaise: bigint("per_km_fee_paise", { mode: "number" }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    note: text("note"),
    createdBy: uuidCol("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("delivery_earnings_config_non_negative", sql`${t.baseFeePaise} >= 0 AND ${t.perKmFeePaise} >= 0`),
  ],
);

/** One row per completed delivery — the "transparent, delivery-wise earnings statement" the brief calls for. Idempotent on deliveryOrderId. */
export const deliveryPartnerEarnings = mysqlTable(
  "delivery_partner_earnings",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    deliveryPartnerId: uuidCol("delivery_partner_id").notNull(),
    deliveryOrderId: uuidCol("delivery_order_id").notNull(),
    basePaise: bigint("base_paise", { mode: "number" }).notNull(),
    distancePaise: bigint("distance_paise", { mode: "number" }).notNull(),
    totalPaise: bigint("total_paise", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Named explicitly: the identifier drizzle derives from the table and
    // column names exceeds MySQL's 64-character identifier limit, which
    // Postgres silently truncated but MySQL rejects outright.
    foreignKey({
      name: "dp_earnings_partner_fk",
      columns: [t.deliveryPartnerId],
      foreignColumns: [deliveryPartners.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "dp_earnings_order_fk",
      columns: [t.deliveryOrderId],
      foreignColumns: [deliveryOrders.id],
    }).onDelete("restrict"),
    uniqueIndex("delivery_partner_earnings_order_unique").on(t.deliveryOrderId),
    index("delivery_partner_earnings_partner_idx").on(t.deliveryPartnerId),
  ],
);

/* ------------------------------------------------------------- payments */

export const payments = mysqlTable(
  "payments",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuidCol("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    gateway: text("gateway").notNull().default("CASHFREE"),
    /** Cashfree order id — unique so one intent cannot be created twice. */
    gatewayOrderId: varchar("gateway_order_id", { length: 128 }).notNull(),
    /** Cashfree payment id (cf_payment_id) — UNIQUE, which is what blocks replayed callbacks. */
    gatewayPaymentId: varchar("gateway_payment_id", { length: 128 }),
    gatewaySignature: text("gateway_signature"),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("INR"),
    status: paymentStatusEnum("status").notNull().default("CREATED"),
    purpose: text("purpose", { enum: ["WALLET_TOPUP"] })
      .notNull()
      .default("WALLET_TOPUP"),
    failureReason: text("failure_reason"),
    rawPayload: json("raw_payload"),
    /**
     * The voucher code committed to at order-creation time (§19, §32) — read
     * back at verification rather than re-accepted from the client, so a
     * caller cannot swap in a better voucher after the price/amount was
     * already fixed. Null when no voucher was applied.
     */
    voucherCode: text("voucher_code"),
    verifiedAt: timestamp("verified_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
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

export const wallets = mysqlTable(
  "wallets",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuidCol("user_id")
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
    lowBalanceNotifiedAt: timestamp("low_balance_notified_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
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
export const walletTransactions = mysqlTable(
  "wallet_transactions",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    walletId: uuidCol("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "restrict" }),
    userId: uuidCol("user_id")
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
    orderId: uuidCol("order_id").references(() => orders.id),
    subscriptionId: uuidCol("subscription_id"),
    paymentId: uuidCol("payment_id").references(() => payments.id),
    reversalOfId: uuidCol("reversal_of_id"),
    /**
     * voucher_redemptions.id — a plain uuid rather than .references() because
     * voucher_redemptions is declared later in this file (same rationale as
     * shops.registration_fee_id above); the FK constraint is added via raw
     * SQL in the migration once that table exists.
     */
    voucherRedemptionId: uuidCol("voucher_redemption_id"),
    /**
     * UNIQUE. This single index is what makes every wallet mutation safely
     * retryable: a duplicate attempt collides here instead of double-charging.
     */
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    description: text("description").notNull(),
    createdBy: uuidCol("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { fsp: 3 })
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
export const vouchers = mysqlTable(
  "vouchers",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    /** Stored upper-cased; NULL when applyMode is AUTO_APPLY. */
    code: varchar("code", { length: 64 }),
    description: text("description"),
    termsAndConditions: text("terms_and_conditions"),
    applyMode: voucherApplyModeEnum("apply_mode").notNull().default("CODE"),
    /** Basis points would overcomplicate this; whole/fractional percent as numeric. */
    bonusPercent: bigint("bonus_percent", { mode: "number" }).notNull(),
    minimumTopupPaise: bigint("minimum_topup_paise", { mode: "number" })
      .notNull()
      .default(0),
    maximumBonusPaise: bigint("maximum_bonus_paise", { mode: "number" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    /** NULL = unlimited. */
    usageLimit: int("usage_limit"),
    perCustomerLimit: int("per_customer_limit").notNull().default(1),
    /** NULL = unlimited promotional liability. */
    totalBudgetPaise: bigint("total_budget_paise", { mode: "number" }),
    /** Running total of bonus paise issued — maintained atomically with every redemption. */
    budgetUsedPaise: bigint("budget_used_paise", { mode: "number" })
      .notNull()
      .default(0),
    redemptionCount: int("redemption_count").notNull().default(0),
    status: voucherStatusEnum("status").notNull().default("DRAFT"),
    /** Free-text scope hook for §26 (category/shop restriction) — unused by
     *  the engine in this first implementation, which applies vouchers to any
     *  eligible top-up per the brief's explicit "for the first implementation" scope. */
    applicableScope: text("applicable_scope"),
    createdBy: uuidCol("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
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
export const voucherRedemptions = mysqlTable(
  "voucher_redemptions",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    voucherId: uuidCol("voucher_id")
      .notNull()
      .references(() => vouchers.id, { onDelete: "restrict" }),
    userId: uuidCol("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    walletId: uuidCol("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "restrict" }),
    paymentId: uuidCol("payment_id").references(() => payments.id),
    topupAmountPaise: bigint("topup_amount_paise", { mode: "number" }).notNull(),
    bonusPercent: bigint("bonus_percent", { mode: "number" }).notNull(),
    bonusAmountPaise: bigint("bonus_amount_paise", { mode: "number" }).notNull(),
    status: voucherRedemptionStatusEnum("status").notNull().default("PENDING"),
    /**
     * Idempotency anchor: one redemption per payment. A retried/duplicate
     * verify call for the same payment can never double-apply the bonus.
     */
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 })
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
export const voucherUploads = mysqlTable(
  "voucher_uploads",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    uploadedBy: uuidCol("uploaded_by")
      .notNull()
      .references(() => users.id),
    fileName: text("file_name").notNull(),
    status: voucherUploadStatusEnum("status").notNull().default("VALIDATED"),
    totalRecords: int("total_records").notNull().default(0),
    successfulRecords: int("successful_records").notNull().default(0),
    failedRecords: int("failed_records").notNull().default(0),
    summary: json("summary").$type<Record<string, unknown>>(),
    appliedAt: timestamp("applied_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("voucher_uploads_uploader_idx").on(t.uploadedBy)],
);

export const voucherUploadItems = mysqlTable(
  "voucher_upload_items",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    uploadId: uuidCol("upload_id")
      .notNull()
      .references(() => voucherUploads.id, { onDelete: "cascade" }),
    rowNumber: int("row_number").notNull(),
    rawData: json("raw_data").$type<Record<string, unknown>>(),
    voucherName: text("voucher_name"),
    voucherCode: text("voucher_code"),
    status: voucherUploadRowStatusEnum("status").notNull(),
    errorMessage: text("error_message"),
    createdVoucherId: uuidCol("created_voucher_id").references(() => vouchers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("voucher_upload_items_row_unique").on(t.uploadId, t.rowNumber),
    index("voucher_upload_items_upload_idx").on(t.uploadId),
  ],
);

/* --------------------------------------------------------- subscriptions */

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuidCol("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shopId: uuidCol("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    shopProductId: uuidCol("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "restrict" }),
    addressId: uuidCol("address_id").references(() => addresses.id),
    /** Standing quantity per delivery, in milli-units (2 L/day → 2000). */
    quantityMilli: int("quantity_milli").notNull(),
    frequency: subscriptionFrequencyEnum("frequency").notNull().default("DAILY"),
    /** For WEEKLY: ISO weekdays 1-7 the delivery occurs on. */
    weekdays: json("weekdays").$type<number[]>().notNull().default([]),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    nextDeliveryDate: date("next_delivery_date", { mode: "string" }),
    status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
    pauseFrom: date("pause_from", { mode: "string" }),
    pauseUntil: date("pause_until", { mode: "string" }),
    cancelledAt: timestamp("cancelled_at", { fsp: 3 }),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
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
export const subscriptionDailyOverrides = mysqlTable(
  "subscription_daily_overrides",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    subscriptionId: uuidCol("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    deliveryDate: date("delivery_date", { mode: "string" }).notNull(),
    type: overrideTypeEnum("type").notNull(),
    /** NULL when type = SKIP. */
    quantityMilli: int("quantity_milli"),
    createdBy: uuidCol("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
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
export const subscriptionOrders = mysqlTable(
  "subscription_orders",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    subscriptionId: uuidCol("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    orderId: uuidCol("order_id").references(() => orders.id),
    deliveryDate: date("delivery_date", { mode: "string" }).notNull(),
    quantityMilli: int("quantity_milli").notNull(),
    unitPricePaise: bigint("unit_price_paise", { mode: "number" }).notNull(),
    totalPaise: bigint("total_paise", { mode: "number" }).notNull(),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    failureReason: text("failure_reason"),
    generatedAt: timestamp("generated_at", { fsp: 3 })
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

export const notifications = mysqlTable(
  "notifications",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuidCol("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    channel: notificationChannelEnum("channel").notNull().default("IN_APP"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** Deep link into the app, e.g. /wallet or /subscriptions/:id. */
    actionUrl: text("action_url"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    readAt: timestamp("read_at", { fsp: 3 }),
    sentAt: timestamp("sent_at", { fsp: 3 }),
    /** Set for notifications that must not repeat (e.g. one low-balance alert). */
    dedupeKey: varchar("dedupe_key", { length: 191 }),
    createdAt: timestamp("created_at", { fsp: 3 })
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
export const registrationFees = mysqlTable(
  "registration_fees",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("INR"),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    /** Exactly one row is active at a time; enforced by a partial unique index. */
    isActive: boolean("is_active").notNull().default(true),
    note: text("note"),
    createdBy: uuidCol("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("registration_fees_effective_idx").on(t.effectiveFrom),
    check("registration_fees_amount_non_negative", sql`${t.amountPaise} >= 0`),
  ],
);

/** Immutable trail of fee changes (§12). Never updated, never deleted. */
export const registrationFeeHistory = mysqlTable(
  "registration_fee_history",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    registrationFeeId: uuidCol("registration_fee_id").notNull(),
    previousAmountPaise: bigint("previous_amount_paise", { mode: "number" }),
    newAmountPaise: bigint("new_amount_paise", { mode: "number" }).notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    changedBy: uuidCol("changed_by")
      .notNull()
      .references(() => users.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Named explicitly: the identifier drizzle derives from the table and
    // column names exceeds MySQL's 64-character identifier limit, which
    // Postgres silently truncated but MySQL rejects outright.
    foreignKey({
      name: "reg_fee_history_fee_fk",
      columns: [t.registrationFeeId],
      foreignColumns: [registrationFees.id],
    }).onDelete("restrict"),
    index("registration_fee_history_created_idx").on(t.createdAt),
  ],
);

/* -------------------------------------------------------- referral codes */

export const referralCodes = mysqlTable(
  "referral_codes",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Stored upper-cased; matching is case-insensitive at the service layer. */
    code: varchar("code", { length: 64 }).notNull(),
    label: text("label"),
    /** Optional: the person or partner the referral is credited to. */
    referrerName: text("referrer_name"),
    referrerUserId: uuidCol("referrer_user_id").references(() => users.id),
    status: referralStatusEnum("status").notNull().default("ACTIVE"),
    expiresAt: date("expires_at", { mode: "string" }),
    note: text("note"),
    createdBy: uuidCol("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("referral_codes_code_unique").on(t.code),
    index("referral_codes_status_idx").on(t.status),
  ],
);

/** One row per shop that registered under a referral code. */
export const referralRedemptions = mysqlTable(
  "referral_redemptions",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    referralCodeId: uuidCol("referral_code_id")
      .notNull()
      .references(() => referralCodes.id, { onDelete: "restrict" }),
    shopId: uuidCol("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    registrationFeePaise: bigint("registration_fee_paise", { mode: "number" }),
    redeemedBy: uuidCol("redeemed_by").references(() => users.id),
    createdAt: timestamp("created_at", { fsp: 3 })
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
export const shopPayments = mysqlTable(
  "shop_payments",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Human-readable receipt id shown to the owner, e.g. PAY-2026-000045. */
    reference: varchar("reference", { length: 255 }).notNull(),
    shopId: uuidCol("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    ownerId: uuidCol("owner_id")
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
    paidAt: timestamp("paid_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    note: text("note"),
    receiptUrl: text("receipt_url"),
    /** Set on a REVERSAL/REFUND row to point at the payment being corrected. */
    reversalOfId: uuidCol("reversal_of_id"),
    recordedBy: uuidCol("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { fsp: 3 })
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
export const excelUploads = mysqlTable(
  "excel_uploads",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    shopId: uuidCol("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    uploadedBy: uuidCol("uploaded_by")
      .notNull()
      .references(() => users.id),
    uploadType: excelUploadTypeEnum("upload_type").notNull().default("PRICES"),
    status: excelUploadStatusEnum("status").notNull().default("VALIDATED"),
    fileName: text("file_name").notNull(),
    fileSizeBytes: int("file_size_bytes").notNull().default(0),
    totalRows: int("total_rows").notNull().default(0),
    validRows: int("valid_rows").notNull().default(0),
    invalidRows: int("invalid_rows").notNull().default(0),
    unchangedRows: int("unchanged_rows").notNull().default(0),
    duplicateRows: int("duplicate_rows").notNull().default(0),
    notFoundRows: int("not_found_rows").notNull().default(0),
    /** Counts and headline diffs, rendered on the preview screen. */
    summary: json("summary").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    appliedAt: timestamp("applied_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 })
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
export const excelUploadItems = mysqlTable(
  "excel_upload_items",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    uploadId: uuidCol("upload_id")
      .notNull()
      .references(() => excelUploads.id, { onDelete: "cascade" }),
    rowNumber: int("row_number").notNull(),
    /** Verbatim cell values, so an operator can see exactly what they sent. */
    rawData: json("raw_data").$type<Record<string, unknown>>(),
    productCode: text("product_code"),
    productName: text("product_name"),
    unit: text("unit"),
    parsedPricePaise: bigint("parsed_price_paise", { mode: "number" }),
    previousPricePaise: bigint("previous_price_paise", { mode: "number" }),
    matchedShopProductId: uuidCol("matched_shop_product_id").references(
      () => shopProducts.id,
      { onDelete: "set null" },
    ),
    /**
     * GOODS upload only: the row matched a product in the CENTRAL catalogue
     * that this shop does not yet carry — apply() attaches it via
     * createShopProduct rather than creating a new products row.
     */
    matchedProductId: uuidCol("matched_product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    /**
     * GOODS upload only: set when a NEW_PRODUCT row's name is close to an
     * existing product, so the preview can warn "this looks like X" without
     * blocking the row (§ "flag it for review").
     */
    possibleDuplicateProductId: uuidCol("possible_duplicate_product_id").references(
      () => products.id,
      { onDelete: "set null" },
    ),
    status: excelRowStatusEnum("status").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { fsp: 3 })
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
export const priceUpdateBatches = mysqlTable(
  "price_update_batches",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    shopId: uuidCol("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    source: priceRequestSourceEnum("source").notNull(),
    submittedBy: uuidCol("submitted_by")
      .notNull()
      .references(() => users.id),
    excelUploadId: uuidCol("excel_upload_id").references(() => excelUploads.id, {
      onDelete: "set null",
    }),
    status: priceRequestStatusEnum("status").notNull().default("PENDING"),
    note: text("note"),
    decidedBy: uuidCol("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 })
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
export const priceUpdateRequests = mysqlTable(
  "price_update_requests",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    batchId: uuidCol("batch_id")
      .notNull()
      .references(() => priceUpdateBatches.id, { onDelete: "cascade" }),
    shopId: uuidCol("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    shopProductId: uuidCol("shop_product_id")
      .notNull()
      .references(() => shopProducts.id, { onDelete: "cascade" }),
    priceType: text("price_type", { enum: ["ONLINE", "OFFLINE"] }).notNull(),
    previousPricePaise: bigint("previous_price_paise", { mode: "number" }),
    proposedPricePaise: bigint("proposed_price_paise", {
      mode: "number",
    }).notNull(),
    status: priceRequestStatusEnum("status").notNull().default("PENDING"),
    source: priceRequestSourceEnum("source").notNull(),
    submittedBy: uuidCol("submitted_by")
      .notNull()
      .references(() => users.id),
    decidedBy: uuidCol("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { fsp: 3 }),
    rejectionReason: text("rejection_reason"),
    appliedAt: timestamp("applied_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 })
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
export const grievances = mysqlTable(
  "grievances",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Human-readable reference, e.g. GRV-000123 — what the complainant quotes back. */
    ticketNumber: varchar("ticket_number", { length: 32 }).notNull(),
    submittedByUserId: uuidCol("submitted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: text("phone"),
    category: grievanceCategoryEnum("category").notNull().default("OTHER"),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: grievanceStatusEnum("status").notNull().default("OPEN"),
    assignedToUserId: uuidCol("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolutionNotes: text("resolution_notes"),
    resolvedAt: timestamp("resolved_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
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
export const userConsents = mysqlTable(
  "user_consents",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuidCol("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    consentType: consentTypeEnum("consent_type").notNull(),
    /** The policy version consented to, e.g. "2026-08-21" — matches the policy page's "Last updated" date. */
    version: text("version").notNull(),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("user_consents_user_idx").on(t.userId),
    index("user_consents_type_idx").on(t.consentType),
  ],
);

/* ----------------------------------------------------------- audit logs */

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    actorId: uuidCol("actor_id").references(() => users.id),
    actorRole: userRoleEnum("actor_role"),
    action: text("action").notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    previousValue: json("previous_value"),
    newValue: json("new_value"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_actor_idx").on(t.actorId),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_created_idx").on(t.createdAt),
  ],
);

/**
 * SKU-usage log for Google Maps Platform calls (delivery-system Part 58
 * follow-up — cost-optimization architecture). Written exactly once per
 * server-side Geocoding call, never per client-side Autocomplete keystroke
 * or map render — those never touch the server. Lets an admin see whether
 * "call Google exactly once per location" is actually being honoured.
 */
export const mapsApiCallLog = mysqlTable(
  "maps_api_call_log",
  {
    id: uuidCol("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    service: varchar("service", { length: 32, enum: ["GEOCODING"] }).notNull(),
    purpose: text("purpose").notNull(),
    entityType: varchar("entity_type", { length: 64 }),
    entityId: varchar("entity_id", { length: 64 }),
    success: boolean("success").notNull(),
    responseTimeMs: int("response_time_ms"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("maps_api_call_log_service_idx").on(t.service),
    index("maps_api_call_log_created_idx").on(t.createdAt),
    index("maps_api_call_log_entity_idx").on(t.entityType, t.entityId),
  ],
);

/* ------------------------------------------------------------ inference */

export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type GstStatus = (typeof gstStatusEnum.enumValues)[number];
export type PanStatus = (typeof panStatusEnum.enumValues)[number];
export type IdentityVerificationSource = (typeof identityVerificationSourceEnum.enumValues)[number];
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
export type Address = typeof addresses.$inferSelect;
export type DeliveryPartner = typeof deliveryPartners.$inferSelect;
export type DeliveryPartnerStatus = (typeof deliveryPartnerStatusEnum.enumValues)[number];
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;
export type DeliveryOrderStatus = (typeof deliveryOrderStatusEnum.enumValues)[number];
export type DeliveryWindow = (typeof deliveryWindowEnum.enumValues)[number];
export type DeliveryEarningsConfig = typeof deliveryEarningsConfig.$inferSelect;
export type DeliveryPartnerEarning = typeof deliveryPartnerEarnings.$inferSelect;
export type MapsApiCallLog = typeof mapsApiCallLog.$inferSelect;
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
