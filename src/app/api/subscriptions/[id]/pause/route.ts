/** Pause deliveries over a date window (requirement §31). */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { assertIsoDate } from "@/lib/dates";
import { ok, parseBody, route, type RouteContext } from "@/server/api/handler";
import { requireSubscriptionAccess } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { pauseSubscription } from "@/server/services/subscriptions";

const schema = z.object({ from: z.string(), until: z.string() });

export const POST = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const { user } = await requireSubscriptionAccess(id, {
      anyPermission: PERMISSIONS.SUBSCRIPTION_MANAGE_ANY,
    });
    const body = await parseBody(request, schema);
    return ok(
      await pauseSubscription(
        id,
        assertIsoDate(body.from),
        assertIsoDate(body.until),
        user,
      ),
    );
  },
);
