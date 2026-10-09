/**
 * Central login (bkesari.com) for Milk & Dairy: the parts with no Next.js
 * imports, shared by the proxy and the server.
 *
 * Off unless BKESARI_SSO_INTROSPECT_URL is set. When on, the bkesari.com
 * session cookie is validated against the central auth service
 * (introspection with client credentials, cached for at most 30 s) and the
 * MILK_DAIRY subscription is required. See bkesari-platform docs/auth/DESIGN.md.
 *
 *   BKESARI_SSO_INTROSPECT_URL   https://dev.bkesari.com/auth/api/introspect
 *   BKESARI_SSO_CLIENT_ID / BKESARI_SSO_CLIENT_SECRET   an `internal` client on the hub
 *   BKESARI_SSO_URL              the hub's origin (sign-in and subscribe pages)
 *   BKESARI_SSO_ENFORCE          1: the app's own sign-in (Auth.js) is ignored
 *   BKESARI_SSO_COOKIE           default "__Host-bk_sso,bk_sso"
 */
import { createHash } from "node:crypto";

export const FEATURE = "MILK_DAIRY";

export interface SsoIdentity {
  active: true;
  sid: string;
  user: { id: string; email: string; name: string | null; email_verified: boolean };
  roles: string[];
  moderator_of: string[];
  features: string[];
  permissions: string[];
  mfa: boolean;
}

export interface SsoConfig {
  introspectUrl: string;
  clientId: string;
  clientSecret: string;
  hubUrl: string;
  enforce: boolean;
  cookieNames: string[];
}

export function ssoConfig(env: Record<string, string | undefined> = process.env): SsoConfig | null {
  const introspectUrl = (env.BKESARI_SSO_INTROSPECT_URL ?? "").trim();
  if (!introspectUrl) return null;
  const hubUrl = (env.BKESARI_SSO_URL ?? "").trim().replace(/\/+$/, "") || new URL(introspectUrl).origin;
  return {
    introspectUrl,
    clientId: env.BKESARI_SSO_CLIENT_ID ?? "",
    clientSecret: env.BKESARI_SSO_CLIENT_SECRET ?? "",
    hubUrl,
    enforce: /^(1|true|yes|on)$/i.test(env.BKESARI_SSO_ENFORCE ?? ""),
    cookieNames: (env.BKESARI_SSO_COOKIE ?? "__Host-bk_sso,bk_sso").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

/** The first configured cookie present, from any cookie lookup. */
export function pickToken(get: (name: string) => string | undefined, names: string[]): string | null {
  for (const n of names) {
    const v = get(n);
    if (v) return v;
  }
  return null;
}

const cache = new Map<string, { at: number; value: SsoIdentity | null }>();
const TTL_MS = 30_000;

/** Who is behind `token`, or null. Fails closed when the service cannot be reached. */
export async function introspect(
  token: string | null,
  cfg: SsoConfig,
  { fetchImpl = fetch }: { fetchImpl?: typeof fetch } = {},
): Promise<SsoIdentity | null> {
  if (!token || token.length > 200) return null;
  const key = createHash("sha256").update(token).digest("hex");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  let value: SsoIdentity | null = null;
  try {
    const res = await fetchImpl(cfg.introspectUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Basic " + Buffer.from(`${encodeURIComponent(cfg.clientId)}:${encodeURIComponent(cfg.clientSecret)}`).toString("base64"),
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const body = (await res.json()) as Partial<SsoIdentity> & { active?: boolean };
      if (body.active === true && body.user?.id && body.user.email) value = body as SsoIdentity;
    } else {
      console.error(`[bkesari-sso] introspection answered ${res.status}`);
    }
  } catch (error) {
    console.error("[bkesari-sso] introspection failed:", (error as Error).message);
  }
  if (cache.size > 5000) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function entitled(identity: SsoIdentity | null): boolean {
  return Boolean(identity?.features.includes(FEATURE));
}

/** Paths that carry their own credential (cron bearer token, payment webhook HMAC). */
const MACHINE = ["/api/cron/", "/api/webhooks/"];

export type ProxyDecision =
  | { action: "next" }
  | { action: "redirect"; to: string }
  | { action: "json"; status: number; body: Record<string, unknown> };

/**
 * What the proxy does before a page or API route runs. Pages only get a
 * redirect; API routes still enforce on their own through the guards.
 *
 *   path   pathname without the basePath; `publicPath` with it, for return_to
 */
export function decideProxy(input: {
  path: string;
  publicPath: string;
  identity: SsoIdentity | null;
  cfg: SsoConfig;
}): ProxyDecision {
  const { path, publicPath, identity, cfg } = input;
  if (MACHINE.some((p) => path.startsWith(p)) || path.startsWith("/api/auth/")) return { action: "next" };
  const isApi = path.startsWith("/api/");
  if (identity) {
    if (entitled(identity)) return { action: "next" };
    if (isApi) return { action: "json", status: 403, body: { error: "subscription_required", feature: FEATURE } };
    return { action: "redirect", to: `${cfg.hubUrl}/auth/subscribe/${FEATURE.toLowerCase()}` };
  }
  if (!cfg.enforce) return { action: "next" };
  if (isApi) return { action: "json", status: 401, body: { error: "login_required" } };
  return { action: "redirect", to: `${cfg.hubUrl}/auth/login?return_to=${encodeURIComponent(publicPath)}` };
}
