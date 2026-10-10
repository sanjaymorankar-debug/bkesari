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
 * Single pooled connection reused across hot reloads. Next.js re-evaluates
 * modules on every edit in dev, so without this the pool leaks connections.
 */
const globalForDb = globalThis as unknown as {
  __pgPool?: pg.Pool;
};

function createPool() {
  const env = getEnv();

  return new pg.Pool({
    // TLS comes from the URL: managed providers (Neon, Supabase, RDS)
    // advertise `?sslmode=require`, while a local server needs nothing. See
    // ./ssl for why the mode is turned into an explicit option.
    ...pgConnectionOptions(env.DATABASE_URL),
    // Managed providers cap connections far below a self-hosted server — Neon's
    // free tier allows well under 100 — so the ceiling is configurable rather
    // than hard-coded.
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
