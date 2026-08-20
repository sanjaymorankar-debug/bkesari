/** Publish or reject a shop-owner-created product into the central catalogue. */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route, type RouteContext } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { approveProduct, rejectProduct } from "@/server/services/catalogue";

const schema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().max(500).nullish(),
  })
  .refine((v) => v.decision !== "REJECTED" || Boolean(v.reason), {
    message: "A reason is required to reject a product.",
    path: ["reason"],
  });

export const POST = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const user = await requirePermission(PERMISSIONS.PRODUCT_APPROVE);
    const body = await parseBody(request, schema);

    return ok(
      body.decision === "REJECTED"
        ? await rejectProduct(id, body.reason as string, user)
        : await approveProduct(id, user),
    );
  },
);
