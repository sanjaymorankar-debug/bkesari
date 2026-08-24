/**
 * Delivery-partner actions on a single delivery assignment (delivery-system
 * Part 58, Slice C) — accept, reject, pick up, deliver. Deliberately a
 * separate endpoint from /api/orders/[id]/status, which is the existing,
 * unmodified shop-owner order-status flow.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route, type RouteContext } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import {
  acceptDeliveryOffer,
  markDelivered,
  markPickedUp,
  rejectDeliveryOffer,
} from "@/server/services/delivery-assignment";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("reject"), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal("pickup") }),
  z.object({ action: z.literal("deliver") }),
]);

export const PATCH = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const user = await requirePermission(PERMISSIONS.DELIVERY_ORDER_MANAGE_OWN);
    const { id } = await context.params;
    const body = await parseBody(request, schema);

    switch (body.action) {
      case "accept":
        return ok(await acceptDeliveryOffer(id, user.id));
      case "reject":
        return ok(await rejectDeliveryOffer(id, user.id, body.reason));
      case "pickup":
        return ok(await markPickedUp(id, user));
      case "deliver":
        return ok(await markDelivered(id, user));
    }
  },
);
