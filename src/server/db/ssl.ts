/**
 * TLS settings for node-postgres, derived from the connection URL.
 *
 * Kept apart from ./index so the migrator can use it without opening the
 * application's connection pool.
 *
 * Managed PostgreSQL providers (Neon, Supabase, RDS) require TLS and advertise
 * it as `?sslmode=require` in the URL. `DB_SSLMODE` in the DB_* form of the
 * configuration composes into the same parameter (see src/lib/env.ts). Left in
 * the URL, node-postgres reads it itself and prints a deprecation warning,
 * because it treats `require` as `verify-full` today but will switch to
 * libpq's weaker meaning in its next major version. So the mode is read here
 * into an explicit `ssl` option and removed from the URL. The behaviour
 * matches what node-postgres does now and will not change when it upgrades.
 *
 *   absent                                → left to node-postgres (no TLS,
 *                                           unless PGSSLMODE says otherwise)
 *   disable                               → no TLS
 *   no-verify                             → TLS, certificate not checked
 *   anything else (require, prefer,
 *   verify-ca, verify-full)               → TLS, certificate verified
 */
export function pgConnectionOptions(url: string): {
  connectionString: string;
  ssl?: false | { rejectUnauthorized: boolean };
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not a parseable URL: hand it to node-postgres untouched.
    return { connectionString: url };
  }

  const sslmode = parsed.searchParams.get("sslmode");
  if (sslmode === null) return { connectionString: url };

  parsed.searchParams.delete("sslmode");
  return {
    connectionString: parsed.toString(),
    ssl:
      sslmode === "disable"
        ? false
        : { rejectUnauthorized: sslmode !== "no-verify" },
  };
}
