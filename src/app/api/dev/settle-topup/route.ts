/**
 * Development-only mock gateway settlement.
 *
 * Signs a payment with the mock secret and pushes it through the SAME
 * verify-then-credit path production uses, so the flow under test is the real
 * one rather than a shortcut that skips verification.
 *
 * Returns 404 in production and whenever live Razorpay credentials are present.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getEnv, isPaymentGatewayLive } from "@/lib/env";
import { notFound } from "@/lib/errors";
import { ok, parseBody, route } from "@/server/api/handler";
import { RATE_LIMITS, enforceRateLimit } from "@/server/api/rate-limit";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { signForMock, verifyAndCreditTopUp } from "@/server/services/payments";

const schema = z.object({ gatewayOrderId: z.string().min(1) });

export const POST = route(async (request: NextRequest) => {
  if (getEnv().NODE_ENV === "production" || isPaymentGatewayLive()) {
    throw notFound("Endpoint");
  }

  const user = await requirePermission(PERMISSIONS.WALLET_TOPUP_OWN);
  enforceRateLimit(`dev-settle:${user.id}`, RATE_LIMITS.PAYMENT);

  const { gatewayOrderId } = await parseBody(request, schema);
  const gatewayPaymentId = `mock_pay_${gatewayOrderId.slice(-12)}`;

  const result = await verifyAndCreditTopUp({
    userId: user.id,
    gatewayOrderId,
    gatewayPaymentId,
    signature: signForMock(gatewayOrderId, gatewayPaymentId),
  });

  return ok({
    success: true,
    balancePaise: result.balancePaise,
    alreadyProcessed: result.alreadyProcessed,
  });
});
