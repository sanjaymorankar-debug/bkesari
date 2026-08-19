/** Upcoming delivery calendar with overrides applied (requirement §36). */
import type { NextRequest } from "next/server";

import { ok, route, type RouteContext } from "@/server/api/handler";
import { requireSubscriptionAccess } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { getCalendar } from "@/server/services/subscriptions";

export const dynamic = "force-dynamic";

export const GET = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    await requireSubscriptionAccess(id, {
      anyPermission: PERMISSIONS.SUBSCRIPTION_MANAGE_ANY,
    });
    const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
    return ok(await getCalendar(id, Math.min(Math.max(days, 1), 90)));
  },
);
