/**
 * Environment configuration, validated once at process start.
 *
 * Secrets are read here and nowhere else. Nothing in this file may be imported
 * from a Client Component — the values are server-only.
 */
import { isIP } from "node:net";

import { z } from "zod";

/** A proxy the app trusts to have appended the address it saw to X-Forwarded-For. */
export interface TrustedProxy {
  address: string;
  /** 32 or 128 for a single address. */
  prefix: number;
  family: "ipv4" | "ipv6";
}

/**
 * One TRUSTED_PROXIES entry: an IP address (192.0.2.10, 2001:db8::10) or a
 * CIDR range (10.0.0.0/8, 2001:db8::/32). Null when it is neither.
 */
function parseTrustedProxy(entry: string): TrustedProxy | null {
  const [address, bits, extra] = entry.split("/");
  const version = isIP(address);
  if (version === 0 || extra !== undefined) return null;
  const max = version === 4 ? 32 : 128;
  const prefix = bits === undefined ? max : /^\d{1,3}$/.test(bits) ? Number(bits) : -1;
  if (prefix < 0 || prefix > max) return null;
  return { address, prefix, family: version === 4 ? "ipv4" : "ipv6" };
}

function splitList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * A PostgreSQL connection string. Only the postgres:// and postgresql://
 * schemes are accepted, so a .env still carrying a mysql:// URL from before the
 * move to PostgreSQL fails at startup with a clear message rather than as an
 * obscure driver error on the first query. TLS is configured in the URL itself
 * (e.g. `?sslmode=require`, which managed providers expect).
 */
function postgresUrl(name: string) {
  return z
    .string()
    .min(1, `${name} is required`)
    .regex(
      /^postgres(?:ql)?:\/\//i,
      `${name} must be a PostgreSQL URL (postgresql://user:password@host:5432/dbname)`,
    );
}

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  /** The connection string the app uses at runtime (on Neon, the pooled endpoint). */
  DATABASE_URL: postgresUrl("DATABASE_URL"),

  /**
   * The direct (unpooled) connection string, for migrations and other schema
   * work. Neon gives every database a pooled endpoint (PgBouncer in
   * transaction mode; its host has `-pooler` in it) and a direct one:
   * DATABASE_URL holds the pooled one, which the app uses at runtime, and this
   * holds the direct one. Unset, migrations use DATABASE_URL, so a local
   * database or CI needs only one variable. See databaseUrlForMigrations().
   */
  DATABASE_URL_UNPOOLED: postgresUrl("DATABASE_URL_UNPOOLED").optional(),

  /**
   * Connection pool ceiling. Managed providers cap concurrent connections
   * (Neon's free tier notably so), and exceeding it produces confusing
   * intermittent failures rather than a clean error.
   */
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

  // Auth.js
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // Cashfree. Absent in dev/test, in which case payments run in MOCK mode.
  CASHFREE_APP_ID: z.string().optional(),
  CASHFREE_SECRET_KEY: z.string().optional(),
  CASHFREE_ENV: z.enum(["sandbox", "production"]).default("sandbox"),

  /**
   * Google Maps Platform — server-side Geocoding API key, used exactly once
   * per shop/address "Confirm location" action (see geocoding.ts). Deliberately
   * a SEPARATE key from NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (the browser-restricted
   * one the map picker loads client-side for Autocomplete/map display) — this
   * one should be IP-restricted, not domain-restricted, since it's never sent
   * to a browser. Absent in dev/test, in which case location capture falls
   * back to manual entry (no map, no verification) rather than failing.
   */
  GOOGLE_MAPS_SERVER_API_KEY: z.string().optional(),

  /**
   * GST/PAN verification providers (marketplace GST-readiness follow-up).
   * No provider is chosen yet — absent in every environment today, so
   * verification runs in self-declared mode (see gst-pan-verification.ts):
   * the shop owner's submission is stored as PENDING_VERIFICATION for an
   * admin to confirm by hand, never silently marked verified. Filling
   * these in later is a config change, not a code change.
   */
  GST_PROVIDER_API_KEY: z.string().optional(),
  PAN_PROVIDER_API_KEY: z.string().optional(),

  /**
   * Base64-encoded 32-byte AES-256-GCM key for encrypting PAN numbers at
   * rest. Required before any PAN can be submitted — there is deliberately
   * no fallback to plaintext storage.
   */
  PAN_ENCRYPTION_KEY: z.string().optional(),

  // Shared bearer token guarding the daily-order cron endpoint.
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),

  // Comma-separated emails bootstrapped to ADMIN on first sign-in.
  BOOTSTRAP_ADMIN_EMAILS: z.string().optional(),

  /**
   * Comma-separated emails re-promoted to ADMIN on every session refresh,
   * not just first sign-in (see permanentBootstrapAdminEmails() below) — for
   * the small number of accounts that must never be lockable-out even by an
   * accidental or malicious role change. This used to be a hard-coded list of
   * personal emails baked into source, which meant revoking one needed a code
   * edit and a redeploy rather than an operational change — the finding
   * recorded as SEC-03 in the GoKesari audit, which this codebase shares an
   * ancestor with. Optional and empty by default — set it on a host to get
   * the stronger guarantee there.
   */
  PERMANENT_ADMIN_EMAILS: z.string().optional(),

  // Deliveries generated after this local time roll to the next day.
  SUBSCRIPTION_CUTOFF_HOUR: z.coerce.number().int().min(0).max(23).default(20),

  APP_TIMEZONE: z.string().default("Asia/Kolkata"),

  /**
   * Which tier this deployment is. Read from the environment rather than
   * hard-coded or inferred from NODE_ENV, so dev/test/production can run the
   * same build against their own database. Deliberately separate from
   * NODE_ENV, which only says whether this is a production *build*.
   */
  APP_ENV: z.enum(["dev", "test", "prod"]).default("dev"),

  /**
   * Public origin (and path prefix) this deployment is served from, e.g.
   * `https://dev.bkesari.com/milk`. Used to build absolute links in mail and
   * payment callbacks, which cannot rely on a request being in scope.
   */
  BASE_URL: z.string().url().optional(),

  /**
   * Comma-separated IP addresses or CIDR ranges of the proxies in front of the
   * app that are not on loopback (loopback is always trusted). The anonymous
   * rate limits key on the visitor's address, read from X-Forwarded-For from
   * the right past these (see clientKey() in src/server/api/rate-limit.ts).
   * Unset, a front end that reaches the app from another address is taken for
   * the visitor, so everyone behind it shares one bucket: over-limiting, never
   * a bypass. On Hostinger: the server's own IP, once the real chain is
   * confirmed (DEPLOYMENT.md §2).
   */
  TRUSTED_PROXIES: z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      for (const entry of splitList(value)) {
        if (!parseTrustedProxy(entry)) {
          ctx.addIssue({
            code: "custom",
            message: `${JSON.stringify(entry)} is not an IP address or CIDR range (e.g. 192.0.2.10, 10.0.0.0/8)`,
          });
        }
      }
    }),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Builds a postgresql:// URL from the discrete `DB_*` variables, or returns
 * undefined when the essential ones are missing so that the schema reports the
 * absence of DATABASE_URL rather than producing a half-formed URL.
 */
