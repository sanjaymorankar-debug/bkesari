/** Order history for the signed-in customer (§41). */
import { ok, route } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { listOrdersForUser } from "@/server/services/orders";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requirePermission(PERMISSIONS.ORDER_VIEW_OWN);
  return ok(await listOrdersForUser(user.id));
});
