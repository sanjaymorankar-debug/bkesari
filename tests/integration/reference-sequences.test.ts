/**
 * Human-readable reference numbers (BKS-, P, GRV-) come from `nextval()` in a
 * column DEFAULT, so callers never supply one. Two concurrent inserts must
 * never get the same number, because a unique index would reject the second
 * insert and the caller would see an error rather than a retry. These tests
 * fire the inserts at the same time on separate pool connections, so a
 * read-max-then-add allocation would collide.
 *
 * Runs against real PostgreSQL: sequences and concurrency are what these tests
 * check, and no mock has either.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { grievances } from "@/server/db/schema";
import {
  createCategory,
  createProduct,
  createShop,
  createUser,
  resetDatabase,
} from "../helpers/fixtures";

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

  it("gives concurrent grievances distinct ticket numbers", async () => {
    const created = await Promise.all(
      Array.from({ length: 5 }, async (_, i) => {
        const [row] = await db
          .insert(grievances)
          .values({
            name: `Complainant ${i}`,
            email: `grievance-${i}@test.local`,
            subject: "Late delivery",
            description: "Concurrent ticket allocation check.",
          })
          .returning();
        return row;
      }),
    );

    const tickets = created.map((g) => g.ticketNumber);
    expect(new Set(tickets).size).toBe(tickets.length);
    for (const t of tickets) expect(t).toMatch(/^GRV-\d{6}$/);
  });
});
