/** The signed-in user's own delivery-partner application/profile. */
import { ok, route } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { getMyDeliveryPartnerProfile } from "@/server/services/delivery-partners";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requirePermission(PERMISSIONS.DELIVERY_PARTNER_VIEW_OWN);
  return ok(await getMyDeliveryPartnerProfile(user.id));
});
