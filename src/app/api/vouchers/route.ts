/** Voucher list (admin/operator) and creation (admin only, §37). */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { createVoucher, listVouchers } from "@/server/services/vouchers";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    name: z.string().min(3).max(120),
    code: z.string().max(32).nullish(),
    description: z.string().max(1000).nullish(),
    termsAndConditions: z.string().max(2000).nullish(),
    applyMode: z.enum(["CODE", "AUTO_APPLY"]).optional(),
    bonusPercent: z.number().int().positive().max(100),
    minimumTopupPaise: z.number().int().min(0).optional(),
    maximumBonusPaise: z.number().int().min(0).nullish(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    usageLimit: z.number().int().positive().nullish(),
    perCustomerLimit: z.number().int().positive().optional(),
    totalBudgetPaise: z.number().int().min(0).nullish(),
  })
  .transform((v) => ({
    ...v,
    maximumBonusPaise: v.maximumBonusPaise ?? null,
    usageLimit: v.usageLimit ?? null,
    totalBudgetPaise: v.totalBudgetPaise ?? null,
  }));

export const GET = route(async (request: NextRequest) => {
  await requirePermission(PERMISSIONS.VOUCHER_VIEW);
  const p = new URL(request.url).searchParams;
  const vouchers = await listVouchers({
    search: p.get("q") ?? undefined,
    status: (p.get("status") as never) ?? undefined,
  });
  return ok({ vouchers });
});

export const POST = route(async (request: NextRequest) => {
  const user = await requirePermission(PERMISSIONS.VOUCHER_MANAGE);
  const body = await parseBody(request, schema);
  return ok(await createVoucher(body, user), 201);
});
