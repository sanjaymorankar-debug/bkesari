/**
 * Delivery-window feasibility (delivery-system Part 58 follow-up, Slice C).
 *
 * "Do not promise a delivery window unless the system determines that the
 * order can reasonably be fulfilled within that window" (§6, §21). This is
 * a Phase 1 approximation on purpose: straight-line Haversine distance to
 * the nearest online, approved, in-range delivery partner, converted to a
 * travel-time estimate with a flat assumed speed — not a real Google
 * Routes/Distance Matrix call. That's explicitly deferred to Phase 2, once
 * multi-order batching needs actual route sequencing to justify the cost
 * (see MAPS_USAGE.md).
 */
import { and, eq, isNull } from "drizzle-orm";

import { haversineDistanceKm, parseCoordinates } from "@/lib/geo/haversine";
import { db } from "@/server/db";
import { deliveryOrders, deliveryPartners, shops } from "@/server/db/schema";

/** Phase 1 placeholder for real travel-time estimation — see file header. */
const ASSUMED_AVERAGE_SPEED_KMH = 20;

export interface DeliveryWindowFeasibility {
  EXPRESS_30: boolean;
  STANDARD_60: boolean;
  /** Scheduled delivery doesn't depend on a rider being online right now. */
  SCHEDULED: boolean;
  nearestPartnerDistanceKm: number | null;
  estimatedMinutes: number | null;
}

const INFEASIBLE_NO_SCHEDULE: DeliveryWindowFeasibility = {
  EXPRESS_30: false,
  STANDARD_60: false,
  SCHEDULED: false,
  nearestPartnerDistanceKm: null,
  estimatedMinutes: null,
};

/**
 * A delivery partner is eligible for a shop's orders when they're online,
 * approved, and the shop falls within their own declared operating radius —
 * not a shop-level radius (that's Phase 2's zone system; see the plan's
 * "Explicitly NOT in this plan" note).
 */
async function findEligiblePartners(shopLatLng: { latitude: number; longitude: number }) {
  const candidates = await db.query.deliveryPartners.findMany({
    where: and(
      eq(deliveryPartners.status, "APPROVED"),
      eq(deliveryPartners.isOnline, true),
      isNull(deliveryPartners.deletedAt),
    ),
  });

  return candidates
    .map((partner) => {
      const coords = parseCoordinates(partner.lastLocationLatitude, partner.lastLocationLongitude);
      if (!coords) return null;
      const distanceKm = haversineDistanceKm(shopLatLng, coords);
      if (distanceKm > partner.operatingRadiusKm) return null;
      return { partner, distanceToShopKm: distanceKm };
    })
    .filter((v): v is { partner: typeof candidates[number]; distanceToShopKm: number } => v !== null)
    .sort((a, b) => a.distanceToShopKm - b.distanceToShopKm);
}

export async function getFeasibleDeliveryWindows(shopId: string): Promise<DeliveryWindowFeasibility> {
  const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) });
  if (!shop || !shop.deliveryAvailable) return INFEASIBLE_NO_SCHEDULE;

  const shopCoords = parseCoordinates(shop.latitude, shop.longitude);
  // No verified shop location on file yet — cannot judge live feasibility,
  // but scheduled delivery (coordinated directly, not distance-gated) is
  // still offerable.
  if (!shopCoords) {
    return { ...INFEASIBLE_NO_SCHEDULE, SCHEDULED: true };
  }

  const eligible = await findEligiblePartners(shopCoords);
  // Excludes a partner already carrying an active delivery — approximated
  // here by checking their open deliveryOrders rather than a workload
  // counter, since Phase 1 caps everyone at one order at a time (no
  // batching yet).
  const available: typeof eligible = [];
  for (const candidate of eligible) {
    const activeAssignment = await db.query.deliveryOrders.findFirst({
      where: and(
        eq(deliveryOrders.deliveryPartnerId, candidate.partner.id),
        eq(deliveryOrders.status, "ACCEPTED"),
      ),
    });
    if (!activeAssignment) available.push(candidate);
  }

  if (available.length === 0) {
    return { ...INFEASIBLE_NO_SCHEDULE, SCHEDULED: true };
  }

  const nearestKm = available[0].distanceToShopKm;
  const travelMinutes = (nearestKm / ASSUMED_AVERAGE_SPEED_KMH) * 60;
  const totalMinutes = shop.preparationTimeMinutes + travelMinutes;

  return {
    EXPRESS_30: totalMinutes <= 30,
    STANDARD_60: totalMinutes <= 60,
    SCHEDULED: true,
    nearestPartnerDistanceKm: nearestKm,
    estimatedMinutes: Math.ceil(totalMinutes),
  };
}

export const DELIVERY_WINDOW_MINUTES: Record<"EXPRESS_30" | "STANDARD_60", number> = {
  EXPRESS_30: 30,
  STANDARD_60: 60,
};
