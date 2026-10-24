/**
 * Delivery assignment (delivery-system Part 58 follow-up, Slice C).
 *
 * Deliberately the simplest workable dispatch: when a shop marks an order
 * READY, offer it to the single nearest online, approved, not-already-busy
 * delivery partner within their own operating radius — ranked by Haversine
 * distance on stored coordinates, never a Google Routes/Distance Matrix
 * call (see haversine.ts). No batching, no scoring engine, no zones — those
 * are Phase 2 once real usage data exists to tune them.
 *
 * Two distinct distances matter here and are not interchangeable:
 *  - partner → shop: who's nearest, decides who gets the offer and feeds
 *    delivery-feasibility.ts's window promise.
 *  - shop → customer: the actual delivery leg, persisted as
 *    deliveryOrders.distanceKm and used by delivery-earnings.ts's distance
 *    fee. Falls back to the assignment distance only when the order has no
 *    verified customer location on file.
 */
import { and, desc, eq, inArray } from "drizzle-orm";

import { conflict, forbidden, notFound } from "@/lib/errors";
import { haversineDistanceKm, parseCoordinates } from "@/lib/geo/haversine";
import { db } from "@/server/db";
import {
  deliveryOrders,
  deliveryPartners,
  orders,
  shops,
  type DeliveryOrder,
  type UserRole,
} from "@/server/db/schema";
import { AUDIT_ACTIONS, recordAudit } from "./audit";
import { creditDeliveryEarnings } from "./delivery-earnings";
import { NOTIFICATION_TYPES, notify } from "./notifications";
import { updateOrderStatus } from "./orders";

interface Actor {
  id: string;
  role: UserRole;
}

const ACTIVE_ASSIGNMENT_STATUSES = ["OFFERED", "ACCEPTED", "PICKED_UP"] as const;

/**
 * Assigns the nearest eligible partner to a READY order. Throws (rather than
 * leaving the order silently unassigned) when nobody is available, so the
 * calling UI can surface "no rider available — retry" per the brief's
 * failsafe requirement (§21) instead of an order stranding without anyone
 * noticing.
 */
export async function assignNearestPartner(orderId: string, actor: Actor): Promise<DeliveryOrder> {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) throw notFound("Order");
  if (order.status !== "READY") {
    throw conflict("Only an order marked READY can be assigned to a delivery partner.");
  }

  const existing = await db.query.deliveryOrders.findFirst({
    where: eq(deliveryOrders.orderId, orderId),
  });
  if (existing && (ACTIVE_ASSIGNMENT_STATUSES as readonly string[]).includes(existing.status)) {
    throw conflict("This order already has an active delivery assignment.");
  }

  const shop = await db.query.shops.findFirst({ where: eq(shops.id, order.shopId) });
  if (!shop) throw notFound("Shop");
  const shopCoords = parseCoordinates(shop.latitude, shop.longitude);
  if (!shopCoords) throw conflict("This shop has no verified location on file yet.");

  const onlineCandidates = await db.query.deliveryPartners.findMany({
    where: and(eq(deliveryPartners.status, "APPROVED"), eq(deliveryPartners.isOnline, true)),
  });

  let nearest: { partnerId: string; userId: string; distanceToShopKm: number } | null = null;
  for (const partner of onlineCandidates) {
    const coords = parseCoordinates(partner.lastLocationLatitude, partner.lastLocationLongitude);
    if (!coords) continue;
    const distanceToShopKm = haversineDistanceKm(shopCoords, coords);
    if (distanceToShopKm > partner.operatingRadiusKm) continue;

    const busy = await db.query.deliveryOrders.findFirst({
      where: and(
        eq(deliveryOrders.deliveryPartnerId, partner.id),
        inArray(deliveryOrders.status, ACTIVE_ASSIGNMENT_STATUSES),
      ),
    });
    if (busy) continue;

    if (!nearest || distanceToShopKm < nearest.distanceToShopKm) {
      nearest = { partnerId: partner.id, userId: partner.userId, distanceToShopKm };
    }
  }

  if (!nearest) throw conflict("No delivery partner is currently available for this order.");

  const customerCoords = parseCoordinates(
    order.deliveryAddressSnapshot?.latitude ?? null,
    order.deliveryAddressSnapshot?.longitude ?? null,
  );
  const legDistanceKm = customerCoords
    ? haversineDistanceKm(shopCoords, customerCoords)
    : nearest.distanceToShopKm;

  const values = {
    deliveryPartnerId: nearest.partnerId,
    status: "OFFERED" as const,
    distanceKm: String(legDistanceKm),
    offeredAt: new Date(),
    acceptedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    cancelledAt: null,
    cancellationReason: null,
    updatedAt: new Date(),
  };

  const [deliveryOrder] = existing
    ? await db
        .update(deliveryOrders)
        .set(values)
        .where(eq(deliveryOrders.id, existing.id))
        .returning()
    : await db
        .insert(deliveryOrders)
        .values({ orderId, ...values })
        .returning();

  await recordAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.DELIVERY_ORDER_OFFERED,
    entityType: "delivery_order",
    entityId: deliveryOrder.id,
    newValue: { orderId, deliveryPartnerId: nearest.partnerId, distanceKm: legDistanceKm },
  });

  await notify({
    userId: nearest.userId,
    type: NOTIFICATION_TYPES.DELIVERY_OFFERED,
    title: "New delivery offer",
    body: `A delivery is available near you (~${legDistanceKm.toFixed(1)} km).`,
    actionUrl: "/delivery-partner",
  });

  return deliveryOrder;
}

