import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Single pooled connection reused across hot reloads. Next.js re-evaluates
 * modules on every edit in dev, so without this the pool leaks connections.
 */
const globalForDb = globalThis as unknown as {
  __mysqlPool?: mysql.Pool;
};

/**
 * Hostinger's MySQL is reached over `localhost`, so TLS is off by default. A
 * managed provider that requires it advertises `?ssl=true` in the URL, which is
 * read here rather than assumed, so the same URL works in both places.
 */
function resolveSsl(url: string): { rejectUnauthorized: boolean } | undefined {
  try {
    const ssl = new URL(url).searchParams.get("ssl");
    if (!ssl || ssl === "false" || ssl === "disable") return undefined;
    return { rejectUnauthorized: ssl !== "no-verify" };
  } catch {
    return undefined;
  }
}

function createPool() {
  const env = getEnv();
  const url = env.DATABASE_URL;

  return mysql.createPool({
    uri: url,
    // Shared hosting caps concurrent connections far below a self-hosted
    // server, so the ceiling is configurable rather than hard-coded.
    connectionLimit: env.DATABASE_POOL_MAX,
    idleTimeout: 20_000,
    connectTimeout: 30_000,
    ssl: resolveSsl(url),
    // The columns were `timestamptz` on Postgres and are plain MySQL
    // TIMESTAMP/DATETIME now, which carry no zone. Pinning the connection to
    // UTC keeps every value stored and read back as UTC, so behaviour does not
    // depend on the server's local timezone.
    timezone: "Z",
    // Money is bigint paise. Every value is well inside 2^53, so returning
    // numbers (not strings) matches how the Postgres driver was configured.
    supportBigNumbers: true,
    bigNumberStrings: false,
  });
}

const pool = globalForDb.__mysqlPool ?? createPool();
if (getEnv().NODE_ENV !== "production") globalForDb.__mysqlPool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export { schema };
export type Database = typeof db;

/** Transaction handle type, for services that accept an ambient transaction. */
export type DbClient =
  | Database
  | Parameters<Parameters<Database["transaction"]>[0]>[0];
