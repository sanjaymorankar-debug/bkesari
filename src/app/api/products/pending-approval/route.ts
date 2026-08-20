/** Admin queue: products a shop owner created, awaiting central-catalogue publish. */
import { ok, route } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { listPendingProductApprovals } from "@/server/services/catalogue";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requirePermission(PERMISSIONS.PRODUCT_APPROVE);
  return ok({ products: await listPendingProductApprovals() });
});
