/**
 * MySQL has no `RETURNING` clause, which Postgres provided and this codebase
 * relied on in ~90 places. These helpers reproduce it.
 *
 * Reading rows back costs an extra round trip, so the shape of each helper is
 * chosen to preserve the *semantics* the Postgres version had, which differ
 * between two kinds of update:
 *
 *  - A plain update, whose WHERE tests columns the update does not change.
 *    Re-reading the same WHERE afterwards is exact.
 *  - A compare-and-swap guard, whose WHERE tests a column the update DOES
 *    change (`SET status='SUCCESS' WHERE status='CREATED'`). Re-reading that
 *    WHERE afterwards matches nothing, and an empty result is precisely what
 *    callers use to detect a lost race. Those callers need
 *    `updateReturningIfChanged`, which reports whether the guarded statement
 *    actually applied.
 *
 * Both run the guarded UPDATE as a single statement, so the atomicity the
 * Postgres version had is kept — the ids are only used to read rows back.
 */
import { and, eq, inArray, type SQL } from "drizzle-orm";
import type {
  AnyMySqlColumn,
  MySqlTable,
  MySqlUpdateSetSource,
} from "drizzle-orm/mysql-core";

import type { DbClient } from "./index";

/** A table this module can read rows back from — it needs a single-column id. */
type Identifiable = MySqlTable & { id: AnyMySqlColumn };

/** mysql2 reports the row count on the result header of a write. */
function affectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
}

/**
 * `INSERT ... RETURNING *`.
 *
 * Ids are generated here rather than by the database so the inserted rows can
 * be read back: MySQL's `LAST_INSERT_ID()` only covers AUTO_INCREMENT keys, and
 * every id in this schema is an application-generated UUID string.
 */
export async function insertReturning<T extends Identifiable>(
  exec: DbClient,
  table: T,
  values: T["$inferInsert"] | T["$inferInsert"][],
): Promise<T["$inferSelect"][]> {
  const rows = (Array.isArray(values) ? values : [values]).map((row) => {
    const withId = row as Record<string, unknown>;
    return withId.id === undefined
      ? { ...withId, id: crypto.randomUUID() }
      : withId;
  }) as T["$inferInsert"][];
  if (rows.length === 0) return [];

  await exec.insert(table).values(rows);

  const ids = rows.map((row) => (row as { id: string }).id);
  return exec.select().from(table).where(inArray(table.id, ids)) as Promise<
    T["$inferSelect"][]
  >;
}

/**
 * `UPDATE ... RETURNING *` for an update whose WHERE does not test a column the
 * update changes. Returns every row the WHERE matched, whether or not the new
 * values differed from the old ones — matching `RETURNING`, which reports a
 * row even when the update left it byte-identical.
 */
export async function updateReturning<T extends Identifiable>(
  exec: DbClient,
  table: T,
  values: MySqlUpdateSetSource<T>,
  where: SQL | undefined,
): Promise<T["$inferSelect"][]> {
  const matched = (await exec
    .select({ id: table.id })
    .from(table)
    .where(where)) as { id: string }[];
  if (matched.length === 0) return [];
  const ids = matched.map((row) => row.id);

  await exec
    .update(table)
    .set(values)
    .where(and(where, inArray(table.id, ids)));

  return exec.select().from(table).where(inArray(table.id, ids)) as Promise<
    T["$inferSelect"][]
  >;
}

/**
 * `UPDATE ... RETURNING *` for a compare-and-swap, where the WHERE guards on a
 * column the update changes and an empty result means "another writer got here
 * first". Returns rows only if the guarded statement actually applied.
 *
 * Safe to judge by the affected-row count precisely because the guard excludes
 * the value being written, so a matched row is always a changed row.
 */
export async function updateReturningIfChanged<T extends Identifiable>(
  exec: DbClient,
  table: T,
  values: MySqlUpdateSetSource<T>,
  where: SQL | undefined,
): Promise<T["$inferSelect"][]> {
  const matched = (await exec
    .select({ id: table.id })
    .from(table)
    .where(where)) as { id: string }[];
  if (matched.length === 0) return [];
  const ids = matched.map((row) => row.id);

  const result = await exec
    .update(table)
    .set(values)
    .where(and(where, inArray(table.id, ids)));
  if (affectedRows(result) === 0) return [];

  return exec.select().from(table).where(inArray(table.id, ids)) as Promise<
    T["$inferSelect"][]
  >;
}

/**
 * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING *`.
 *
 * MySQL's `ON DUPLICATE KEY UPDATE` chooses the violated unique key itself, so
 * Postgres's explicit conflict `target` has no equivalent in the statement. It
 * is still required here, because it names the columns that identify the row to
 * read back — which works whether the statement inserted or updated.
 */
export async function upsertReturning<T extends Identifiable>(
  exec: DbClient,
  table: T,
  values: T["$inferInsert"],
  conflict: {
    target: AnyMySqlColumn | AnyMySqlColumn[];
    set: Partial<T["$inferInsert"]>;
  },
): Promise<T["$inferSelect"][]> {
  const targets = Array.isArray(conflict.target)
    ? conflict.target
    : [conflict.target];

  // The conflict target is given as column objects, but `values` is keyed by
  // property name, so each column is mapped back to the key that carries it.
  const row = values as Record<string, unknown>;
  const conditions = targets.map((column) => {
    const entry = Object.entries(table).find(([, col]) => col === column);
    if (!entry) {
      throw new Error(
        `upsertReturning: conflict target ${String(column)} is not a column of this table`,
      );
    }
    const value = row[entry[0]];
    if (value === undefined) {
      throw new Error(
        `upsertReturning: conflict target "${entry[0]}" must be present in the inserted values`,
      );
    }
    return eq(column, value as never);
  });

  await exec
    .insert(table)
    .values(values)
    .onDuplicateKeyUpdate({ set: conflict.set });

  return exec.select().from(table).where(and(...conditions)) as Promise<
    T["$inferSelect"][]
  >;
}
