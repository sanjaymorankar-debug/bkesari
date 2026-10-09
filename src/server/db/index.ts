import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { getEnv } from "@/lib/env";
import * as schema from "./schema";
import { resolveSsl, stripSslMode } from "./ssl";

/**
 * int8 (bigint) arrives from node-postgres as a string by default, because a
 * JS number cannot hold every 64-bit value. Money is bigint paise and every
 * real value is far inside 2^53, so raw aggregates such as
 * `COALESCE(SUM(...), 0)::bigint` are parsed to numbers — matching the
 * `sql<number>` they are typed as. A value that would not survive the
 * conversion fails loudly instead of silently losing precision.
 *
 * Drizzle's own `bigint({ mode: "number" })` columns convert independently, so
 * this only matters for raw SQL. It is process-wide, which is what we want:
 * the migrator and the app must agree.
 */
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new RangeError(`bigint value ${value} exceeds Number.MAX_SAFE_INTEGER`);
  }
  return parsed;
});

/**
 * Single pooled connection reused across hot reloads. Next.js re-evaluates
 * modules on every edit in dev, so without this the pool leaks connections.
 */
const globalForDb = globalThis as unknown as {
  __pgPool?: pg.Pool;
};

function createPool() {
  const env = getEnv();
  const url = env.DATABASE_URL;

  return new pg.Pool({
    connectionString: stripSslMode(url),
    ssl: resolveSsl(url),
    // Managed providers cap connections far below a self-hosted server, so the
    // ceiling is configurable rather than hard-coded.
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 30_000,
  });
}

const pool = globalForDb.__pgPool ?? createPool();
if (getEnv().NODE_ENV !== "production") globalForDb.__pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
export type Database = typeof db;

/** Transaction handle type, for services that accept an ambient transaction. */
export type DbClient =
  | Database
  | Parameters<Parameters<Database["transaction"]>[0]>[0];
