#!/usr/bin/env node
/**
 * Smoke-probes a running Milk & Dairy server: the S5/S6 levels of TEST_SPEC.md.
 *
 *   SMOKE_BASE_URL=http://127.0.0.1:3102/milk \
 *   CRON_SECRET=<the server's> AUTH_SECRET=<the server's> \
 *   SMOKE_ADMIN_ID=<id of an ADMIN user> SMOKE_CUSTOMER_ID=<id of a CUSTOMER> \
 *   node scripts/smoke.mjs
 *
 * SMOKE_BASE_URL includes the base path the build was made with (/milk on
 * bkesari.com). The signed-in checks mint an Auth.js session cookie with
 * AUTH_SECRET for the user ids given, exactly as a real sign-in would; they are
 * skipped when those variables are unset. Run it against a seeded scratch
 * database (npm run db:seed): the shop-page check looks for the demo shop.
 *
 * Makes no change except POST /api/cron/daily-orders, which is idempotent. (Its
 * empty grievance submissions are refused before anything is written; they
 * spend the rate limit of two made-up visitors in 198.51.100.0/24.)
 * Only ever point it at a local server: it sends CRON_SECRET.
 */
import { encode } from "next-auth/jwt";

const base = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3102/milk").replace(/\/$/, "");
const { origin, pathname: basePath } = new URL(base);
const cronSecret = process.env.CRON_SECRET ?? "";
const authSecret = process.env.AUTH_SECRET ?? "";

let failures = 0;
let passes = 0;
let skips = 0;

function report(ok, name, detail = "") {
  if (ok === null) {
    skips += 1;
    console.log(`skip  ${name}${detail ? ` (${detail})` : ""}`);
  } else if (ok) {
    passes += 1;
    console.log(`ok    ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `: ${detail}` : ""}`);
  }
}

async function get(url, init = {}) {
  const response = await fetch(url, { redirect: "manual", ...init });
  return { status: response.status, location: response.headers.get("location"), body: await response.text() };
}

/** status must match; every string in `contains` must be in the body; none in `excludes`. */
async function check(name, url, { status, contains = [], excludes = [], location, init } = {}) {
  try {
    const r = await get(url, init);
    const problems = [];
    if (r.status !== status) problems.push(`status ${r.status}, expected ${status}`);
    for (const s of contains) if (!r.body.includes(s)) problems.push(`body lacks ${JSON.stringify(s)}`);
    for (const s of excludes) if (r.body.includes(s)) problems.push(`body contains ${JSON.stringify(s)}`);
    if (location && !(r.location ?? "").includes(location)) {
      problems.push(`redirects to ${r.location}, expected ${location}`);
    }
    report(problems.length === 0, name, problems.join("; "));
    return r;
  } catch (error) {
    report(false, name, error.message);
    return null;
  }
}

async function sessionCookie(userId) {
  const secure = origin.startsWith("https:");
  const name = secure ? "__Secure-authjs.session-token" : "authjs.session-token";
  const token = await encode({ token: { sub: userId }, secret: authSecret, salt: name });
  return `${name}=${token}`;
}

// Columns of a shop that must never reach an anonymous visitor.
const PRIVATE = ["panNumberEncrypted", "panHolderName", "amountPaidPaise", "pickupInstructions", "referralCodeId"];

console.log(`Smoke-probing ${base}\n`);

// --- Public pages, under the base path -------------------------------------
const home = await check("home page", base, { status: 200, contains: ["<title>"], excludes: PRIVATE });
const asset = home?.body.match(/(?:href|src)="([^"]*\/_next\/static\/[^"]+)"/)?.[1];
if (asset) {
  report(asset.startsWith(`${basePath === "/" ? "" : basePath}/_next/`), "asset URLs carry the base path", asset);
  await check("a static asset is served", new URL(asset, origin).href, { status: 200 });
} else {
  report(false, "home page references a /_next/static asset");
}
if (basePath !== "/") {
  await check("nothing is served at the bare origin", `${origin}/`, { status: 404 });
}
await check("demo shop page", `${base}/shops/kesari-dairy-farm`, {
  status: 200,
  contains: ["Kesari Dairy Farm", "Malai Paneer"],
});
await check("shops page", `${base}/shops`, { status: 200, excludes: PRIVATE });
await check("search page", `${base}/search?q=dairy`, { status: 200, excludes: PRIVATE });
await check("sign-in page", `${base}/signin`, { status: 200 });
await check("catalogue API", `${base}/api/catalogue`, { status: 200, contains: ['"products"'] });
const shopsApi = await check("public shops API", `${base}/api/shops`, { status: 200, excludes: PRIVATE });

