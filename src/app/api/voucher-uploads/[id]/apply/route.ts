/** Voucher list upload — phase two: confirm and create (§16). */
import type { NextRequest } from "next/server";

import { ok, route, type RouteContext } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { applyVoucherUpload } from "@/server/services/vouchers";

export const POST = route(
  async (_request: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const user = await requirePermission(PERMISSIONS.VOUCHER_UPLOAD);
    return ok(await applyVoucherUpload(id, user));
  },
);
