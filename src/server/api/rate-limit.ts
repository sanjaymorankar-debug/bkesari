/**
 * Rate limiting (requirement §47).
 *
 * A fixed-window counter held in process memory. This is deliberately simple and
 * has a known limitation: it is per-instance, so a horizontally scaled
 * deployment gets N× the configured limit. That is an acceptable first cut for
 * blunting abuse of the auth, payment and cron endpoints; swapping the store for
 * Redis is a single-function change and is noted in the deployment docs.
 */
import { BlockList, isIP } from "node:net";

import { trustedProxies } from "@/lib/env";
import { AppError } from "@/lib/errors";

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Evict expired entries so the map cannot grow without bound. */
function sweep(now: number): void {
  if (windows.size < 5_000) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitOptions {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export const RATE_LIMITS = {
  /** Payment creation and verification. */
  PAYMENT: { limit: 10, windowMs: 60_000 },
  /** Checkout attempts. */
  CHECKOUT: { limit: 15, windowMs: 60_000 },
  /** General authenticated mutations. */
  MUTATION: { limit: 60, windowMs: 60_000 },
  /** The cron endpoint — generous, but not unbounded. */
  CRON: { limit: 30, windowMs: 60_000 },
  /** Public grievance submission — unauthenticated, so keyed by IP rather than user id. */
  GRIEVANCE: { limit: 5, windowMs: 600_000 },
} as const satisfies Record<string, RateLimitOptions>;

/**
 * Consumes one unit of quota for `key`.
 * @throws AppError RATE_LIMITED when the window is exhausted.
 */
export function enforceRateLimit(
  key: string,
  options: RateLimitOptions,
): void {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  if (existing.count >= options.limit) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    throw new AppError(
      "RATE_LIMITED",
      "Too many requests. Please wait a moment and try again.",
      { retryAfterSeconds },
    );
  }
  existing.count += 1;
}

/**
 * Client identifier for anonymous rate limiting: the visitor's address, from
 * X-Forwarded-For.
 *
 * Each proxy appends the address it received the request from, so the header
 * reads "<whatever the visitor sent>, <visitor>, <proxy>, …"; Next passes it on
 * unchanged (it fills in the socket's address only when there is no header).
 * The left part is the visitor's to write, so the header is read from the
 * right: trusted proxies (loopback, and TRUSTED_PROXIES) are skipped, and the
 * first other entry is the visitor. No header, nothing but trusted proxies, or
 * an entry in the visitor's place that is not an address all give one shared
 * "unknown" bucket. Whatever goes wrong errs toward a shared bucket, never
 * toward a key the visitor chose.
 */
export function clientKey(request: Request, suffix: string): string {
  const trusted = new BlockList();
  trusted.addSubnet("127.0.0.0", 8, "ipv4"); // matches ::ffff:127.x too
  trusted.addAddress("::1", "ipv6");
  for (const proxy of trustedProxies()) trusted.addSubnet(proxy.address, proxy.prefix, proxy.family);

  const entries = (request.headers.get("x-forwarded-for") ?? "").split(",");
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    let address = entries[i].trim();
    const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(address); // [2001:db8::1]:443
    if (bracketed) address = bracketed[1];
    else if (/^[\d.]+:\d+$/.test(address)) address = address.slice(0, address.lastIndexOf(":")); // 192.0.2.1:8080
    address = address.toLowerCase().replace(/^::ffff:(?=[\d.]+$)/, ""); // ::ffff:192.0.2.1
    const version = isIP(address);
    // Not an address: nothing further left can be vouched for.
    if (version === 0) break;
    if (!trusted.check(address, version === 4 ? "ipv4" : "ipv6")) return `${suffix}:${address}`;
  }
  return `${suffix}:unknown`;
}

/** Clears all windows. Test-only. */
export function resetRateLimits(): void {
  windows.clear();
}
