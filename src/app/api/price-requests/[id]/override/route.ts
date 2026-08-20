/** Admin override: force a proposed price live without owner approval (§11). */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route, type RouteContext } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { overrideRequest } from "@/server/services/price-requests";

const schema = z.object({ reason: z.string().max(500).nullish() });

export const POST = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const user = await requirePermission(PERMISSIONS.PRICE_REQUEST_OVERRIDE);
    const { reason } = await parseBody(request, schema);

    await overrideRequest(id, user, reason);
    return ok({ overridden: true });
  },
);
