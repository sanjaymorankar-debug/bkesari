/**
 * Environment configuration, validated once at process start.
 *
 * Secrets are read here and nowhere else. Nothing in this file may be imported
 * from a Client Component — the values are server-only.
 */
import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

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

  // Shared bearer token guarding the daily-order cron endpoint.
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),

  // Comma-separated emails bootstrapped to ADMIN on first sign-in.
  BOOTSTRAP_ADMIN_EMAILS: z.string().optional(),

  // Deliveries generated after this local time roll to the next day.
  SUBSCRIPTION_CUTOFF_HOUR: z.coerce.number().int().min(0).max(23).default(20),

  APP_TIMEZONE: z.string().default("Asia/Kolkata"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;

  // Treat an empty variable (`FOO=` in a .env file) as unset. Otherwise an
  // optional secret becomes "" rather than undefined, and `??` fallbacks
  // silently fail to trigger.
  const raw: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    raw[key] = value === "" ? undefined : value;
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

/**
 * Emails that are always bootstrapped to ADMIN on first sign-in, regardless of
 * environment configuration. Kept in addition to (not instead of)
 * BOOTSTRAP_ADMIN_EMAILS so deployments can grant further admins via env
 * without code changes.
 */
const PERMANENT_BOOTSTRAP_ADMIN_EMAILS = [
  "agtcipl@gmail.com",
  "sanjaymoranar@gmail.com",
] as const;

/** Just the permanent list, lower-cased — used for self-healing role checks. */
export function permanentBootstrapAdminEmails(): readonly string[] {
  return PERMANENT_BOOTSTRAP_ADMIN_EMAILS.map((e) => e.toLowerCase());
}

export function bootstrapAdminEmails(): string[] {
  const fromEnv = (getEnv().BOOTSTRAP_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(
    new Set([
      ...PERMANENT_BOOTSTRAP_ADMIN_EMAILS.map((e) => e.toLowerCase()),
      ...fromEnv,
    ]),
  );
}
