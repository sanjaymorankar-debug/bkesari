/**
 * TLS settings for node-postgres, derived from the connection URL.
 *
 * Kept apart from ./index so the migrator can use it without opening the
 * application's connection pool.
 */

/**
 * Managed Postgres providers (Neon, Supabase, RDS) require TLS and advertise it
 * as `?sslmode=require` in the URL. The flag is read from the URL rather than
 * assumed, so the same code works against localhost and a managed provider.
 * `sslmode=no-verify` encrypts without checking the certificate chain, for
 * providers whose CA is not in Node's trust store.
 */
export function resolveSsl(
  url: string,
): false | { rejectUnauthorized: boolean } {
  try {
    const sslmode = new URL(url).searchParams.get("sslmode");
    if (!sslmode || sslmode === "disable") return false;
    return { rejectUnauthorized: sslmode !== "no-verify" };
  } catch {
    return false;
  }
}

/**
 * node-postgres parses `sslmode` out of the connection string itself and lets
 * it override the `ssl` option, so it is stripped once resolveSsl() has read it.
 */
export function stripSslMode(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("sslmode")) return url;
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return url;
  }
}
