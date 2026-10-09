/**
 * Central login (bkesari.com) for Milk & Dairy: the proxy's decisions, the
 * guards accepting a central session only with MILK_DAIRY, the local account
 * it maps to, and enforcement switching the app's own sign-in off.
 */
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The guards read the central cookie through next/headers; outside a request
// there is none, so the cookie store is supplied here.
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined) }),
}));
// Auth.js is the app's own sign-in; each test says whether it has a session.
const localSession = { current: null as null | { user: Record<string, unknown> } };
vi.mock("@/server/auth", () => ({ auth: async () => localSession.current }));

import { db } from "@/server/db";
import { userConsents, users, wallets } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/authz/guards";
import { decideProxy, ssoConfig, type SsoConfig, type SsoIdentity } from "@/server/sso/bkesari-sso";
import { createUser, resetDatabase } from "../helpers/fixtures";

const cfg: SsoConfig = {
  introspectUrl: "https://dev.bkesari.com/auth/api/introspect",
  clientId: "milk-dev",
  clientSecret: "s3cret",
  hubUrl: "https://dev.bkesari.com",
  enforce: false,
  cookieNames: ["__Host-bk_sso", "bk_sso"],
};

function identity(over: Partial<SsoIdentity> & { email?: string } = {}): SsoIdentity {
  const email = over.email ?? "buyer@example.test";
  return {
    active: true, sid: "sid", mfa: false,
    user: { id: `central-${email}`, email, name: "Central Buyer", email_verified: true },
    roles: ["USER"], moderator_of: [], features: ["MILK_DAIRY"], permissions: ["milk.view", "milk.order"],
    ...over,
  };
}

let tokenCounter = 0;
/** Signs the "browser" in centrally: a fresh cookie, and what introspection says about it. */
function centralSession(answer: SsoIdentity | { active: false }) {
  const token = `tok-${++tokenCounter}`;
  cookieJar.set("__Host-bk_sso", token);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(answer))));
  return token;
}

const saved = { ...process.env };
beforeEach(async () => {
  await resetDatabase();
  cookieJar.clear();
  localSession.current = null;
  Object.assign(process.env, {
    BKESARI_SSO_INTROSPECT_URL: cfg.introspectUrl,
    BKESARI_SSO_CLIENT_ID: cfg.clientId,
    BKESARI_SSO_CLIENT_SECRET: cfg.clientSecret,
    BKESARI_SSO_URL: cfg.hubUrl,
  });
});
afterEach(() => {
  process.env = { ...saved };
  vi.unstubAllGlobals();
});

describe("proxy decisions", () => {
  const at = (path: string, identityValue: SsoIdentity | null, c = cfg) =>
    decideProxy({ path, publicPath: `/milk${path}`, identity: identityValue, cfg: c });

  it("lets machine endpoints through whatever the session", () => {
    for (const p of ["/api/cron/daily-orders", "/api/webhooks/cashfree", "/api/auth/session"]) {
      expect(at(p, null, { ...cfg, enforce: true })).toEqual({ action: "next" });
    }
  });

  it("subscribed: through; not subscribed: subscribe page, or 403 for APIs", () => {
    expect(at("/shops", identity())).toEqual({ action: "next" });
    const other = identity({ features: ["LADWANI"] });
    expect(at("/shops", other)).toEqual({ action: "redirect", to: "https://dev.bkesari.com/auth/subscribe/milk_dairy" });
    expect(at("/api/cart", other)).toMatchObject({ action: "json", status: 403 });
  });

  it("no central session: untouched unless enforced, then the central sign-in", () => {
    expect(at("/shops", null)).toEqual({ action: "next" });
    const enforced = { ...cfg, enforce: true };
    expect(at("/shops?x=1", null, enforced)).toEqual({
      action: "redirect", to: `https://dev.bkesari.com/auth/login?return_to=${encodeURIComponent("/milk/shops?x=1")}`,
    });
    expect(at("/api/cart", null, enforced)).toMatchObject({ action: "json", status: 401 });
  });

  it("is off unless configured", () => {
    expect(ssoConfig({})).toBeNull();
  });
});

describe("guards with a central session", () => {
  it("a subscribed central user is signed in as a new CUSTOMER with a wallet and a consent record", async () => {
    centralSession(identity());
    const user = await getCurrentUser();
    expect(user).toMatchObject({ email: "buyer@example.test", role: "CUSTOMER", name: "Central Buyer" });
    expect(await db.query.wallets.findFirst({ where: eq(wallets.userId, user!.id) })).toBeTruthy();
    const consents = await db.select().from(userConsents).where(eq(userConsents.userId, user!.id));
    expect(consents.map((c) => c.version)).toEqual(["bkesari-sso"]);
    // Introspection is called with the client's credentials and the cookie value.
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(cfg.introspectUrl);
    expect(init.headers.authorization).toBe("Basic " + Buffer.from("milk-dev:s3cret").toString("base64"));
  });

  it("an existing account is linked by email and keeps its Milk & Dairy role", async () => {
    const owner = await createUser({ email: "shopkeeper@example.test", role: "SHOP_OWNER" });
    centralSession(identity({ email: "shopkeeper@example.test" }));
    expect(await getCurrentUser()).toMatchObject({ id: owner.id, role: "SHOP_OWNER" });
  });

  it("without MILK_DAIRY nobody is signed in, and requireUser says why (403)", async () => {
    centralSession(identity({ features: ["EDUCATION"] }));
    localSession.current = { user: { id: "local", status: "ACTIVE", role: "CUSTOMER", email: "x@example.test" } };
    expect(await getCurrentUser()).toBeNull();
    await expect(requireUser()).rejects.toMatchObject({ status: 403 });
    expect(await db.query.users.findFirst({ where: eq(users.email, "buyer@example.test") })).toBeUndefined();
  });

  it("a suspended local account stays out", async () => {
    const u = await createUser({ email: "buyer@example.test" });
    await db.update(users).set({ status: "SUSPENDED" }).where(eq(users.id, u.id));
    centralSession(identity());
    expect(await getCurrentUser()).toBeNull();
  });

  it("no central session, not enforced: the app's own sign-in still works", async () => {
    const u = await createUser({ email: "local@example.test" });
    centralSession({ active: false });
    localSession.current = { user: { id: u.id, status: "ACTIVE", role: "CUSTOMER", email: u.email } };
    expect(await getCurrentUser()).toMatchObject({ id: u.id });
  });

  it("enforced: the app's own sign-in is ignored", async () => {
    process.env.BKESARI_SSO_ENFORCE = "1";
    const u = await createUser({ email: "local2@example.test" });
    centralSession({ active: false });
    localSession.current = { user: { id: u.id, status: "ACTIVE", role: "CUSTOMER", email: u.email } };
    expect(await getCurrentUser()).toBeNull();
    await expect(requireUser()).rejects.toMatchObject({ status: 401 });
  });

  it("the central service being unreachable signs nobody in", async () => {
    cookieJar.set("__Host-bk_sso", `tok-down-${++tokenCounter}`);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    process.env.BKESARI_SSO_ENFORCE = "1";
    expect(await getCurrentUser()).toBeNull();
  });
});
