/** Admin voucher dashboard (§30). */
import { ok, route } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { getVoucherDashboard } from "@/server/services/vouchers";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requirePermission(PERMISSIONS.VOUCHER_VIEW);
  return ok(await getVoucherDashboard());
});