/** Cancels any in-flight assignment (if present) and re-runs assignment. Admin/operator manual override. */
export async function reassignOrder(orderId: string, actor: Actor, reason?: string): Promise<DeliveryOrder> {
  const existing = await db.query.deliveryOrders.findFirst({
    where: eq(deliveryOrders.orderId, orderId),
  });
  if (existing && (ACTIVE_ASSIGNMENT_STATUSES as readonly string[]).includes(existing.status)) {
    await db
      .update(deliveryOrders)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason?.trim() || "Reassigned",
        updatedAt: new Date(),
      })
      .where(eq(deliveryOrders.id, existing.id));

    await recordAudit({
      actorId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.DELIVERY_ORDER_CANCELLED,
      entityType: "delivery_order",
      entityId: existing.id,
      previousValue: { status: existing.status },
      newValue: { status: "CANCELLED", reason },
    });
  }

  return assignNearestPartner(orderId, actor);
}

async function loadOwnDeliveryOrder(deliveryOrderId: string, partnerUserId: string): Promise<DeliveryOrder> {
  const row = await db.query.deliveryOrders.findFirst({ where: eq(deliveryOrders.id, deliveryOrderId) });
  if (!row) throw notFound("Delivery assignment");
  const partner = await db.query.deliveryPartners.findFirst({
    where: eq(deliveryPartners.id, row.deliveryPartnerId),
  });
  if (!partner || partner.userId !== partnerUserId) {
    throw forbidden("This delivery assignment does not belong to you.");
  }
  return row;
}

export async function acceptDeliveryOffer(deliveryOrderId: string, partnerUserId: string): Promise<DeliveryOrder> {
  const row = await loadOwnDeliveryOrder(deliveryOrderId, partnerUserId);
  if (row.status !== "OFFERED") throw conflict("This delivery offer is no longer available.");

  const [updated] = await db
    .update(deliveryOrders)
    .set({ status: "ACCEPTED", acceptedAt: new Date(), updatedAt: new Date() })
    .where(eq(deliveryOrders.id, deliveryOrderId))
    .returning();

  await recordAudit({
    actorId: partnerUserId,
    action: AUDIT_ACTIONS.DELIVERY_ORDER_ACCEPTED,
    entityType: "delivery_order",
    entityId: deliveryOrderId,
    newValue: { status: "ACCEPTED" },
  });

  return updated;
}

export async function rejectDeliveryOffer(
  deliveryOrderId: string,
  partnerUserId: string,
  reason?: string,
): Promise<DeliveryOrder> {
  const row = await loadOwnDeliveryOrder(deliveryOrderId, partnerUserId);
  if (row.status !== "OFFERED") throw conflict("This delivery offer is no longer available.");

  const [updated] = await db
    .update(deliveryOrders)
    .set({
      status: "REJECTED",
      cancelledAt: new Date(),
      cancellationReason: reason?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(deliveryOrders.id, deliveryOrderId))
    .returning();

  await recordAudit({
    actorId: partnerUserId,
    action: AUDIT_ACTIONS.DELIVERY_ORDER_REJECTED,
    entityType: "delivery_order",
    entityId: deliveryOrderId,
    newValue: { status: "REJECTED", reason },
  });

  return updated;
}

export async function markPickedUp(deliveryOrderId: string, actor: Actor): Promise<DeliveryOrder> {
  const row = await loadOwnDeliveryOrder(deliveryOrderId, actor.id);
  if (row.status !== "ACCEPTED") {
    throw conflict("This delivery must be accepted before it can be marked picked up.");
  }

  const [updated] = await db
    .update(deliveryOrders)
    .set({ status: "PICKED_UP", pickedUpAt: new Date(), updatedAt: new Date() })
    .where(eq(deliveryOrders.id, deliveryOrderId))
    .returning();

  await updateOrderStatus(row.orderId, "OUT_FOR_DELIVERY", actor);

  await recordAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.DELIVERY_ORDER_PICKED_UP,
    entityType: "delivery_order",
    entityId: deliveryOrderId,
    newValue: { status: "PICKED_UP" },
  });

  return updated;
}

