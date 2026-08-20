/**
 * Reverses a payment recorded in error (§15).
 *
 * There is deliberately no DELETE on a payment anywhere in this API — the only
 * way to undo one is to append its mirror image, which this route does.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route, type RouteContext } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { reversePayment } from "@/server/services/shop-payments";

const schema = z.object({ reason: z.string().min(3).max(500) });

export const POST = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const user = await requirePermission(PERMISSIONS.PAYMENT_RECORD);
    const { reason } = await parseBody(request, schema);
    return ok(await reversePayment(id, reason, user));
  },
);
