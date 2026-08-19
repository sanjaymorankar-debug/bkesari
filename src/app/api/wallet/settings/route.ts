/** Low-balance threshold and auto-recharge preferences (§24, §38). */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { updateWalletSettings } from "@/server/services/wallet";

const schema = z.object({
  lowBalanceThresholdPaise: z.number().int().min(0).optional(),
  autoRechargeEnabled: z.boolean().optional(),
  autoRechargeTriggerPaise: z.number().int().min(0).nullish(),
  autoRechargeAmountPaise: z.number().int().min(0).nullish(),
});

export const PATCH = route(async (request: NextRequest) => {
  const user = await requirePermission(PERMISSIONS.WALLET_VIEW_OWN);
  const body = await parseBody(request, schema);
  return ok(await updateWalletSettings(user.id, body));
});
