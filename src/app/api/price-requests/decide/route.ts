/**
 * Approve or reject proposed price changes (§2.4).
 *
 * Authorisation lives in the service (`assertMayDecide`), because the rule is
 * per-shop — the owner of the shop the request targets, or an admin. The route
 * only requires that the caller can decide *something*.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route } from "@/server/api/handler";
import { requireAnyPermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { decideBatch, decideRequests } from "@/server/services/price-requests";

const schema = z
  .object({
    requestIds: z.array(z.string().uuid()).max(1000).optional(),
    batchId: z.string().uuid().optional(),
    decision: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.string().max(500).nullish(),
  })
  .refine((v) => Boolean(v.requestIds?.length) !== Boolean(v.batchId), {
    message: "Supply either requestIds or batchId, not both.",
  });

export const POST = route(async (request: NextRequest) => {
  const user = await requireAnyPermission([
    PERMISSIONS.PRICE_REQUEST_DECIDE_OWN,
    PERMISSIONS.PRICE_REQUEST_DECIDE_ANY,
  ]);
  const body = await parseBody(request, schema);

  const result = body.batchId
    ? await decideBatch(body.batchId, body.decision, user, body.rejectionReason)
    : await decideRequests(
        {
          requestIds: body.requestIds ?? [],
          decision: body.decision,
          rejectionReason: body.rejectionReason,
        },
        user,
      );

  return ok(result);
});