export async function markDelivered(deliveryOrderId: string, actor: Actor): Promise<DeliveryOrder> {
  const row = await loadOwnDeliveryOrder(deliveryOrderId, actor.id);
  if (row.status !== "PICKED_UP") {
    throw conflict("This delivery must be picked up before it can be marked delivered.");
  }

  const [updated] = await db
    .update(deliveryOrders)
    .set({ status: "DELIVERED", deliveredAt: new Date(), updatedAt: new Date() })
    .where(eq(deliveryOrders.id, deliveryOrderId))
    .returning();

  await updateOrderStatus(row.orderId, "DELIVERED", actor);
  await creditDeliveryEarnings(deliveryOrderId);

  await recordAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.DELIVERY_ORDER_DELIVERED,
    entityType: "delivery_order",
    entityId: deliveryOrderId,
    newValue: { status: "DELIVERED" },
  });

  return updated;
}

export interface ActiveDeliveryDetail extends DeliveryOrder {
  orderNumber: string;
  orderTotalPaise: number;
  shopName: string;
  shopAddress: string;
  customerAddress: string | null;
}

/** Enriched view for the delivery-partner dashboard — pickup/drop details a rider needs, no map integration. */
export async function getMyActiveDeliveryDetail(userId: string): Promise<ActiveDeliveryDetail | null> {
  const active = await getMyActiveDeliveryOrder(userId);
  if (!active) return null;

  const [row] = await db
    .select({
      orderNumber: orders.orderNumber,
      orderTotalPaise: orders.totalPaise,
      deliveryAddressSnapshot: orders.deliveryAddressSnapshot,
      shopName: shops.name,
      addressLine1: shops.addressLine1,
      addressLine2: shops.addressLine2,
      city: shops.city,
    })
    .from(orders)
    .innerJoin(shops, eq(orders.shopId, shops.id))
    .where(eq(orders.id, active.orderId));
  if (!row) return null;

  const customerAddress = row.deliveryAddressSnapshot
    ? [row.deliveryAddressSnapshot.line1, row.deliveryAddressSnapshot.area, row.deliveryAddressSnapshot.city]
        .filter(Boolean)
        .join(", ")
    : null;

  return {
    ...active,
    orderNumber: row.orderNumber,
    orderTotalPaise: row.orderTotalPaise,
    shopName: row.shopName,
    shopAddress: [row.addressLine1, row.addressLine2, row.city].filter(Boolean).join(", "),
    customerAddress,
  };
}

export async function getMyActiveDeliveryOrder(userId: string): Promise<DeliveryOrder | null> {
  const partner = await db.query.deliveryPartners.findFirst({ where: eq(deliveryPartners.userId, userId) });
  if (!partner) return null;

  const row = await db.query.deliveryOrders.findFirst({
    where: and(
      eq(deliveryOrders.deliveryPartnerId, partner.id),
      inArray(deliveryOrders.status, ACTIVE_ASSIGNMENT_STATUSES),
    ),
    orderBy: desc(deliveryOrders.offeredAt),
  });
  return row ?? null;
}

export async function listMyDeliveryHistory(userId: string, limit = 30): Promise<DeliveryOrder[]> {
  const partner = await db.query.deliveryPartners.findFirst({ where: eq(deliveryPartners.userId, userId) });
  if (!partner) return [];

  return db
    .select()
    .from(deliveryOrders)
    .where(eq(deliveryOrders.deliveryPartnerId, partner.id))
    .orderBy(desc(deliveryOrders.createdAt))
    .limit(limit);
}

export async function getDeliveryOrderForOrder(orderId: string): Promise<DeliveryOrder | null> {
  const row = await db.query.deliveryOrders.findFirst({ where: eq(deliveryOrders.orderId, orderId) });
  return row ?? null;
}

export interface DeliveryOrderWithPartnerName extends DeliveryOrder {
  partnerName: string;
}

/** Bulk lookup for a list page — avoids one query per order. */
export async function getDeliveryOrdersForOrders(
  orderIds: readonly string[],
): Promise<Map<string, DeliveryOrderWithPartnerName>> {
  if (orderIds.length === 0) return new Map();
  const rows = await db
    .select({
      deliveryOrder: deliveryOrders,
      partnerName: deliveryPartners.fullName,
    })
    .from(deliveryOrders)
    .innerJoin(deliveryPartners, eq(deliveryOrders.deliveryPartnerId, deliveryPartners.id))
    .where(inArray(deliveryOrders.orderId, orderIds));
  return new Map(
    rows.map((row) => [row.deliveryOrder.orderId, { ...row.deliveryOrder, partnerName: row.partnerName }]),
  );
}
