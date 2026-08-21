/**
 * Rate limiting (requirement §47).
 *
 * A fixed-window counter held in process memory. This is deliberately simple and
 * has a known limitation: it is per-instance, so a horizontally scaled
 * deployment gets N× the configured limit. That is an acceptable first cut for
 * blunting abuse of the auth, payment and cron endpoints; swapping the store for
 * Redis is a single-function change and is noted in the deployment docs.
 */
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

/** Best-effort client identifier for anonymous rate limiting. */
export function clientKey(request: Request, suffix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${suffix}:${ip}`;
}

/** Clears all windows. Test-only. */
export function resetRateLimits(): void {
  windows.clear();
}
