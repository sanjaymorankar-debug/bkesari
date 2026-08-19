/**
 * Shop service (requirements §8–§10, §15–§16).
 *
 * Two invariants are enforced here and nowhere else:
 *   - A shop is publicly visible only when APPROVED.
 *   - Kesari/Green classification is writable only by OPERATOR/ADMIN, and every
 *     change is recorded with who/when/why.
 */
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";

import { conflict, forbidden, notFound, validationFailed } from "@/lib/errors";
import { db } from "@/server/db";
import {
  shopClassificationHistory,
  shops,
  users,
  type Classification,
  type Shop,
  type ShopStatus,
  type UserRole,
} from "@/server/db/schema";
import { AUDIT_ACTIONS, recordAudit } from "./audit";
import { uniqueSlug } from "./catalogue";

export interface RegisterShopInput {
  name: string;
  ownerName: string;
  phone: string;
  email?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  area?: string | null;
  city: string;
  state?: string | null;
  pincode: string;
  latitude?: string | null;
  longitude?: string | null;
  shopType: "DAIRY" | "BAKERY" | "BOTH";
  logoUrl?: string | null;
  photos?: string[];
  openingHours?: { day: number; open: string; close: string; closed?: boolean }[];
  deliveryAvailable?: boolean;
  deliveryFeePaise?: number;
  freeDeliveryAbovePaise?: number | null;
  description?: string | null;
}

/**
 * Submits a shop registration. Always lands in PENDING_APPROVAL — the caller
 * cannot choose a status, and classification is left null for an operator to
 * assign at approval time (§8, §10).
 */
export async function registerShop(
  input: RegisterShopInput,
  actor: { id: string; role: UserRole },
): Promise<Shop> {
  if (!/^\d{6}$/.test(input.pincode)) {
    throw validationFailed("PIN code must be exactly 6 digits.");
  }
  if (!/^[6-9]\d{9}$/.test(input.phone)) {
    throw validationFailed("Enter a valid 10-digit Indian mobile number.");
  }

  const [shop] = await db
    .insert(shops)
    .values({
      ownerId: actor.id,
      name: input.name.trim(),
      slug: uniqueSlug(input.name),
      ownerName: input.ownerName.trim(),
      phone: input.phone,
      email: input.email ?? null,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? null,
      area: input.area ?? null,
      city: input.city,
      state: input.state ?? null,
      pincode: input.pincode,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      shopType: input.shopType,
      logoUrl: input.logoUrl ?? null,
      photos: input.photos ?? [],
      openingHours: input.openingHours ?? [],
      deliveryAvailable: input.deliveryAvailable ?? false,
      deliveryFeePaise: input.deliveryFeePaise ?? 0,
      freeDeliveryAbovePaise: input.freeDeliveryAbovePaise ?? null,
      description: input.description ?? null,
      // Status and classification are deliberately NOT taken from input.
      status: "PENDING_APPROVAL",
      classification: null,
    })
    .returning();

  // Registering a shop promotes a plain customer to SHOP_OWNER. Operators and
  // admins keep their higher role.
  if (actor.role === "CUSTOMER") {
    await db
      .update(users)
      .set({ role: "SHOP_OWNER", updatedAt: new Date() })
      .where(eq(users.id, actor.id));
  }

  await recordAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.SHOP_REGISTERED,
    entityType: "shop",
    entityId: shop.id,
    newValue: { name: shop.name, shopType: shop.shopType },
  });
  return shop;
}

/* ------------------------------------------------------------- approval */

