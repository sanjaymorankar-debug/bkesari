/** Skip one delivery — no order, no deduction (requirement §30). */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { assertIsoDate } from "@/lib/dates";
import { ok, parseBody, route, type RouteContext } from "@/server/api/handler";
import { requireSubscriptionAccess } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { skipDate } from "@/server/services/subscriptions";

const schema = z.object({ date: z.string() });

export const POST = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const { user } = await requireSubscriptionAccess(id, {
      anyPermission: PERMISSIONS.SUBSCRIPTION_MANAGE_ANY,
    });
    const body = await parseBody(request, schema);
    return ok(await skipDate(id, assertIsoDate(body.date), user));
  },
);