function composeDatabaseUrl(
  raw: Record<string, string | undefined>,
): string | undefined {
  const name = raw.DB_NAME;
  const user = raw.DB_USER;
  if (!name || !user) return undefined;
  const host = raw.DB_HOST ?? "localhost";
  const port = raw.DB_PORT ?? "5432";
  // The password routinely contains characters that are not URL-safe.
  const credentials = raw.DB_PASS
    ? `${encodeURIComponent(user)}:${encodeURIComponent(raw.DB_PASS)}`
    : encodeURIComponent(user);
  // Managed PostgreSQL providers require TLS; DB_SSLMODE=require says so.
  const query = raw.DB_SSLMODE
    ? `?sslmode=${encodeURIComponent(raw.DB_SSLMODE)}`
    : "";
  return `postgresql://${credentials}@${host}:${port}/${encodeURIComponent(name)}${query}`;
}

let cached: ServerEnv | null = null;

/**
 * process.env with empty values (`FOO=` in a .env file) treated as unset.
 * Otherwise an optional secret becomes "" rather than undefined, and `??`
 * fallbacks silently fail to trigger.
 */
function readRawEnv(): Record<string, string | undefined> {
  const raw: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    raw[key] = value === "" ? undefined : value;
  }
  // Hosting control panels usually issue database credentials as separate
  // fields (host, port, name, user, password), and the deployment brief
  // specifies a .env in that shape. The driver wants one URL, so it is composed
  // here when not supplied directly — both styles of .env work, and a full
  // DATABASE_URL still wins if both are present.
  raw.DATABASE_URL ??= composeDatabaseUrl(raw);
  return raw;
}

