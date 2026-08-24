/**
 * The one server-side Google Geocoding call in the location-capture flow
 * (delivery-system Part 58 follow-up). Called only from the map picker's
 * "Confirm location" action — never on page load, search, or any read path.
 * See src/server/services/geocoding.ts for the cost-optimization rationale.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route } from "@/server/api/handler";
import { RATE_LIMITS, enforceRateLimit } from "@/server/api/rate-limit";
import { requireUser } from "@/server/authz/guards";
import { verifyLocation } from "@/server/services/geocoding";

const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  purpose: z.string().min(1).max(50),
});

export const POST = route(async (request: NextRequest) => {
  const user = await requireUser();
  enforceRateLimit(`geo-verify:${user.id}`, RATE_LIMITS.MUTATION);

  const body = await parseBody(request, schema);
  const result = await verifyLocation({
    latitude: body.latitude,
    longitude: body.longitude,
    purpose: body.purpose,
    entityType: "user",
    entityId: user.id,
  });
  return ok(result);
});
