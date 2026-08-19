/**
 * Advance an order's status (§41), or cancel with an automatic refund.
 *
 * A shop owner may only move their own shop's orders; operators and admins may
 * move any. Illegal transitions are rejected by the state machine.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { notFound } from "@/lib/errors";
import { ok, parseBody, route, type RouteContext } from "@/server/api/handler";
import { requireShopAccess, requireUser } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { db } from "@/server/db";
import { orders } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { cancelOrder, updateOrderStatus } from "@/server/services/orders";

const schema = z.object({
  status: z.enum([
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
  note: z.string().max(300).optional(),
});

export const PATCH = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const body = await parseBody(request, schema);

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      columns: { id: true, shopId: true, userId: true },
    });
    if (!order) throw notFound("Order");

    if (body.status === "CANCELLED") {
      // A customer may cancel their own order; shop staff may cancel theirs.
      const user = await requireUser();
      if (order.userId !== user.id) {
        await requireShopAccess(order.shopId, {
          anyPermission: PERMISSIONS.ORDER_UPDATE_STATUS_ANY,
        });
      }
      return ok(await cancelOrder(id, user, body.note ?? "Cancelled"));
    }

    const { user } = await requireShopAccess(order.shopId, {
      anyPermission: PERMISSIONS.ORDER_UPDATE_STATUS_ANY,
    });
    return ok(await updateOrderStatus(id, body.status, user, body.note));
  },
);
