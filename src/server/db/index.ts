import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { getEnv } from "@/lib/env";
import * as schema from "./schema";
import { pgConnectionOptions } from "./ssl";

/**
 * int8 (bigint) arrives from node-postgres as a string by default. Money is
 * bigint paise and every `COUNT(*)` / `SUM(...)::bigint` aggregate is int8, so
 * they are parsed to numbers — every value is far inside 2^53. A value that is
 * not a safe integer throws rather than silently losing precision.
 *
 * This is set on the driver's global type registry on purpose: drizzle's
 * node-postgres session passes its own per-query `types` (to keep timestamps
 * and dates as strings for its column mappers) and delegates every other type
 * to this registry, so a pool-level `types` option would never be consulted.
 */
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new RangeError(`int8 value ${value} is outside the safe integer range`);
  }
  return parsed;
});

/**
 * One pool per process, kept on globalThis. Next.js re-evaluates modules on
 * every edit in dev, and in a production server it loads this module more than
 * once (route handlers and pages are bundled separately), so a module-level
 * pool alone would multiply: each copy opening up to DATABASE_POOL_MAX
 * connections of its own.
 */
const globalForDb = globalThis as unknown as {
  __pgPool?: pg.Pool;
};

function createPool() {
  const env = getEnv();

  const pool = new pg.Pool({
    // TLS comes from the URL: managed providers (Neon, Supabase, RDS)
    // advertise `?sslmode=require`, while a local server needs nothing. See
    // ./ssl for why the mode is turned into an explicit option.
    ...pgConnectionOptions(env.DATABASE_URL),
    // Managed providers cap connections far below a self-hosted server — Neon's
    // free tier allows well under 100 — so the ceiling is configurable rather
    // than hard-coded.
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: 20_000,
    // Generous on purpose: Neon suspends an idle compute, and the first
    // connection after that waits for it to start again.
    connectionTimeoutMillis: 30_000,
  });

  // The server can close any connection at any time: Neon suspending an idle
  // compute, a pooler restart, an admin's pg_terminate_backend. node-postgres
  // reports that as an 'error' event, and an 'error' event with no listener is
  // an uncaught exception that ends the process. Two listeners cover it:
  //
  //  - on every client, for its whole life. The pool listens only while a
  //    client is idle; once it is checked out, as db.transaction() does for
  //    BEGIN … COMMIT, nothing does. A drop between two statements of a
  //    transaction then fails that transaction (its next query rejects, and the
  //    dead client is discarded on release) instead of the process;
  //  - on the pool, which re-emits an idle client's error after removing the
  //    client. That one is already logged by the client listener.
  //
  // Either way the next query opens a fresh connection.
  pool.on("connect", (client) => {
    client.on("error", (error) => {
      console.warn(`[db] connection closed by the server: ${error.message}`);
    });
  });
  pool.on("error", () => {});

  return pool;
}

const pool = (globalForDb.__pgPool ??= createPool());

export const db = drizzle(pool, { schema });
export { schema };
export type Database = typeof db;

/** Transaction handle type, for services that accept an ambient transaction. */
export type DbClient =
  | Database
  | Parameters<Parameters<Database["transaction"]>[0]>[0];
