# Milk & Dairy — test specification

Milk & Dairy is the bkesari Next.js 16 marketplace (wallet payments,
subscriptions and the daily-orders engine), on PostgreSQL through Drizzle and
node-postgres. It is served at `bkesari.com/milk` (and `test.` / `dev.`),
behind a hub that forwards `/milk/` without stripping it, so every build is made
and started with `BASE_PATH=/milk`. Its database is PostgreSQL on Neon: the app
on the pooled endpoint, migrations on the direct one ([DEPLOYMENT.md §1](./DEPLOYMENT.md#1-provision-postgresql-on-neon)).
This spec says what "tested" means for a change to this repository: the
commands, the database they run against, what must never regress and what the
report looks like. It covers this repository only; the hub and the other
bkesari apps have their own. How the suite proves the money guarantees is in
[README.md § Testing](./README.md#testing); setup is in the README's Quick
start.

Testing agent: `.claude/agents/milk-tester.md`. It runs automatically after every
code change (the test gate, `.claude/hooks/test_gate.py`); run it by hand by
asking Claude to "run the milk-tester agent".

## 1. Scope

| Component | Path | Language / framework |
|---|---|---|
| Pages and API routes | `src/app/` | Next.js 16 App Router, React 19, TypeScript |
| Business logic | `src/server/services/` | TypeScript, Drizzle ORM |
| Authorization | `src/server/authz/`, `src/server/auth.ts` | Auth.js v5 (JWT sessions), permission matrix |
| Database layer | `src/server/db/` (`index.ts`, `ssl.ts`, `migrate.ts`, `schema.ts`, `seed.ts`), `drizzle/` | node-postgres 8, drizzle-kit, PostgreSQL 16 |
| Environment | `src/lib/env.ts`, `.env.example` | Zod |
| Base-path serving | `next.config.ts` | Next.js `basePath` |
| Deploy guard | `.github/deploy/guard.sh`, `guard.test.sh` | bash |
| Smoke probe | `scripts/smoke.mjs` | Node 22 |
| Tests | `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/helpers/fixtures.ts` | Vitest 4, Playwright 1.62 |

Out of scope:
- **Real Neon branches, Hostinger, Cashfree, Google OAuth and Google Maps.** No
  test may reach them. Cashfree runs in mock mode (`tests/setup.ts` clears
  `CASHFREE_APP_ID`); geocoding tests stub `fetch`.
- **The deploy workflow's remote steps** (SSH, rsync, restart). Only its guard
  rules are tested (`guard.test.sh`).
- **GoKesari**, the sibling repository: a separate brand and database.
- **The MySQL-to-PostgreSQL data move** (DEPLOYMENT.md §7a). It is a manual
  procedure with no script to test.

## 2. Environment

**Tools.** Node 22 and npm 10 (CI: `actions/setup-node` 22). PostgreSQL 16 (CI:
the `postgres:16` service; Mac: `brew install postgresql@16`). For the Neon
parity level: a PgBouncer ≥ 1.21 in transaction mode with TLS (Mac:
`brew install pgbouncer`). For E2E: a Chromium. Set `CHROMIUM_PATH` to it when
its build differs from the one Playwright 1.62 expects; Playwright's own
browser download is never needed.

**Scratch databases.** Two PostgreSQL databases, both owned by one
non-superuser role that is a member of a `neon_superuser` stand-in, as on Neon.
`npm test` **truncates every table** of the test database between tests, and the
smoke and E2E runs write to the app database, so neither may hold anything you
want to keep. `tests/setup.ts` refuses a `TEST_DATABASE_URL` whose host is not
`localhost`, `127.0.0.1` or `::1`. On the Mac:

```bash
psql postgres <<'SQL'
DO $$BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='neon_superuser')
  THEN CREATE ROLE neon_superuser NOLOGIN CREATEDB CREATEROLE; END IF; END$$;
DO $$BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='milk_scratch')
  THEN CREATE ROLE milk_scratch LOGIN PASSWORD 'milk_scratch'; END IF; END$$;
GRANT neon_superuser TO milk_scratch;
SQL
createdb -O milk_scratch milk_scratch        # app: smoke run and E2E
createdb -O milk_scratch milk_scratch_test   # suite: npm test
```

(The container this spec was measured in used role `t_milk` and databases
`t_milk` and `t_milk_test`. CI uses `postgres` and `dairy_bakery_test`.)

**Env vars.** The suite reads them from the shell or `.env`. Prefer the shell:
never put a hosted URL in a `.env` you test with.

| Variable | Suite (S2–S3) | Smoke (S5) | Value |
|---|---|---|---|
| `TEST_DATABASE_URL` | required | — | `postgresql://milk_scratch:milk_scratch@127.0.0.1:5432/milk_scratch_test` |
| `DATABASE_URL` | required by CI's migrate step; `tests/setup.ts` overwrites it with `TEST_DATABASE_URL` | required | suite: same as `TEST_DATABASE_URL`; smoke: the app database (pooled URL in N4) |
| `DATABASE_URL_UNPOOLED` | blank (forced blank by `tests/setup.ts`) | N2 only | the direct URL of the app database |
| `AUTH_SECRET` | blank is fine (setup fills it) | required | any string, e.g. `local-only-secret` |
| `CRON_SECRET` | blank is fine | required | any string, e.g. `local-only-cron` |
| `BASE_PATH` | — | `/milk` at build **and** start | `/milk` |
| `BASE_URL`, `AUTH_URL` | — | yes | `http://127.0.0.1:3102/milk` |
| `APP_ENV` | — | `dev` | `dev` |
| `NODE_EXTRA_CA_CERTS` | — | when the local TLS CA is not trusted | path to a bundle with that CA. Never turn verification off in code |
| `CASHFREE_*`, `GST_/PAN_PROVIDER_API_KEY`, `PERMANENT_/BOOTSTRAP_ADMIN_EMAILS` | forced by `tests/setup.ts` | leave blank (mock payments) | blank |
| `PAN_ENCRYPTION_KEY`, `GOOGLE_MAPS_SERVER_API_KEY` | filled by `tests/setup.ts` | blank is fine | blank |

**Ports.** Smoke server `3102`. E2E dev server `3102`, run after the smoke
server has stopped. PostgreSQL `5432`, PgBouncer `6432` (Neon parity only).

**One-time setup.**

```bash
npm ci
TEST_DATABASE_URL=postgresql://milk_scratch:milk_scratch@127.0.0.1:5432/milk_scratch_test npm run db:migrate:test
DATABASE_URL=postgresql://milk_scratch:milk_scratch@127.0.0.1:5432/milk_scratch npm run db:migrate
DATABASE_URL=postgresql://milk_scratch:milk_scratch@127.0.0.1:5432/milk_scratch \
  AUTH_SECRET=x CRON_SECRET=x npm run db:seed     # 5 demo shops, 373 products; smoke and E2E need them
```

Each migrate prints `Migrations applied to … (<variable>)` and is a no-op when
run again. Re-run the seed before each smoke run if E2E has run on that
database; it is idempotent.

## 3. Standard suite

Run in order, from the repository root, with the suite variables exported.
Record exit code, counts and duration for each.

| # | Level | Command | Passes when |
|---|---|---|---|
| S1a | static | `npm run typecheck` | exit 0 |
| S1b | static | `npx eslint src tests --ext .ts,.tsx` (the CI form) | exit 0, **0 errors**. Warnings are counted and must not exceed the baseline |
| S1c | schema | `npx drizzle-kit generate 2>&1 \| tee /tmp/milk-drift.log; grep -q "No schema changes, nothing to migrate" /tmp/milk-drift.log && test -z "$(git status --porcelain drizzle/)"` | the grep matches and `drizzle/` is unchanged. drizzle-kit exits 0 even when it writes a migration, so only the output counts. If it wrote one, delete that file and report the drift |
| S1d | schema | `npm run db:migrate:test`, run twice | both exit 0 and print `(TEST_DATABASE_URL)`: the baseline applies, and re-applying is a no-op |
| S2 | unit | `npx vitest run tests/unit` | exit 0, all pass, count ≥ baseline |
| S3 | integration | `npx vitest run tests/integration` | exit 0, all pass, count ≥ baseline. Real PostgreSQL: row locks, unique and CHECK constraints |
| S4 | build | `BASE_PATH=/milk BASE_URL=http://127.0.0.1:3102/milk APP_ENV=dev DATABASE_URL=<app db> AUTH_SECRET=x CRON_SECRET=x npm run build` | exit 0. The build never connects to the database but needs the three variables |
| S5 | smoke | Start: `BASE_PATH=/milk … npx next start -p 3102 -H 127.0.0.1` with the smoke variables (DATABASE_URL = the seeded app database). Create a signed-in admin and customer once: `psql "<app db>" -Atc "INSERT INTO users (email,name,role) VALUES ('smoke-admin@test.local','Smoke Admin','ADMIN') ON CONFLICT (email) DO UPDATE SET role='ADMIN' RETURNING id"` gives `SMOKE_ADMIN_ID`, and `psql "<app db>" -Atc "WITH u AS (INSERT INTO users (email,name,role) VALUES ('smoke-customer@test.local','Smoke Customer','CUSTOMER') ON CONFLICT (email) DO UPDATE SET role='CUSTOMER' RETURNING id) INSERT INTO wallets (user_id) SELECT id FROM u ON CONFLICT (user_id) DO UPDATE SET user_id = excluded.user_id RETURNING user_id"` gives `SMOKE_CUSTOMER_ID`. Then `SMOKE_BASE_URL=http://127.0.0.1:3102/milk SMOKE_ADMIN_ID=<id> SMOKE_CUSTOMER_ID=<id> CRON_SECRET=… AUTH_SECRET=… node scripts/smoke.mjs`. Stop the server | `27 passed, 0 failed, 0 skipped`. Covers: home 200, asset URLs under `/milk/_next/` and served, bare origin 404, demo shop page lists Kesari Dairy Farm and Malai Paneer, shops, search, sign-in and catalogue 200, `/admin` 200 "Admin dashboard" for an admin (the #12 500), cron GET health `"status":"ready"` and POST run with `"errors":[]`, and the grievance rate limit holding while the visitor rotates `X-Forwarded-For` (behind a loopback hop: 422 to the limit, then 429; another visitor still 422). Its empty bodies file nothing, and a second run on the same server passes too |
| S6a | security | the S5 run | the same 27 include: `/api/wallet`, `/api/cart` and `/api/shops/{id}` give 401 anonymous; `/admin` gives 307 to `/milk/signin` anonymous and 307 for a customer; cron 403 with no token or a wrong one; `/api/dev/settle-topup` 404 in production; `/milk/.env`, `/milk/.env.example`, `/milk/package.json` and `/.env` 404; no PAN, fee or pickup column in the home, shops and search pages or `/api/shops` |
| S6b | hygiene | `git ls-files \| grep -E '(^\|/)\.env($\|\.)' \| grep -v '^\.env\.example$'` and `git grep -nIE 'npg_[A-Za-z0-9]{8,}\|AKIA[0-9A-Z]{16}\|-----BEGIN [A-Z ]*PRIVATE KEY-----\|ghp_[A-Za-z0-9]{30,}' -- . ':!package-lock.json'` | both print nothing (`npg_` is how Neon passwords begin) |
| S6c | dependencies | `npm audit --omit=dev` | report only: list each high or critical advisory under *Open items*. Fix it only when the fix stays inside the declared range and needs no code change |
| S7 | E2E | In a separate `git worktree` with the change applied (so `next dev` cannot touch this tree's `AGENTS.md`): `npm ci`; seed the app database; `DATABASE_URL=<app db> AUTH_SECRET=x CRON_SECRET=<c> AUTH_URL=http://localhost:3102 BASE_URL=http://localhost:3102 BASE_PATH= npx next dev -p 3102`; then `CRON_SECRET=<c> CHROMIUM_PATH=<chrome> E2E_BASE_URL=http://localhost:3102 npx playwright test --output=<scratch dir>`; stop the server | `10 passed` (5 tests × desktop and mobile). It needs `next dev`: its sign-in is the development-only login. It also needs an empty `BASE_PATH`, because its paths are root-relative. Keep `--output` outside the tree: `test-results/` is not git-ignored |

**N — Neon parity.** These prove the app behaves as it will on Neon. They need a
TLS PostgreSQL (the direct endpoint) and a TLS PgBouncer in transaction mode in
front of it (the pooled endpoint), both on this machine:
- `PARITY_DIRECT_URL`, e.g. `postgresql://milk_scratch:milk_scratch@127.0.0.1:5432/milk_scratch?sslmode=require&channel_binding=require`
- `PARITY_POOLED_URL`, e.g. `postgresql://milk_scratch:milk_scratch@127.0.0.1:6432/milk_scratch?sslmode=require&channel_binding=require`
- `PARITY_POOLED_TEST_URL`: the pooled URL of the test database

A minimal PgBouncer for the Mac needs `pool_mode = transaction`,
`max_prepared_statements = 1000`, `client_tls_sslmode = require`, a key and
certificate, and `auth_type = scram-sha-256`. Without one, N3 to N5-pooled are
**SKIPPED** with the reason "no pooled endpoint", and N1, N2 and N5-direct
still run (N2 then without TLS).

| # | Check | Command | Passes when |
|---|---|---|---|
| N1 | Neon's URL string is accepted | part of S2: `tests/unit/db-ssl.test.ts` and `tests/unit/env-database-urls.test.ts` | `sslmode=require&channel_binding=require` gives verified TLS plus `enableChannelBinding`, and migrations prefer `DATABASE_URL_UNPOOLED` |
| N2 | migrations over the direct URL, TLS, non-superuser, no app secrets | `env -i PATH="$PATH" HOME="$HOME" NODE_EXTRA_CA_CERTS="$NODE_EXTRA_CA_CERTS" DATABASE_URL=postgresql://nobody:x@127.0.0.1:1/none DATABASE_URL_UNPOOLED="$PARITY_DIRECT_URL" npm run db:migrate`, twice. Then `psql "$PARITY_DIRECT_URL" -Atc "select rolsuper from pg_roles where rolname = current_user"` and `psql "$PARITY_DIRECT_URL" -c "BEGIN; CREATE EXTENSION citext; CREATE EXTENSION btree_gist; CREATE EXTENSION pgcrypto; ROLLBACK;"` | both migrate runs print `(DATABASE_URL_UNPOOLED)` (the bogus `DATABASE_URL` proves the direct one was used); `rolsuper` is `f`; the extensions create and roll back without error |
| N3 | the whole suite through the pooler | `TEST_DATABASE_URL="$PARITY_POOLED_TEST_URL" npm test` (with `NODE_EXTRA_CA_CERTS` when the pooler's certificate comes from a local CA) | all pass, the same count as R1. This proves `SELECT … FOR UPDATE` locking, the concurrency tests and `pg_terminate_backend` recovery (`tests/integration/db-connection.test.ts`) through PgBouncer |
| N4 | smoke on the pooled URL | S5 with `DATABASE_URL="$PARITY_POOLED_URL"` (and the S4 build) | 27 passed |
| N5 | server terminates idle connections | with the N4 server up: run the smoke once, wait 5 s, then `psql "$PARITY_DIRECT_URL" -Atc "SELECT count(*) FILTER (WHERE pg_terminate_backend(pid)) FROM pg_stat_activity WHERE usename = current_user AND pid <> pg_backend_pid()"`, then check the server is still running and run the smoke again. Repeat with the server started on `PARITY_DIRECT_URL` (N5-direct) | the server process is still running; the next request returns 200 and the second smoke run passes 27/27. For N5-direct, the server log shows `[db] connection closed by the server: terminating connection due to administrator command` |

## 4. Regression suite

**R1. The full suite.** `npm test` (that is, `vitest run`: every file in
`tests/**/*.test.ts`, one worker, files in series; keep `maxWorkers: 1`).
Exit 0, every test passes, counts ≥ the baseline in §5.

**R2. Critical regressions.** Each must hold on every run.

| ID | Behaviour | How it is checked |
|---|---|---|
| MILK-CR-01 | Concurrent wallet debits serialise and can never overdraw; the ledger chain stays contiguous | `tests/integration/wallet.test.ts` › "serialises concurrent debits without losing updates", "never lets concurrent debits push the balance negative", "keeps the ledger chain contiguous under concurrent writes" |
| MILK-CR-02 | A replayed money operation never double-charges | `wallet.test.ts` › "deduplicates even when replays are fired concurrently"; `checkout.test.ts` › "re-submitting the same request id does not charge twice" |
| MILK-CR-03 | Payment settlement is a compare-and-swap (CREATED to SUCCESS): forged, cross-user and replayed callbacks credit nothing, and a webhook racing the client credits once | `payments.test.ts` › "rejects a forged signature and credits nothing", "refuses to let one user settle another user's payment", "survives concurrent duplicate callbacks"; `payments-voucher.test.ts` › "the webhook path and the client-verify path racing produce exactly one credit"; `cashfree-order-confirmation.test.ts` › "fails closed when Cashfree reports no successful attempt yet" |
| MILK-CR-04 | The stock compare-and-swap sells the last units once, charges only the winners and keeps `inventory_movements` exact | `stock-concurrency.test.ts` (all three tests); N3 runs them through the pooler |
| MILK-CR-05 | A guarded `UPDATE … RETURNING` never reports a row it did not write | `returning-atomicity.test.ts` › "never reports a row it did not write, even when a concurrent writer invalidates the guard" |
| MILK-CR-06 | The daily-orders engine is idempotent (including 5 concurrent runs), skip and pause charge nothing, and an insufficient balance takes nothing and can be retried | `subscription-engine.test.ts` › "running the job twice for the same day changes nothing", "survives five concurrent runs of the same day", "a skipped day produces no order and no deduction", "does not deduct, marks the day WALLET_INSUFFICIENT, and allows a retry" |
| MILK-CR-07 | The cron endpoint needs `Bearer $CRON_SECRET`: 403 without it, health check with it; tokenless requests get 403, never 429, and cannot use up the scheduler's rate limit | `tests/integration/cron-rate-limit.test.ts` (both); S5 checks "cron refuses no token", "cron refuses a wrong token", "cron health with the token", "cron run with the token"; E2E "the cron endpoint rejects a missing or wrong token" |
| MILK-CR-08 | RBAC: roles never come from a request, owners cannot reclassify their shop, operators cannot approve their own price proposals, no IDOR across shops | `authorization.test.ts` › "refuses a shop owner even if the route guard were bypassed", "refuses to let an actor change their own role, even an admin"; `price-approval.test.ts` › "refuses to let an operator approve their own proposal (§7, §17)", "refuses to let one shop owner decide another shop's updates (IDOR)" |
| MILK-CR-09 | SEC-03: no admin is bootstrapped unless a variable names one | `tests/unit/env-admin-emails.test.ts` (all); `authorization.test.ts` › "SEC-03 fixed: bootstraps no admin emails by default — no hard-coded fallback" |
| MILK-CR-10 | `/admin` renders for an admin on PostgreSQL (#12 was a 500), and its aggregates come back as numbers | S5 "admin dashboard renders for an admin"; `admin-dashboard-aggregates.test.ts` (all) |
| MILK-CR-11 | Served under `/milk`: assets carry the prefix, nothing at the bare origin, sign-in redirect stays under `/milk` | S5 "asset URLs carry the base path", "a static asset is served", "nothing is served at the bare origin", "admin redirects anonymous to sign-in" |
| MILK-CR-12 | No private shop data reaches the public: public search returns an allowlist of columns, and a shop's full record needs its owner or an admin | `shop-privacy.test.ts` › "never returns a shop's private columns"; S5 "public shops API", "shops page", "search page", "a shop's full record refuses anonymous" |
| MILK-CR-13 | Offline-only products can be seen but never bought online | `authorization.test.ts` › "blocks an offline-only product with the right message (§12)", "refuses add-to-cart and explains why"; E2E "can be seen but not bought online" |
| MILK-CR-14 | Migrations apply on an empty database, re-apply as a no-op, run over the direct URL without app secrets, and match `schema.ts` | S1c, S1d, N2; `env-database-urls.test.ts` |
| MILK-CR-15 | Neon connection behaviour: the exact Neon URL gives verified TLS and channel binding, and a connection the server terminates (idle in the pool, or checked out mid-transaction) fails at most that transaction, never the process | `db-ssl.test.ts` › "accepts Neon's exact connection string: verified TLS plus channel binding"; `db-connection.test.ts` › "listens for errors from idle connections", "answers the next query after the server terminates its idle connections", "fails a transaction cleanly when the server drops its connection mid-way"; N5 |
| MILK-CR-16 | Reference numbers (P…, BKS-…, GRV-…) stay distinct under concurrent inserts | `reference-sequences.test.ts` (all) |
| MILK-CR-17 | The deploy guard refuses test, production, gokesari.com and a non-dev branch | `bash .github/deploy/guard.test.sh`: `32 passed, 0 failed` |
| MILK-CR-18 | The tests cannot reach a hosted database | `tests/setup.ts` refuses a non-local `TEST_DATABASE_URL`. Check: `TEST_DATABASE_URL=postgresql://u:p@ep-x.neon.tech/milk npx vitest run tests/unit/schedule.test.ts` must fail with "must point at a database on this machine" |
| MILK-CR-19 | An anonymous rate limit (grievance submission and lookup, cron) cannot be dodged by forging `X-Forwarded-For`: the key is the first address from the right that is not loopback or in `TRUSTED_PROXIES`, and anything unreadable falls to one shared `unknown` bucket | `tests/unit/rate-limit-client-key.test.ts` (all); S5 "grievance limit holds when the visitor rotates X-Forwarded-For" |

**R3. Change-area map.** Emphasise these when a path changes. Everything in R1
and R2 still runs.

| Path | Emphasise |
|---|---|
| `src/server/db/**`, `src/lib/env.ts`, `drizzle/**`, `drizzle.config.ts`, `package.json` / `package-lock.json` (pg, drizzle) | S1c, S1d, all of N (mandatory, not skippable while a pooled endpoint exists), CR-05, CR-14, CR-15, CR-16 |
| `src/server/services/wallet.ts`, `payments.ts`, `vouchers.ts`, `src/app/api/wallet/**`, `api/webhooks/**` | CR-01, CR-02, CR-03; N3 |
| `src/server/services/orders.ts`, `catalogue.ts`, `cart.ts`, `api/checkout/**` | CR-02, CR-04, CR-13; N3 |
| `src/server/services/subscriptions.ts`, `src/app/api/cron/**`, `src/lib/dates.ts` | CR-06, CR-07; S5 cron checks |
| `src/server/authz/**`, `src/server/auth.ts`, `src/server/services/users.ts`, `price-requests.ts` | CR-08, CR-09; S6a; E2E access-control tests |
| `src/server/services/shops.ts`, `src/app/api/shops/**`, `src/components/shop-grid.tsx`, `src/app/page.tsx`, `shops/**`, `search/**` | CR-12; S6a |
| `src/app/admin/**` | CR-10; S5 admin check |
| `src/server/api/rate-limit.ts`, `src/app/api/grievances/**`, `TRUSTED_PROXIES` in `src/lib/env.ts` | CR-19; S5 grievance rate-limit check; CR-07 and `cron-rate-limit.test.ts` (the cron route checks the token before it counts) |
| `next.config.ts`, `src/app/layout.tsx`, anything building URLs (`BASE_URL`, links, `fetch("/api/…")` in components) | CR-11; S4 and S5 under `/milk`; S7 |
| `.github/deploy/**`, `.github/workflows/**` | CR-17; review that CI still has one local PostgreSQL and no Neon URL |
| `tests/setup.ts`, `tests/helpers/**`, `vitest.config.ts` | CR-18; R1 counts; keep `maxWorkers: 1` and `fileParallelism: false` |
| `tests/e2e/**`, `playwright.config.ts`, `src/components/**` | S7 |

**R4. Baseline comparison.** Compare each level's counts with §5. A count that
goes down, a new skip, a new lint warning or a new failing smoke check is a
failure even when nothing is red. A count that goes up (a test added) is
fine; say so in the report.

## 5. Baseline

Measured on 2026-10-24 in a Linux container (Node 22.22.0, npm 10.9.4,
PostgreSQL 16.15, PgBouncer 1.22 in transaction mode with TLS on 6432, a local
TLS CA via `NODE_EXTRA_CA_CERTS`, Chromium 1243 for Playwright 1.62.1). The
branch was `claude/fervent-bell-wcmmdu`. The first run is the tree as merged
at `591fadf` (#16 plus the testing framework). The second adds that run's fixes
and the tests they brought, committed as `f0b074e`. The third, the same day,
adds the `clientKey` fix (MILK-CR-19) with 13 unit tests and one smoke check, and
the cron route checking its token before it counts (2 integration tests);
**the third run's counts are the baseline**. The first two columns are history.

| Level | First run (591fadf as merged) | Second run (591fadf + fixes = f0b074e) | Third run (f0b074e + `clientKey` and cron-order fixes, baseline) |
|---|---|---|---|
| S1a typecheck | pass, 25 s | pass, 22 s | pass, 9 s |
| S1b lint | 0 errors, 2 warnings (`src/app/api/shop-products/[id]/route.ts:88-89`), 23 s | 0 errors, 2 warnings (the same two), 23 s | 0 errors, 2 warnings (the same two), 15 s |
| S1c schema drift | not run | "No schema changes", `drizzle/` unchanged, 3 s | "No schema changes", `drizzle/` unchanged, 2 s |
| S1d migrate twice | pass | pass, 2 s | pass, 1 s |
| S2 unit | not run separately | 6 files, 50 tests, 50 passed, 0 skipped, 10 s | 7 files, 63 tests, 63 passed, 0 skipped, 7 s |
| S3 integration | not run separately | 28 files, 263 tests, 263 passed, 0 skipped, 148 s | 29 files, 265 tests, 265 passed, 0 skipped, 96 s |
| R1 `npm test` | 30 files, 296 tests, 296 passed, 0 skipped, 114 s | 34 files, 313 tests, 313 passed, 0 skipped, 124 s | **36 files, 328 tests, 328 passed, 0 skipped**, 106 s |
| S4 build (`BASE_PATH=/milk`) | pass, 51 s | pass, 31 s | pass, 16 s |
| S5 + S6a smoke | not available (no script); by hand, `/api/shops` and the home, shops and search pages leaked private shop columns | 26 passed, 0 failed, 0 skipped, 1 s | 27 passed, 0 failed, 0 skipped, 2 s (and 27 again on the same server) |
| S6b hygiene | nothing tracked, no secrets | nothing tracked, no secrets | nothing tracked, no secrets |
| S6c `npm audit --omit=dev` | 7 advisories: 1 critical (`next` 16.3.1), 4 high (`zod`, `sharp`, `source-map-js`, `brace-expansion`), 2 moderate (`exceljs`, `uuid`) | the same 7 (report only) | the same 7 (report only) |
| S7 E2E | 8 passed, 2 failed (the stale top-up step) | 10 passed, 0 failed, 45 s | 10 passed, 0 failed, 47 s |
| N2 migrations over direct TLS | failed without `AUTH_SECRET` and `CRON_SECRET` | pass twice, `(DATABASE_URL_UNPOOLED)`, `rolsuper` = `f`, extensions OK | pass twice, `(DATABASE_URL_UNPOOLED)`, `rolsuper` = `f`, extensions OK |
| N3 suite through the pooler | not run | 34 files, 313 passed, 0 skipped, 145 s | 36 files, 328 passed, 0 skipped, 124 s |
| N4 smoke on the pooled URL | not run | 26 passed | 27 passed |
| N5 terminate idle connections | the pool had no `error` listener: a terminated idle client was an unhandled error | pooled: 5 terminated, server alive, 200, smoke 26/26; direct: 14 terminated, server alive, 200, smoke 26/26, 10 `connection closed by the server` lines | pooled: 7 terminated, server alive, 200, smoke 27/27; direct: 15 terminated, server alive, 200, smoke 27/27, 10 `connection closed by the server` lines |
| guard.test.sh | 32 passed | 32 passed | 32 passed |

No skips are expected anywhere. Before the move to PostgreSQL, the suite on
MySQL 8.0.46 was 28 files and 284 tests, and took 591 s.

## 6. Pass criteria

- **PASS**: every level in §3 ran (or an N check was SKIPPED for the stated
  reason "no pooled endpoint", on a change outside the database rows of R3);
  every one is green; every count is at or above §5; every R2 row holds; and
  nothing above S4 is open. Dependency advisories (S6c) are reported and do not
  decide the verdict.
- **FAIL**: a defect above S4 is still open after the fix loop (three rounds at
  most).
- **BLOCKED**: a level could not run: no PostgreSQL, no Chromium, `npm ci`
  failing, a hard rule (a URL that is not local and scratch), or N skipped on a
  change to the database layer.

## 7. Defect handling

| Severity | Meaning | Example from this project |
|---|---|---|
| S1 | data loss, security, money, or the app does not start | a double credit under a webhook race; the public home page serialising every shop's PAN fields; the app process exiting when Neon drops an idle connection |
| S2 | a feature broken | `/admin` answering 500 (#12); `npm run db:migrate` failing in a fresh checkout because it demanded `AUTH_SECRET` |
| S3 | degraded, with a workaround | `inventory_movements` recording stale `previous_units` under concurrent orders while the stock itself stays right; one pool per bundle copy opening twice `DATABASE_POOL_MAX` connections |
| S4 | cosmetic | an unused-variable lint warning; a stale test count in README |

The agent may fix on its own, with a test that fails without the fix: product
code under `src/`, tests whose expectation the code's documented behaviour
proves wrong (with the evidence in the report), test fixtures, `scripts/`, the
docs, and `.env.example`. It reports instead of fixing: dependency upgrades
beyond the declared range (for example `next`, pinned at `16.3.1`), anything
that needs a real Neon branch, Hostinger, Cashfree or Google, schema changes
that need a new migration, and workflow changes beyond comments and notes.

Never: skip, disable, delete or loosen a test, or change an expected value to
match wrong output; point any URL at a hosted database or a real tier; edit a
`.env`; commit, push or deploy; run `next dev` in this working tree (it may
rewrite `AGENTS.md`); leave a server running.

## 8. Report format

Written to `.claude/test-runs/<UTC yyyymmdd-hhmmss>-milk-tester.md` and copied
to `.claude/test-runs/latest-milk-tester.md`:

```markdown
# milk-tester report — <UTC date and time>

- Commit: <short sha> on <branch> (+ uncommitted changes: yes/no)
- Changed files: <list, each mapped to an R3 row>
- Environment: Node <v>, PostgreSQL <v>, PgBouncer <v or "none">, Chromium <path>
- Databases: <app db>, <test db> (role <role>, superuser: no)

## Results

| Level | Command | Result | Counts (tests/passed/failed/skipped) | Duration | vs baseline |
|---|---|---|---|---|---|
| S1a … S7, N1 … N5, R1 | … | PASS/FAIL/SKIPPED (reason) | … | … | = / +n / −n |

## Critical regressions

| ID | Result | Evidence |
|---|---|---|
| MILK-CR-01 … 18 | held / broken | test name or probe output |

## Defects

| ID | Severity | Area | Symptom | Root cause | Fix | Files | Test added | Status |
|---|---|---|---|---|---|---|---|---|

## Re-test

<the failing tests run alone, then the complete standard and regression suites: results table as above>

## Open items

<anything not fixed, every dependency advisory of high or critical severity, every skipped check and why>

TESTER: milk-tester
VERDICT: PASS | FAIL | BLOCKED
```

## 9. Known gaps

- **No real Neon.** N1 to N5 stand in for it locally. Neon's own proxy, its SNI
  routing (the endpoint id in the hostname) and a real compute suspend and cold
  start are not exercised. node-postgres sends SNI for any hostname, but only a
  deploy to the dev branch proves it.
- **Channel binding cannot be required by node-postgres.** `channel_binding=require`
  is honoured as libpq's `prefer`: the login is bound to the TLS channel when
  the server offers SCRAM-SHA-256-PLUS (Neon's endpoints and PostgreSQL do;
  PgBouncer does not), and falls back otherwise. TLS itself is required and
  verified either way.
- **E2E is not in CI and does not run under `/milk`.** It needs `next dev`
  (development login) and root-relative paths. S7 runs it locally; S5 covers
  `/milk`.
- **The OAuth and Cashfree production paths.** Google sign-in and live Cashfree
  confirmation are covered only by unit and integration tests with stubs;
  `/api/auth/callback/google` under `/milk` is unverified.
- **The seed needs app secrets.** `npm run db:seed` loads the full app
  configuration, so it wants `AUTH_SECRET` and `CRON_SECRET` set to something
  (it uses neither); `db:migrate` no longer does.
- **`database/schema.sql` drift.** It is regenerated by `scripts/dump-schema.sh`,
  which creates and drops a throwaway database and so needs a role with
  `CREATEDB`. On the Mac: `PG_ADMIN_URL=postgresql://localhost/postgres sh scripts/dump-schema.sh && git diff --exit-code database/schema.sql`.
  It is not a standard level because it needs that extra database.
- **The live proxy chain is not known.** Whether Hostinger's front end appends to
  `X-Forwarded-For` or replaces it, and how many hops there are, is confirmed
  only on a live deploy (DEPLOYMENT.md §2, "Trusted proxies"). The tests model
  the chain as `<forged>, <visitor>, <proxy>`; the smoke check sends it to
  `next start` directly, with a loopback hop at the end.
- **No load tests, no accessibility audit, no visual checks.** Rate limiting is
  in-process and not tested across instances.
