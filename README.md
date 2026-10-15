> ## ⚠️ This repo and `GoKesari` are two separate brands now
>
> There are two repositories sharing an ancestor, and **work in one is invisible
> to the other**. As of 2026-10-08 the owner's decision is that they are
> deliberately separate: no code, content or database change to `*.bkesari.com`
> should affect `*.gokesari.com`, or the reverse. Verified against both `main`
> branches:
>
> | | this repo (`bkesari`) | [`GoKesari`](https://github.com/sanjaymorankar-debug/GoKesari) |
> |---|---|---|
> | Serves | `bkesari.com`, `dev.bkesari.com` (under `/milk`) | `gokesari.com`, `test.gokesari.com` |
> | Database | MySQL 8 | PostgreSQL 16 |
> | Commits | 44 | 273 |
> | Files under `src/` | 219 | 649 |
> | Commits not in the other | **18** | 239 |
> | Branding in `src/` | `Bkesari` ×3, `bkesari.com` ×3 | `GoKesari` ×55, `gokesari.com` ×12 |
> | `CNAME` | `test.bkesari.com` | `test.gokesari.com` |
>
> They share a root commit, and until 2026-10-02 this repo was a strict subset of
> `GoKesari` — every commit here was already there, including *"Rebrand Bkesari to
> GoKesari"*. PR #8 restored Bkesari branding here, #11 moved the admin list into
> `PERMANENT_ADMIN_EMAILS`, and #9 ported this app to MySQL, so the two now differ
> on brand, contact addresses and database engine alike. **The two databases can
> no longer be shared even in principle:** the migration histories diverged and
> the engines differ.
>
> `GoKesari` remains far ahead on features — 430 more files under `src/`. Porting
> anything between them means taking the hunk, not the file: a whole-file copy
> drags the other brand's addresses, or the other engine's SQL, across with it.
>
> Re-check the divergence at any time with:
>
> ```bash
> comm -23 <(git -C bkesari  log --format='%s' origin/main | sort -u) \
>          <(git -C GoKesari log --all --format='%s'        | sort -u)
> ```

# Dairy & Bakery Marketplace

A production-oriented marketplace for local dairy and bakery shops: wallet-based
payments, Kesari/Green shop classification, independent online/offline product
control, and a flexible daily subscription engine built around the daily-milk
use case.

Built from scratch. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design
rationale and [DEPLOYMENT.md](./DEPLOYMENT.md) for going live.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
MySQL 8 · Drizzle ORM · Auth.js (Google OAuth) · Zod · Cashfree ·
Vitest · Playwright

> Drizzle is used instead of Prisma. The reason is documented in
> [ARCHITECTURE.md §1.1](./ARCHITECTURE.md#11-deviation-drizzle-instead-of-prisma).

## Quick start

```bash
# 1. MySQL 8 (8.0.16+ — the schema relies on CHECK constraints)
#    macOS:  brew install mysql@8.0 && brew services start mysql@8.0
mysql -uroot -e "CREATE DATABASE dairy_bakery      CHARACTER SET utf8mb4;
                 CREATE DATABASE dairy_bakery_test CHARACTER SET utf8mb4;"

# 2. Configure
cp .env.example .env      # then fill in the values (see below)

# 3. Schema + reference data
npm install
npm run db:migrate        # applies to DATABASE_URL
npm run db:seed           # add --minimal for reference data only

# 4. The test database needs the schema too.
npm run db:migrate:test   # applies to TEST_DATABASE_URL, read from .env

# 5. Run
npm run dev               # http://localhost:3000
```

`.env.example` is written for the **dev server**, where this app is served under
`/milk` behind the hub at bkesari.com. Running it on your own machine, override
three values or the app will reference `/milk/_next/...` assets that nothing
serves locally:

```
BASE_PATH=                      # empty: served from the root of localhost
BASE_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
```

Sign in at `/signin`. In development an email-only form is available (disabled
in production builds); in production, Google OAuth is the only path.

The seed creates five demo shops in Pune, 18 categories and 40 products,
including one deliberately **offline-only** product (Malai Paneer at Kesari
Dairy Farm) so the online/offline rule is visible immediately.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | MySQL connection string, e.g. `mysql://root@localhost:3306/dairy_bakery` |
| `TEST_DATABASE_URL` | tests | Separate database for integration tests. `tests/setup.ts` points the app's connection at it, so the suite never touches development data |
| `AUTH_SECRET` | yes | Auth.js session encryption. Generate with `openssl rand -base64 32` |
| `AUTH_URL` | prod | Canonical app URL, e.g. `https://bkesari.com` (locally `http://localhost:3000`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | prod | Google OAuth client. Without these, Google sign-in is hidden |
| `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` | prod | Payment gateway. Without these the app runs in MOCK payment mode |
| `CASHFREE_ENV` | no | `sandbox` (default) or `production` |
| `CRON_SECRET` | yes | Bearer token guarding the daily-order endpoint |
| `BOOTSTRAP_ADMIN_EMAILS` | first deploy | Comma-separated emails granted ADMIN on first sign-in only — meant to be removed once that's done |
| `PERMANENT_ADMIN_EMAILS` | recommended | Comma-separated emails re-promoted to ADMIN on *every* session, not just first sign-in — for the accounts that must never be lockable-out even by an accidental or malicious role change. Meant to stay set (unlike `BOOTSTRAP_ADMIN_EMAILS`). No default — set it yourself; there is no hard-coded fallback (SEC-03) |
| `SUBSCRIPTION_CUTOFF_HOUR` | no | Delivery cutoff hour, default `20` |
| `APP_TIMEZONE` | no | IANA zone for delivery dates, default `Asia/Kolkata` |

An empty value (`FOO=`) is treated as unset.

## The daily order engine

Subscriptions materialise into orders through one idempotent job:

```bash
curl -X POST https://<host>/api/cron/daily-orders \
     -H "Authorization: Bearer $CRON_SECRET"
```

Schedule it once daily (any scheduler works — see DEPLOYMENT.md). It is safe to
run repeatedly: a `UNIQUE(subscription_id, delivery_date)` index means a second
run for the same day is a no-op, so retries, overlapping crons and manual
replays cannot double-charge. Pass `{"date":"YYYY-MM-DD"}` to backfill a day.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed reference + demo data (`-- --minimal` for reference only) |
| `npm run db:studio` | Browse the database |
| `npm test` | Unit + integration tests (needs `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Playwright end-to-end tests (needs a running dev server) |
| `npm run typecheck` | TypeScript, no emit |

## Roles

| Role | Can |
|---|---|
| **Customer** | Browse, cart, order, wallet, subscriptions, daily quantity changes |
| **Shop Owner** | Register a shop, manage own products/prices/stock, receive orders, view own sales |
| **Operator** | Approve/reject shops, set Kesari/Green, manage catalogue and orders, operational reports |
| **Administrator** | Everything, plus roles, wallet adjustments, system config, audit logs |

A new Google user becomes a **Customer** with a wallet automatically. Roles are
never accepted from a request — `OPERATOR` and `ADMIN` cannot be self-assigned.
Registering a shop promotes a Customer to Shop Owner.

**Shop owners cannot change their own Kesari/Green classification.** That is
operator/admin only, and every change is recorded with who, when and why.

## Key domain rules

**Money is integer paise; quantities are integer milli-units.** `₹70.00` is
`7000`; `2 L` is `2000`. No float ever touches a monetary value, and `±0.5 L`
steps stay exact.

**A product is purchasable online only if** the shop is `APPROVED`, the offering
is active and available, online selling is enabled, an online price exists, and
stock suffices. Enforced server-side on add-to-cart, checkout and every
subscription generation — and backed by database CHECK constraints.

**Completed orders keep their price forever.** Order lines snapshot the product
name and unit price, so a later price change affects only future orders.

**Subscription schedule resolution order:** subscription live → within
start/end window → not inside a pause window → weekday is scheduled → then a
per-date override may adjust or skip it. An override never creates a delivery on
an unscheduled day, and because it is scoped to one date the schedule reverts
automatically the next day.

## Testing

```bash
npm test                                    # 281 unit + integration tests
CHROMIUM_PATH=/path/to/chrome npm run test:e2e   # 10 E2E tests, desktop + mobile
```

Integration tests run against real MySQL, which is the point: the
concurrency, idempotency and constraint guarantees below cannot be proven
against a mock.

What the suite actually proves:

- Concurrent wallet debits serialise — 10 simultaneous ₹100 debits against ₹1,000 leave exactly ₹0, no lost updates
- Overdraw is impossible — 5 concurrent ₹100 debits against ₹250 yield exactly 2 successes and 3 rejections
- The ledger chain stays contiguous under 20 concurrent writes
- A replayed operation never double-charges, including 10 fired concurrently
- Forged, mismatched and cross-user payment signatures are all rejected before any credit
- Re-running the daily job (including 5 concurrent runs) creates one order and one deduction
- Skip and pause produce zero orders and zero deductions
- A price change applies to future days only; past order lines are frozen
- An insufficient balance takes no money, consumes no stock, marks the day, and can be retried after top-up
- Offline-only products cannot enter a cart or be ordered
- A shop owner cannot reclassify their own shop even with the route guard bypassed

## Project layout

```
src/
  server/
    db/          schema, client, migrations, seed
    services/    all business logic — pure, testable, no React
    authz/       permission matrix and guards
    api/         route-handler plumbing, rate limiting
  app/
    (pages)      home, dairy, bakery, shops, cart, wallet, subscriptions, admin, shop
    api/         route handlers — parse, authorize, delegate, respond
  components/    presentational only
  lib/           money, dates, errors, env
tests/
  unit/          pure logic
  integration/   real PostgreSQL
  e2e/           Playwright, desktop + mobile
```
