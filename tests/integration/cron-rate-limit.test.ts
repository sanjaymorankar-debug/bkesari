/**
 * The cron endpoint checks its token before it counts a request against the
 * rate limit. Until TRUSTED_PROXIES is set, every caller behind a front end
 * that is not on loopback shares one bucket (see clientKey()), so if tokenless
 * requests were counted, anyone could use up the bucket and hold off the
 * scheduler's daily run.
 *
 * Drives the route handler itself against real PostgreSQL (the run generates
 * nothing on an empty database).
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/cron/daily-orders/route";
import { RATE_LIMITS, resetRateLimits } from "@/server/api/rate-limit";
import { resetDatabase } from "../helpers/fixtures";

// Every caller arrives through the same front end, 192.0.2.10, which is not in
// TRUSTED_PROXIES: they all share its bucket, whatever they put first.
function cronRequest(i: number, token?: string): NextRequest {
  const headers = new Headers({ "x-forwarded-for": `203.0.113.${i % 250}, 192.0.2.10` });
  if (token !== undefined) headers.set("authorization", `Bearer ${token}`);
  return new NextRequest("http://localhost/api/cron/daily-orders", { method: "POST", headers });
}

describe("cron endpoint: token before rate limit", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    delete process.env.TRUSTED_PROXIES;
  });

  it("tokenless POSTs get 403, never 429, and cannot hold off the scheduler", async () => {
    const statuses = new Set<number>();
    for (let i = 0; i < RATE_LIMITS.CRON.limit * 2; i += 1) {
      statuses.add((await POST(cronRequest(i))).status);
      statuses.add((await POST(cronRequest(i, "wrong-secret"))).status);
    }
    const run = await POST(cronRequest(0, process.env.CRON_SECRET));
    expect(run.status).toBe(200);
    expect(await run.json()).toMatchObject({ errors: [] });
    expect([...statuses]).toEqual([403]);
  });

  it("still limits calls that carry the token", async () => {
    for (let i = 0; i < RATE_LIMITS.CRON.limit; i += 1) {
      expect((await POST(cronRequest(i, process.env.CRON_SECRET))).status).toBe(200);
    }
    expect((await POST(cronRequest(99, process.env.CRON_SECRET))).status).toBe(429);
  });
});
