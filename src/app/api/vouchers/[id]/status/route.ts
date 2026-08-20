/** Activate or pause a voucher (admin only, §37). */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route, type RouteContext } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { setVoucherStatus } from "@/server/services/vouchers";

const schema = z.object({ status: z.enum(["ACTIVE", "PAUSED"]) });

export const POST = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const user = await requirePermission(PERMISSIONS.VOUCHER_MANAGE);
    const { status } = await parseBody(request, schema);
    return ok(await setVoucherStatus(id, status, user));
  },
);
