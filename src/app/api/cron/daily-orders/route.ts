/**
 * Daily subscription order generation (requirement §33).
 *
 * Triggered by any external scheduler:
 *   curl -X POST https://<host>/api/cron/daily-orders \
 *        -H "Authorization: Bearer $CRON_SECRET"
 *
 * Safe to call repeatedly — generation is idempotent per (subscription, date),
 * so an overlapping or retried run cannot double-charge. A `date` may be passed
 * to backfill or replay a specific day.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { assertIsoDate } from "@/lib/dates";
import { getEnv } from "@/lib/env";
import { forbidden } from "@/lib/errors";
import { ok, parseBody, route } from "@/server/api/handler";
import { RATE_LIMITS, clientKey, enforceRateLimit } from "@/server/api/rate-limit";
import { generateDailyOrders } from "@/server/services/subscriptions";

const bodySchema = z.object({
  date: z.string().optional(),
  subscriptionIds: z.array(z.string().uuid()).optional(),
});

/** Timing-safe bearer-token comparison. */
function assertAuthorized(request: NextRequest): void {
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = getEnv().CRON_SECRET;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) throw forbidden("Invalid cron credentials.");

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  if (diff !== 0) throw forbidden("Invalid cron credentials.");
}

export const POST = route(async (request: NextRequest) => {
  enforceRateLimit(clientKey(request, "cron"), RATE_LIMITS.CRON);
  assertAuthorized(request);

  const body = await parseBody(request, bodySchema).catch(() => ({
    date: undefined,
    subscriptionIds: undefined,
  }));

  const date = body.date ? assertIsoDate(body.date) : undefined;
  const result = await generateDailyOrders(date, {
    subscriptionIds: body.subscriptionIds,
  });

  console.info("[cron:daily-orders]", JSON.stringify(result));
  return ok(result);
});

/** Health probe so a scheduler can verify wiring without generating anything. */
export const GET = route(async (request: NextRequest) => {
  assertAuthorized(request);
  return ok({ status: "ready", timezone: getEnv().APP_TIMEZONE });
});
