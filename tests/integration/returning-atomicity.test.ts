/**
 * The RETURNING helpers must never report a row they did not write.
 *
 * Each helper replaces one atomic `UPDATE ... RETURNING` with several
 * statements, which is only equivalent while nothing else can write in between.
 * An earlier version left that to the caller, and most callers pass the pool
 * handle rather than a transaction — so a concurrent writer could invalidate the
 * predicate after the ids were read, and the helper still returned the row.
 *
 * Runs against real MySQL: the whole point is the locking, which no mock has.
 */
import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { updateReturning } from "@/server/db/returning";
import { createUser, resetDatabase } from "../helpers/fixtures";

describe("RETURNING helper atomicity", () => {
  beforeEach(resetDatabase);

  it("never reports a row it did not write, even when passed the pool handle", async () => {
    const user = await createUser({ role: "CUSTOMER", name: "original" });

    // A second writer invalidates the guard column partway through the helper's
    // sequence. SLEEP() inside the predicate holds the helper open long enough
    // for the window to be real rather than theoretical.
    const interfere = async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      await db
        .update(users)
        .set({ role: "ADMIN" })
        .where(eq(users.id, user.id));
    };

    const [returned] = await Promise.all([
      updateReturning(
        db,
        users,
        { name: "written-by-helper" },
        and(
          eq(users.id, user.id),
          eq(users.role, "CUSTOMER"),
          sql`SLEEP(0.15) = 0`,
        ),
      ),
      interfere(),
    ]);

    const [row] = await db.select().from(users).where(eq(users.id, user.id));

    // Whichever writer wins, the helper's answer must match the database: a
    // returned row means the write landed, and no returned row means it did not.
    if (returned.length > 0) {
      expect(row?.name).toBe("written-by-helper");
      expect(returned[0].name).toBe("written-by-helper");
    } else {
      expect(row?.name).toBe("original");
    }
  });

  it("reuses a caller's transaction instead of nesting one", async () => {
    const user = await createUser({ name: "before" });

    // Inside an explicit transaction the helper must use it, and a rollback must
    // still discard the helper's write.
    await expect(
      db.transaction(async (tx) => {
        const rows = await updateReturning(
          tx,
          users,
          { name: "inside-tx" },
          eq(users.id, user.id),
        );
        expect(rows[0]?.name).toBe("inside-tx");
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");

    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row?.name).toBe("before");
  });
});