export async function approveShop(
  shopId: string,
  input: { classification: Classification },
  actor: { id: string; role: UserRole },
): Promise<Shop> {
  return db.transaction(async (tx) => {
    const [shop] = await tx
      .select()
      .from(shops)
      .where(eq(shops.id, shopId))
      .for("update");
    if (!shop) throw notFound("Shop");
    if (shop.status === "APPROVED") {
      throw conflict("This shop is already approved.");
    }

    const [updated] = await tx
      .update(shops)
      .set({
        status: "APPROVED",
        classification: input.classification,
        approvedAt: new Date(),
        approvedBy: actor.id,
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(shops.id, shopId))
      .returning();

    await tx.insert(shopClassificationHistory).values({
      shopId,
      previousValue: shop.classification,
      newValue: input.classification,
      changedBy: actor.id,
      reason: "Assigned at approval",
    });

    await recordAudit(
      {
        actorId: actor.id,
        actorRole: actor.role,
        action: AUDIT_ACTIONS.SHOP_APPROVED,
        entityType: "shop",
        entityId: shopId,
        previousValue: { status: shop.status },
        newValue: { status: "APPROVED", classification: input.classification },
      },
      tx,
    );
    return updated;
  });
}

export async function rejectShop(
  shopId: string,
  reason: string,
  actor: { id: string; role: UserRole },
): Promise<Shop> {
  if (!reason.trim()) {
    throw validationFailed("A rejection reason is required.");
  }
  const [updated] = await db
    .update(shops)
    .set({ status: "REJECTED", rejectionReason: reason, updatedAt: new Date() })
    .where(eq(shops.id, shopId))
    .returning();
  if (!updated) throw notFound("Shop");

  await recordAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.SHOP_REJECTED,
    entityType: "shop",
    entityId: shopId,
    newValue: { status: "REJECTED", reason },
  });
  return updated;
}

export async function setShopStatus(
  shopId: string,
  status: ShopStatus,
  actor: { id: string; role: UserRole },
  reason?: string,
): Promise<Shop> {
  const [updated] = await db
    .update(shops)
    .set({ status, updatedAt: new Date() })
    .where(eq(shops.id, shopId))
    .returning();
  if (!updated) throw notFound("Shop");

  await recordAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.SHOP_SUSPENDED,
    entityType: "shop",
    entityId: shopId,
    newValue: { status, reason },
  });
  return updated;
}

/* ------------------------------------------------------ classification */

/**
 * Changes Kesari/Green (§10).
 *
 * The capability check lives in the route guard, but this function refuses a
 * SHOP_OWNER outright as defence in depth — a mis-wired route must not be able
 * to let an owner reclassify their own shop.
 */
export async function changeClassification(
  shopId: string,
  newValue: Classification,
  reason: string,
  actor: { id: string; role: UserRole },
): Promise<Shop> {
  if (actor.role !== "OPERATOR" && actor.role !== "ADMIN") {
    throw forbidden("Only an operator or administrator can change this.");
  }
  if (!reason.trim()) {
    throw validationFailed("A reason is required when changing classification.");
  }

  return db.transaction(async (tx) => {
    const [shop] = await tx
      .select()
      .from(shops)
      .where(eq(shops.id, shopId))
      .for("update");
    if (!shop) throw notFound("Shop");
    if (shop.classification === newValue) {
      throw conflict(`This shop is already classified as ${newValue}.`);
    }

    const [updated] = await tx
      .update(shops)
      .set({ classification: newValue, updatedAt: new Date() })
      .where(eq(shops.id, shopId))
      .returning();

    await tx.insert(shopClassificationHistory).values({
      shopId,
      previousValue: shop.classification,
      newValue,
      changedBy: actor.id,
      reason,
    });

    await recordAudit(
      {
        actorId: actor.id,
        actorRole: actor.role,
        action: AUDIT_ACTIONS.SHOP_CLASSIFICATION_CHANGED,
        entityType: "shop",
        entityId: shopId,
        previousValue: { classification: shop.classification },
        newValue: { classification: newValue, reason },
      },
      tx,
    );
    return updated;
  });
}

