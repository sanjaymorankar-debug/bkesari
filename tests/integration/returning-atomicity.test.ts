/**
 * A guarded `UPDATE ... RETURNING` must never report a row it did not write.
 *
 * Compare-and-swap guards throughout the services (stock decrements, payment
 * settlement, status transitions) treat an empty RETURNING result as "lost the
 * race" and a returned row as "the write landed". That is only sound if the
 * statement's predicate check, write and RETURNING are one atomic step — which
 * PostgreSQL guarantees natively, re-checking the predicate against the newest
 * row version when a concurrent writer got there first.
 *
 * Runs against real PostgreSQL: the whole point is the locking, which no mock
 * has.
 */
import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { createUser, resetDatabase } from "../helpers/fixtures";

describe("UPDATE ... RETURNING atomicity", () => {
  beforeEach(resetDatabase);

  it("never reports a row it did not write, even when a concurrent writer invalidates the guard", async () => {
    const user = await createUser({ role: "CUSTOMER", name: "original" });

    // A second writer invalidates the guard column partway through the guarded
    // update. pg_sleep() inside the predicate holds the statement open long
    // enough for the window to be real rather than theoretical.
    const interfere = async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      await db
        .update(users)
        .set({ role: "ADMIN" })
        .where(eq(users.id, user.id));
    };

    const [returned] = await Promise.all([
      db
        .update(users)
        .set({ name: "written-by-guarded-update" })
        .where(
          and(
            eq(users.id, user.id),
            eq(users.role, "CUSTOMER"),
            sql`(SELECT true FROM pg_sleep(0.15))`,
          ),
        )
        .returning(),
      interfere(),
    ]);

    const [row] = await db.select().from(users).where(eq(users.id, user.id));

    // Whichever writer wins, the RETURNING answer must match the database: a
    // returned row means the write landed, and no returned row means it did not.
    if (returned.length > 0) {
      expect(row?.name).toBe("written-by-guarded-update");
      expect(returned[0].name).toBe("written-by-guarded-update");
    } else {
      expect(row?.name).toBe("original");
    }
    expect(row?.role).toBe("ADMIN");
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
