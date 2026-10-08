/**
 * Replacements for the Postgres sequences that generated human-readable
 * references as column defaults.
 *
 * MySQL has no sequences, and its expression defaults cannot call a
 * non-deterministic function, so the number can no longer be allocated by the
 * database as a side effect of the insert. Each counter is a one-column
 * AUTO_INCREMENT table instead: inserting a row reserves the next value and
 * returns it as `insertId` on the very same result, which is atomic without a
 * transaction and never hands the same number out twice.
 *
 * Callers must now pass the reference explicitly when inserting; the columns are
 * `notNull()` with no default, so TypeScript flags any insert that forgets.
 */
import {
  grievanceTicketSeq,
  productCodeSeq,
  shopRegistrationSeq,
} from "./schema";

import type { DbClient } from "./index";

type SequenceTable =
  | typeof shopRegistrationSeq
  | typeof productCodeSeq
  | typeof grievanceTicketSeq;

/** Reserves and returns the next number from one of the counter tables. */
async function nextSequenceValue(
  exec: DbClient,
  table: SequenceTable,
): Promise<number> {
  const result = await exec.insert(table).values({});
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = (header as { insertId?: number } | undefined)?.insertId;
  if (!insertId) {
    throw new Error(
      "Sequence allocation returned no insertId — the counter table may be missing",
    );
  }
  return insertId;
}

/** `BKS-000123` — a shop's registration number. */
export async function nextShopRegistrationNumber(
  exec: DbClient,
): Promise<string> {
  const n = await nextSequenceValue(exec, shopRegistrationSeq);
  return `BKS-${String(n).padStart(6, "0")}`;
}

/** `P00042` — a platform product code. */
export async function nextProductCode(exec: DbClient): Promise<string> {
  const n = await nextSequenceValue(exec, productCodeSeq);
  return `P${String(n).padStart(5, "0")}`;
}

/** `GRV-000123` — the reference a complainant quotes back. */
export async function nextGrievanceTicketNumber(
  exec: DbClient,
): Promise<string> {
  const n = await nextSequenceValue(exec, grievanceTicketSeq);
  return `GRV-${String(n).padStart(6, "0")}`;
}
