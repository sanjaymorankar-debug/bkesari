/**
 * Delivery-window feasibility preview (delivery-system Part 58, Slice C).
 * Public — a checkout-time read, never promising a window the system can't
 * actually back (see delivery-feasibility.ts).
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseQuery, route } from "@/server/api/handler";
import { getFeasibleDeliveryWindows } from "@/server/services/delivery-feasibility";

const schema = z.object({ shopId: z.string().uuid() });

export const dynamic = "force-dynamic";

export const GET = route(async (request: NextRequest) => {
  const { shopId } = parseQuery(request, schema);
  return ok(await getFeasibleDeliveryWindows(shopId));
});
