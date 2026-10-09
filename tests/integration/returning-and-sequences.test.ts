/**
 * Native `RETURNING` and database sequences — the two PostgreSQL features the
 * services lean on for atomicity.
 *
 *  - Compare-and-swap guards (`UPDATE … WHERE status = 'CREATED' RETURNING *`)
 *    rely on an empty result meaning "another writer got here first". That only
 *    holds if a statement that blocks behind a concurrent writer re-checks its
 *    WHERE against the committed row before reporting it, which PostgreSQL does
 *    under READ COMMITTED.
 *  - Reference numbers (BKS-/P/GRV-) are allocated by `nextval()` in a column
 *    DEFAULT, so concurrent inserts can never be handed the same number and
 *    callers never supply one.
 *
 * Runs against real PostgreSQL: the whole point is the locking, which no mock
 * has.
 */
import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import {
  createCategory,
  createProduct,
  createShop,
  createUser,
  resetDatabase,
} from "../helpers/fixtures";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("UPDATE … RETURNING atomicity", () => {
  beforeEach(resetDatabase);

  it("reports a row from a compare-and-swap only when its own write landed", async () => {
    const user = await createUser({ role: "CUSTOMER", name: "original" });
    const guard = and(eq(users.id, user.id), eq(users.role, "CUSTOMER"));

    // The first writer takes the row lock and holds it open; the second blocks
    // behind it and must then see that the guard no longer holds.
    const [first, second] = await Promise.all([
      db.transaction(async (tx) => {
        const rows = await tx
          .update(users)
          .set({ role: "ADMIN", name: "first" })
          .where(guard)
          .returning();
        await tx.execute(sql`SELECT pg_sleep(0.15)`);
        return rows;
      }),
      (async () => {
        await sleep(40);
        return db
          .update(users)
          .set({ role: "OPERATOR", name: "second" })
          .where(guard)
          .returning();
      })(),
    ]);

    const [row] = await db.select().from(users).where(eq(users.id, user.id));

    // Exactly one writer wins, and its RETURNING matches what is stored.
    expect(first.length + second.length).toBe(1);
    const winner = first[0] ?? second[0];
    expect(row?.name).toBe(winner.name);
    expect(row?.role).toBe(winner.role);
  });

  it("discards a RETURNING write when the surrounding transaction rolls back", async () => {
    const user = await createUser({ name: "before" });

    await expect(
      db.transaction(async (tx) => {
        const rows = await tx
          .update(users)
          .set({ name: "inside-tx" })
          .where(eq(users.id, user.id))
          .returning();
        expect(rows[0]?.name).toBe("inside-tx");
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");

    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row?.name).toBe("before");
  });
});

describe("reference-number sequences", () => {
  beforeEach(resetDatabase);

  it("gives concurrent product inserts distinct, well-formed codes", async () => {
    const category = await createCategory();
    const created = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createProduct(category.id, { name: `Seq Product ${i}` }),
      ),
    );

    const codes = created.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^P\d{5}$/);
  });

  it("gives concurrent shop inserts distinct registration numbers", async () => {
    const owner = await createUser({ role: "SHOP_OWNER" });
    const created = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createShop(owner.id, { name: `Seq Shop ${i}` }),
      ),
    );

    const numbers = created.map((s) => s.registrationNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    for (const n of numbers) expect(n).toMatch(/^BKS-\d{6}$/);
  });
});
