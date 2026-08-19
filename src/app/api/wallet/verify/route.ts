/**
 * Verifies a gateway callback and credits the wallet (requirements §18, §20).
 *
 * The signature is checked server-side before a single paisa moves, and the
 * credit is idempotent on the gateway payment id, so a replayed callback is a
 * no-op rather than a double credit.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route } from "@/server/api/handler";
import { RATE_LIMITS, enforceRateLimit } from "@/server/api/rate-limit";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { verifyAndCreditTopUp } from "@/server/services/payments";

const schema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const POST = route(async (request: NextRequest) => {
  const user = await requirePermission(PERMISSIONS.WALLET_TOPUP_OWN);
  enforceRateLimit(`payment-verify:${user.id}`, RATE_LIMITS.PAYMENT);

  const body = await parseBody(request, schema);
  const result = await verifyAndCreditTopUp({
    userId: user.id,
    gatewayOrderId: body.razorpay_order_id,
    gatewayPaymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  });

  return ok({
    success: true,
    balancePaise: result.balancePaise,
    alreadyProcessed: result.alreadyProcessed,
  });
});