export function getEnv(): ServerEnv {
  if (cached) return cached;

  const raw = readRawEnv();

  // Vite (and so Vitest) puts its own BASE_URL="/" into the process
  // environment, which is a base *path*, not the absolute origin meant here.
  // Anything that is not an absolute http(s) URL is treated as unset rather
  // than failing the whole configuration.
  if (raw.BASE_URL && !/^https?:\/\//i.test(raw.BASE_URL)) {
    raw.BASE_URL = undefined;
  }

  const parsed = serverEnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/**
 * The connection string for migrations and other schema work, and the name of
 * the variable it came from.
 *
 * Normally the direct endpoint, DATABASE_URL_UNPOOLED, when one is configured,
 * else DATABASE_URL: DDL and the migrator's own bookkeeping belong on a direct
 * connection, not behind a transaction-mode pooler. One exception, because
 * .env is loaded underneath whatever the shell already set: when the shell sets
 * DATABASE_URL and not DATABASE_URL_UNPOOLED, the shell's DATABASE_URL wins,
 * so `DATABASE_URL=... npm run db:migrate` migrates the database it names and
 * never a direct URL that happens to sit in .env for another one. Pass the
 * variables the shell set, read before .env was loaded, as `setInShell`.
 *
 * Validates only that variable, not the whole app configuration, so migrating
 * a database needs its URL and nothing else — not the app's AUTH_SECRET and
 * CRON_SECRET.
 */
export function databaseUrlForMigrations(
  setInShell: ReadonlySet<string> = new Set(),
): { variable: "DATABASE_URL_UNPOOLED" | "DATABASE_URL"; url: string } {
  const raw = readRawEnv();
  const shellNamesPooledOnly =
    setInShell.has("DATABASE_URL") && !setInShell.has("DATABASE_URL_UNPOOLED");
  const variable =
    raw.DATABASE_URL_UNPOOLED && !shellNamesPooledOnly
      ? "DATABASE_URL_UNPOOLED"
      : "DATABASE_URL";
  const value = raw[variable];
  if (!value) {
    throw new Error(
      "Set DATABASE_URL_UNPOOLED (the direct connection string) or DATABASE_URL to migrate a database.",
    );
  }
  const parsed = postgresUrl(variable).safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid database configuration: ${parsed.error.issues[0].message}`);
  }
  return { variable, url: parsed.data };
}

/** True when real Cashfree credentials are configured. */
export function isPaymentGatewayLive(): boolean {
  const env = getEnv();
  return Boolean(env.CASHFREE_APP_ID && env.CASHFREE_SECRET_KEY);
}

/** Cashfree's API base URL for the configured environment. */
export function cashfreeApiBase(): string {
  return getEnv().CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

/** True when the server-side Geocoding key is configured. */
export function isGeocodingConfigured(): boolean {
  return Boolean(getEnv().GOOGLE_MAPS_SERVER_API_KEY);
}

export function isGstProviderConfigured(): boolean {
  return Boolean(getEnv().GST_PROVIDER_API_KEY);
}

export function isPanProviderConfigured(): boolean {
  return Boolean(getEnv().PAN_PROVIDER_API_KEY);
}

export function isPanEncryptionConfigured(): boolean {
  return Boolean(getEnv().PAN_ENCRYPTION_KEY);
}

/** TRUSTED_PROXIES, parsed. Empty unless the variable is set. */
export function trustedProxies(): TrustedProxy[] {
  // Every entry parses: getEnv() refused the configuration otherwise.
  return splitList(getEnv().TRUSTED_PROXIES).map((entry) => parseTrustedProxy(entry)!);
}

/**
 * Emails that are always bootstrapped to ADMIN on first sign-in, regardless of
 * environment configuration. Kept in addition to (not instead of)
 * BOOTSTRAP_ADMIN_EMAILS so deployments can grant further admins via env
 * without code changes.
 */
function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Emails re-promoted to ADMIN on every session refresh — see
 * PERMANENT_ADMIN_EMAILS above. Empty unless that variable is set; there is
 * deliberately no hard-coded fallback (SEC-03).
 */
export function permanentBootstrapAdminEmails(): readonly string[] {
  return parseEmailList(getEnv().PERMANENT_ADMIN_EMAILS);
}

/** Emails granted ADMIN on first sign-in — the union of both env-configured lists. */
export function bootstrapAdminEmails(): string[] {
  return Array.from(
    new Set([
      ...permanentBootstrapAdminEmails(),
      ...parseEmailList(getEnv().BOOTSTRAP_ADMIN_EMAILS),
    ]),
  );
}