// --- Refused without a session or a token ----------------------------------
await check("wallet API refuses anonymous", `${base}/api/wallet`, { status: 401 });
await check("cart API refuses anonymous", `${base}/api/cart`, { status: 401 });
let shopId;
try {
  shopId = JSON.parse(shopsApi?.body ?? "[]")[0]?.id;
} catch {
  shopId = undefined;
}
if (shopId) {
  await check("a shop's full record refuses anonymous", `${base}/api/shops/${shopId}`, { status: 401 });
} else {
  report(null, "a shop's full record refuses anonymous", "no approved shop to ask for");
}
await check("admin redirects anonymous to sign-in", `${base}/admin`, {
  status: 307,
  location: `${basePath}/signin`,
});
await check("cron refuses no token", `${base}/api/cron/daily-orders`, { status: 403, init: { method: "POST" } });
await check("cron refuses a wrong token", `${base}/api/cron/daily-orders`, {
  status: 403,
  init: { method: "POST", headers: { Authorization: "Bearer wrong-secret" } },
});
await check("dev settle endpoint is off in production", `${base}/api/dev/settle-topup`, {
  status: 404,
  init: { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
});
for (const path of [`${base}/.env`, `${base}/.env.example`, `${base}/package.json`, `${origin}/.env`]) {
  await check(`not served: ${path.replace(origin, "")}`, path, { status: 404 });
}

// --- The anonymous rate limit cannot be dodged ------------------------------
// The grievance form allows 5 submissions per visitor per 10 minutes. Behind a
// proxy, X-Forwarded-For reads "<whatever the visitor sent>, <visitor>,
// <proxy>": here the visitor 198.51.100.23 changes the part it controls on
// every request, through a hop on loopback. The bodies are empty, so the limit
// is spent but nothing is filed: 422 until the limit, then 429. A server whose
// quota for this visitor an earlier run already spent answers 429 sooner.
// Another visitor behind the same hop must still get through.
{
  const grievance = (forwardedFor) =>
    get(`${base}/api/grievances`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": forwardedFor },
      body: "{}",
    }).then((r) => r.status);
  const name = "grievance limit holds when the visitor rotates X-Forwarded-For";
  try {
    const statuses = [];
    for (let i = 1; i <= 6 && statuses.at(-1) !== 429; i += 1) {
      statuses.push(await grievance(`203.0.113.${i}, 198.51.100.23, 127.0.0.1`));
    }
    const other = await grievance(`203.0.113.99, 198.51.100.${100 + Math.floor(Math.random() * 150)}, 127.0.0.1`);
    const limited = statuses.at(-1) === 429 && statuses.slice(0, -1).every((s) => s === 422);
    report(limited && other === 422, name, `statuses ${statuses.join(" ")}; another visitor ${other}`);
  } catch (error) {
    report(false, name, error.message);
  }
}

// --- With the cron token ----------------------------------------------------
if (cronSecret) {
  const bearer = { Authorization: `Bearer ${cronSecret}` };
  await check("cron health with the token", `${base}/api/cron/daily-orders`, {
    status: 200,
    contains: ['"status":"ready"'],
    init: { headers: bearer },
  });
  await check("cron run with the token", `${base}/api/cron/daily-orders`, {
    status: 200,
    contains: ['"generated"', '"errors":[]'],
    init: { method: "POST", headers: bearer },
  });
} else {
  report(null, "cron with the token", "CRON_SECRET unset");
}

// --- Signed in ---------------------------------------------------------------
if (authSecret && process.env.SMOKE_ADMIN_ID) {
  const cookie = await sessionCookie(process.env.SMOKE_ADMIN_ID);
  await check("admin dashboard renders for an admin", `${base}/admin`, {
    status: 200,
    contains: ["Admin dashboard"],
    init: { headers: { cookie } },
  });
} else {
  report(null, "admin dashboard renders for an admin", "AUTH_SECRET or SMOKE_ADMIN_ID unset");
}
if (authSecret && process.env.SMOKE_CUSTOMER_ID) {
  const cookie = await sessionCookie(process.env.SMOKE_CUSTOMER_ID);
  await check("wallet API answers a signed-in customer", `${base}/api/wallet`, {
    status: 200,
    contains: ['"balancePaise"'],
    init: { headers: { cookie } },
  });
  await check("a customer cannot reach admin", `${base}/admin`, {
    status: 307,
    init: { headers: { cookie } },
  });
} else {
  report(null, "signed-in customer checks", "AUTH_SECRET or SMOKE_CUSTOMER_ID unset");
}

console.log(`\n${passes} passed, ${failures} failed, ${skips} skipped`);
process.exit(failures === 0 ? 0 : 1);
