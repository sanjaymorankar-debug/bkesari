/**
 * Confirms a Cashfree order and credits the wallet (requirements §18, §20).
 *
 * Nothing the client posts here is trusted as proof of payment — only which
 * order to check. The actual confirmation comes from a server-to-server call
 * to Cashfree's own API (see `verifyAndCreditTopUp`), and the credit is
 * idempotent on the gateway payment id, so a replayed call is a no-op rather
 * than a double credit.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route } from "@/server/api/handler";
import { RATE_LIMITS, enforceRateLimit } from "@/server/api/rate-limit";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { verifyAndCreditTopUp } from "@/server/services/payments";

const schema = z.object({
  gatewayOrderId: z.string().min(1),
});

export const POST = route(async (request: NextRequest) => {
  const user = await requirePermission(PERMISSIONS.WALLET_TOPUP_OWN);
  enforceRateLimit(`payment-verify:${user.id}`, RATE_LIMITS.PAYMENT);

  const body = await parseBody(request, schema);
  const result = await verifyAndCreditTopUp({
    userId: user.id,
    gatewayOrderId: body.gatewayOrderId,
  });

  return ok({
    success: true,
    balancePaise: result.balancePaise,
    alreadyProcessed: result.alreadyProcessed,
    voucherBonusPaise: result.voucherBonusPaise,
  });
});