export async function getClassificationHistory(shopId: string) {
  return db
    .select({
      id: shopClassificationHistory.id,
      previousValue: shopClassificationHistory.previousValue,
      newValue: shopClassificationHistory.newValue,
      reason: shopClassificationHistory.reason,
      createdAt: shopClassificationHistory.createdAt,
      changedByName: users.name,
      changedByEmail: users.email,
    })
    .from(shopClassificationHistory)
    .innerJoin(users, eq(shopClassificationHistory.changedBy, users.id))
    .where(eq(shopClassificationHistory.shopId, shopId))
    .orderBy(desc(shopClassificationHistory.createdAt));
}

/* ----------------------------------------------------------- retrieval */

export async function getShopById(shopId: string): Promise<Shop | undefined> {
  return db.query.shops.findFirst({
    where: and(eq(shops.id, shopId), isNull(shops.deletedAt)),
  });
}

export async function getPublicShopBySlug(
  slug: string,
): Promise<Shop | undefined> {
  return db.query.shops.findFirst({
    where: and(
      eq(shops.slug, slug),
      eq(shops.status, "APPROVED"),
      isNull(shops.deletedAt),
    ),
  });
}

export async function listShopsForOwner(ownerId: string): Promise<Shop[]> {
  return db
    .select()
    .from(shops)
    .where(and(eq(shops.ownerId, ownerId), isNull(shops.deletedAt)))
    .orderBy(desc(shops.createdAt));
}

export interface ShopSearchFilters {
  query?: string;
  city?: string;
  area?: string;
  pincode?: string;
  shopType?: "DAIRY" | "BAKERY" | "BOTH";
  classification?: Classification;
  deliveryOnly?: boolean;
  limit?: number;
  offset?: number;
}

/** Public shop search (§15). Only APPROVED shops are ever returned. */
export async function searchShops(
  filters: ShopSearchFilters = {},
): Promise<Shop[]> {
  const conditions = [
    eq(shops.status, "APPROVED"),
    isNull(shops.deletedAt),
  ];

  if (filters.query) {
    const term = `%${filters.query}%`;
    conditions.push(
      or(
        ilike(shops.name, term),
        ilike(shops.area, term),
        ilike(shops.city, term),
        ilike(shops.description, term),
      )!,
    );
  }
  if (filters.city) conditions.push(ilike(shops.city, `%${filters.city}%`));
  if (filters.area) conditions.push(ilike(shops.area, `%${filters.area}%`));
  if (filters.pincode) conditions.push(eq(shops.pincode, filters.pincode));
  if (filters.classification) {
    conditions.push(eq(shops.classification, filters.classification));
  }
  if (filters.deliveryOnly) {
    conditions.push(eq(shops.deliveryAvailable, true));
  }
  // A DAIRY filter must also match BOTH shops, since they sell dairy too.
  if (filters.shopType && filters.shopType !== "BOTH") {
    conditions.push(inArray(shops.shopType, [filters.shopType, "BOTH"]));
  } else if (filters.shopType === "BOTH") {
    conditions.push(eq(shops.shopType, "BOTH"));
  }

  return db
    .select()
    .from(shops)
    .where(and(...conditions))
    .orderBy(asc(shops.name))
    .limit(Math.min(filters.limit ?? 24, 100))
    .offset(filters.offset ?? 0);
}

export async function listShopsByStatus(status: ShopStatus): Promise<Shop[]> {
  return db
    .select()
    .from(shops)
    .where(and(eq(shops.status, status), isNull(shops.deletedAt)))
    .orderBy(desc(shops.createdAt));
}

/** Whether the shop is open right now, per its configured opening hours. */
export function isShopOpenNow(shop: Shop, now: Date = new Date()): boolean {
  const hours = shop.openingHours;
  if (!hours || hours.length === 0) return true; // unset means always open

  const day = now.getDay(); // 0 = Sunday
  const today = hours.find((h) => h.day === day);
  if (!today || today.closed) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  return minutes >= toMinutes(today.open) && minutes <= toMinutes(today.close);
}

export async function countShopsByStatus(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: shops.status, count: sql<number>`count(*)::int` })
    .from(shops)
    .where(isNull(shops.deletedAt))
    .groupBy(shops.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.count]));
}
