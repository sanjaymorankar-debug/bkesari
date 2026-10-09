/**
 * The admin dashboard's money tiles, and the cast they depend on.
 *
 * `src/app/admin/page.tsx` is the only page component that writes raw SQL, and
 * nothing exercised it: no test rendered it and `next build` never runs its
 * queries. So the MySQL port left two PostgreSQL `::bigint` casts there and the
 * whole page answered 500 — found by signing in as an admin against a local
 * MySQL, not by CI.
 *
 * Two failure modes, one of them silent:
 *   1. `::bigint` is a syntax error on MySQL — loud, once something runs it.
 *   2. mysql2 returns DECIMAL (and so every bare `SUM()`) as a STRING, so a
 *      `sql<number>` aggregate without `CAST(… AS SIGNED)` type-checks, runs
 *      clean, and hands the page a string that only misbehaves downstream.
 */
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { wallets } from "@/server/db/schema";
import { createUserWithWallet, resetDatabase } from "../helpers/fixtures";

beforeEach(resetDatabase);

describe("admin dashboard aggregates", () => {
  it("returns the wallet float as a number, not a DECIMAL string", async () => {
    await createUserWithWallet({ email: "float-a@example.com", balancePaise: 1500 });
    await createUserWithWallet({ email: "float-b@example.com", balancePaise: 2500 });

    // The same expression the dashboard's "Wallet float" tile uses.
    const [row] = await db
      .select({
        total: sql<number>`CAST(COALESCE(SUM(${wallets.balancePaise}), 0) AS SIGNED)`,
      })
      .from(wallets);

    expect(row.total).toBe(4000);
    // The point of the cast: without it this is the string "4000", which
    // passes a `toBe(4000)` only by accident of coercion elsewhere.
    expect(typeof row.total).toBe("number");
  });

  it("still returns a number when there are no rows to sum", async () => {
    const [row] = await db
      .select({
        total: sql<number>`CAST(COALESCE(SUM(${wallets.balancePaise}), 0) AS SIGNED)`,
      })
      .from(wallets);

    expect(row.total).toBe(0);
    expect(typeof row.total).toBe("number");
  });

  it("leaves no PostgreSQL `::type` cast anywhere in the dashboard", () => {
    // Guards the reintroduction rather than this one page: a `::bigint` here
    // is invisible to typecheck, lint and the suite until a request renders it.
    const source = readFileSync("src/app/admin/page.tsx", "utf8");
    expect(source).not.toMatch(/::(?:big)?int|::numeric|::decimal|::text/);
  });
});
