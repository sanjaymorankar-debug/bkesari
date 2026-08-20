/** Voucher redemption report, filterable (§31). */
import type { NextRequest } from "next/server";

import { ok, route } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { listRedemptions } from "@/server/services/vouchers";

export const dynamic = "force-dynamic";

export const GET = route(async (request: NextRequest) => {
  await requirePermission(PERMISSIONS.VOUCHER_VIEW);
  const p = new URL(request.url).searchParams;
  const redemptions = await listRedemptions({
    voucherId: p.get("voucherId") ?? undefined,
    userId: p.get("userId") ?? undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
  });
  return ok({ redemptions });
});
