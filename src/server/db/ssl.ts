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
 *
 * Neon's connection strings also carry `channel_binding=require`, a libpq
 * parameter node-postgres would otherwise ignore without a word. It is read
 * into `enableChannelBinding`, so the SCRAM login is bound to the TLS channel
 * (SCRAM-SHA-256-PLUS) whenever the server offers that, as Neon does.
 * node-postgres falls back to plain SCRAM when a server does not offer it
 * (PgBouncer, for one), so `require` behaves as libpq's `prefer`: TLS itself
 * is unaffected either way. `channel_binding=disable` turns binding off, and
 * `require` together with `sslmode=disable` is refused, since binding needs TLS.
 */
export interface PgConnectionOptions {
  connectionString: string;
  ssl?: false | { rejectUnauthorized: boolean };
  enableChannelBinding?: boolean;
}

export function pgConnectionOptions(url: string): PgConnectionOptions {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not a parseable URL: hand it to node-postgres untouched.
    return { connectionString: url };
  }

  const sslmode = parsed.searchParams.get("sslmode");
  const channelBinding = parsed.searchParams.get("channel_binding");
  if (sslmode === null && channelBinding === null) return { connectionString: url };

  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");
  const options: PgConnectionOptions = { connectionString: parsed.toString() };

  if (sslmode !== null) {
    options.ssl =
      sslmode === "disable"
        ? false
        : { rejectUnauthorized: sslmode !== "no-verify" };
  }

  if (channelBinding !== null) {
    if (channelBinding === "require" && sslmode === "disable") {
      throw new Error(
        "The database URL has channel_binding=require but sslmode=disable; channel binding needs TLS.",
      );
    }
    options.enableChannelBinding = channelBinding !== "disable";
  }

  return options;
}
