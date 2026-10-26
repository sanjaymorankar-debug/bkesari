/**
 * The admin dashboard's money tiles, and the cast they depend on.
 *
 * `src/app/admin/page.tsx` is the only page component that writes raw SQL, and
 * nothing else exercises it: no test renders it and `next build` never runs its
 * queries. A dialect mistake there once made the whole page answer 500 — found
 * by signing in as an admin, not by CI.
 *
 * Two failure modes, one of them silent:
 *   1. SQL from another dialect (e.g. MySQL's `CAST(... AS SIGNED)`) is a
 *      syntax error on PostgreSQL — loud, but only once something runs it.
 *   2. PostgreSQL's `SUM()` over bigint returns NUMERIC, which node-postgres
 *      hands back as a STRING, so a `sql<number>` aggregate without the
 *      `::bigint` cast type-checks, runs clean, and gives the page a string
 *      that only misbehaves downstream. The cast makes it int8, which
 *      src/server/db/index.ts parses to a number.
 */
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { wallets } from "@/server/db/schema";
import { createUserWithWallet, resetDatabase } from "../helpers/fixtures";

beforeEach(resetDatabase);

describe("admin dashboard aggregates", () => {
  it("returns the wallet float as a number, not a NUMERIC string", async () => {
    await createUserWithWallet({ email: "float-a@example.com", balancePaise: 1500 });
    await createUserWithWallet({ email: "float-b@example.com", balancePaise: 2500 });

    // The same expression the dashboard's "Wallet float" tile uses.
    const [row] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${wallets.balancePaise}), 0)::bigint`,
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
        total: sql<number>`COALESCE(SUM(${wallets.balancePaise}), 0)::bigint`,
      })
      .from(wallets);

    expect(row.total).toBe(0);
    expect(typeof row.total).toBe("number");
  });

  it("returns a bare COUNT(*) as a number", async () => {
    await createUserWithWallet({ email: "count-a@example.com" });
    const [row] = await db
      .select({ n: sql<number>`COUNT(*)` })
      .from(wallets);
    expect(row.n).toBe(1);
    expect(typeof row.n).toBe("number");
  });

  it("leaves no MySQL-only SQL anywhere in the dashboard", () => {
    // Guards the reintroduction rather than this one page: MySQL syntax here is
    // invisible to typecheck, lint and the suite until a request renders it.
    const source = readFileSync("src/app/admin/page.tsx", "utf8");
    expect(source).not.toMatch(/AS\s+SIGNED|AS\s+UNSIGNED|CURDATE\(|DATE_SUB\(|IFNULL\(/i);
  });
});
