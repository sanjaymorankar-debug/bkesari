/** Admin-managed delivery-partner base/per-km earnings rate. */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { getActiveEarningsConfig, setEarningsConfig } from "@/server/services/delivery-earnings";

const schema = z.object({
  baseFeePaise: z.number().int().min(0),
  perKmFeePaise: z.number().int().min(0),
  note: z.string().max(500).optional(),
});

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requirePermission(PERMISSIONS.DELIVERY_EARNINGS_CONFIG_MANAGE);
  return ok(await getActiveEarningsConfig());
});

export const POST = route(async (request: NextRequest) => {
  const user = await requirePermission(PERMISSIONS.DELIVERY_EARNINGS_CONFIG_MANAGE);
  const body = await parseBody(request, schema);
  return ok(await setEarningsConfig(body, user));
});
