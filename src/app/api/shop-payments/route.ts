/**
 * Registration-fee payments (§3, §4.2, §15).
 *
 * Reads are scoped by capability: an owner sees their own shop's history, an
 * operator/admin sees any. Writes require PAYMENT_RECORD — an owner can never
 * record a payment against their own fee.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { forbidden } from "@/lib/errors";
import { ok, parseBody, route } from "@/server/api/handler";
import { requirePermission, requireShopAccess, requireUser } from "@/server/authz/guards";
import { can, PERMISSIONS } from "@/server/authz/permissions";
import {
  listAllPayments,
  listPaymentsForShop,
  recordPayment,
} from "@/server/services/shop-payments";

const schema = z.object({
  shopId: z.string().uuid(),
  paymentType: z.enum(["REGISTRATION_FEE", "RENEWAL", "ADJUSTMENT", "REFUND"]),
  amountPaise: z.number().int().positive(),
  method: z
    .enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "RAZORPAY", "OTHER"])
    .optional(),
  transactionId: z.string().max(120).nullish(),
  paidAt: z.coerce.date().optional(),
  note: z.string().max(500).nullish(),
});

export const GET = route(async (request: NextRequest) => {
  const user = await requireUser();
  const shopId = new URL(request.url).searchParams.get("shopId");

  if (shopId) {
    // requireShopAccess covers both cases: the owner passes on ownership, an
    // operator/admin on PAYMENT_VIEW_ANY.
    await requireShopAccess(shopId, {
      anyPermission: PERMISSIONS.PAYMENT_VIEW_ANY,
    });
    return ok({ payments: await listPaymentsForShop(shopId) });
  }

  if (!can(user.role, PERMISSIONS.PAYMENT_VIEW_ANY)) {
    throw forbidden("Specify a shop to view its payment history.");
  }
  return ok({ payments: await listAllPayments() });
});

export const POST = route(async (request: NextRequest) => {
  const user = await requirePermission(PERMISSIONS.PAYMENT_RECORD);
  const body = await parseBody(request, schema);
  return ok(await recordPayment(body, user), 201);
});
