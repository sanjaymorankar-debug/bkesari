# Deployment

Any Node 20+ host that can reach a **PostgreSQL 14+** database works (CI and
local development use PostgreSQL 16). The app itself has so far been hosted on
Hostinger Node.js Web App Hosting, which auto-detects Next.js and runs
`npm run build` / `npm start`.

The database is **PostgreSQL on Neon**. Hostinger's shared and cloud web hosting
offers only MySQL/MariaDB, so the app runs there and its database lives on Neon.
Any other PostgreSQL 14+ works the same way (see the end of §1).

For the dev tier this is automated: pushing to `dev` deploys through
`.github/workflows/deploy-dev.yml`. See `DEPLOY.md` in the `bkesari-platform`
repository, Part 6, for the one-time secret setup. Everything below is the
manual procedure, and is still what test and production use.

## 1. Provision PostgreSQL on Neon

One Neon project, one branch per tier. On every branch the database is named
`bk_milk` and is owned by the role `bk_milk_app`:

| Neon branch | Serves | That server's `.env` holds |
|---|---|---|
| `production` | `bkesari.com/milk` | the production branch's two URLs, nothing else |
| `test` | `test.bkesari.com/milk` | the test branch's two URLs, nothing else |
| `dev` | `dev.bkesari.com/milk` | the dev branch's two URLs, nothing else |

A tier never connects to another tier's branch.

Create the role and the database on each branch in the Neon console (the
branch's Roles and Databases pages). Neon makes every role it creates a member
of `neon_superuser`, so `bk_milk_app` can run the migrations, and could create an
extension if a later migration needed one; none does today.

Then open **Connect** on the branch, pick database `bk_milk` and role `bk_milk_app`,
and copy the connection string twice:

| "Connection pooling" | Goes in | Used for |
|---|---|---|
| on (the host has `-pooler` in it) | `DATABASE_URL` | the app at runtime |
| off (the direct endpoint) | `DATABASE_URL_UNPOOLED` | `npm run db:migrate`, drizzle-kit, `pg_dump` |

The pooled endpoint is PgBouncer in transaction mode: right for the app, whose
work is short transactions, and wrong for DDL, session settings and long-lived
single connections, which is why migrations go direct. With
`DATABASE_URL_UNPOOLED` unset, migrations use `DATABASE_URL`, so a local
database or CI needs only the one variable.

Keep the `?sslmode=require&channel_binding=require` Neon puts on the end. The
app turns `sslmode=require` into TLS with the server certificate verified
(Neon's certificate is publicly trusted), and `channel_binding=require` into a
SCRAM login bound to that TLS channel whenever the server offers it, which
Neon's endpoints do. `sslmode=no-verify` skips the certificate check and exists
only for a provider whose CA Node does not trust. Characters such as
`@ : / # ?` in a password must be percent-encoded inside a URL.

Neon suspends an idle compute and drops its connections. The app expects that:
a dropped connection is logged as `[db] connection closed by the server`, a
transaction caught by it fails on its own, the next query opens a new
connection, and the 30-second connect timeout covers the compute's cold start. Keep `DATABASE_POOL_MAX` modest (the pooler accepts far
more clients than the compute has connections).

**Without Neon.** On a PostgreSQL server you run yourself, create the role and
database by hand, and do **not** use the `postgres` superuser for the app:

```sql
CREATE ROLE bk_milk_app LOGIN PASSWORD '<strong-password>';
CREATE DATABASE bk_milk OWNER bk_milk_app;
```

Owning the database lets the role run the migrations. Put its URL in
`DATABASE_URL` (add `?sslmode=require` unless it is on the same machine or a
private network), or fill in `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASS` and `DB_SSLMODE` instead. If there is a pooler in front, give the
direct address as `DATABASE_URL_UNPOOLED`.

## 2. Configure environment variables

Set these in the host's environment-variable UI — never commit them.

```bash
NODE_ENV=production
APP_ENV=prod
BASE_PATH=/milk
BASE_URL=https://bkesari.com/milk
DATABASE_URL=postgresql://bk_milk_app:<password>@<endpoint>-pooler.<region>.aws.neon.tech/bk_milk?sslmode=require&channel_binding=require
DATABASE_URL_UNPOOLED=postgresql://bk_milk_app:<password>@<endpoint>.<region>.aws.neon.tech/bk_milk?sslmode=require&channel_binding=require
DATABASE_POOL_MAX=5

AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://bkesari.com/milk

AUTH_GOOGLE_ID=<google oauth client id>
AUTH_GOOGLE_SECRET=<google oauth client secret>

CASHFREE_APP_ID=<live app id>
CASHFREE_SECRET_KEY=<live secret key>
CASHFREE_ENV=production

CRON_SECRET=<openssl rand -hex 32>
BOOTSTRAP_ADMIN_EMAILS=you@your-domain.com

APP_TIMEZONE=Asia/Kolkata
SUBSCRIPTION_CUTOFF_HOUR=20
```

Generate secrets properly:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -hex 32      # CRON_SECRET
```

`BOOTSTRAP_ADMIN_EMAILS` grants ADMIN on **first sign-in only**. Sign in once
with that address, verify you can reach `/admin`, then remove the variable.

### Google OAuth

In Google Cloud Console → APIs & Services → Credentials, create an OAuth 2.0
Web application client and set:

- Authorised JavaScript origin: `https://your-domain.com`
- Authorised redirect URI: `https://your-domain.com/api/auth/callback/google`

For a staging subdomain, add its origin and redirect URI to the **same** client
or create a separate one.

## 3. Deploy

Connect the GitHub repository in the hosting panel and select the branch. The
platform detects Next.js and handles the build.

Recommended branch mapping:

| Branch | Environment | Domain |
|---|---|---|
| `staging` | staging | `test.your-domain.com` |
| `main` | production | `your-domain.com` |

Promotion is a merge of `staging` into `main`, which is also the human approval
gate. Give each environment its **own database** and its own Cashfree keys — use
Cashfree sandbox keys on staging so no real money moves.

## 4. Run migrations

Migrations are plain SQL under `drizzle/` and are not run automatically, and
not on the app server either: a deploy ships neither `src/` nor the dev
dependencies the migrate script needs. Run them from a checkout, over the
tier's **direct** URL. The history starts from a single PostgreSQL baseline,
`drizzle/0000_postgres_baseline.sql`; `database/schema.sql` is the same schema
as one psql-runnable file (regenerate it with `scripts/dump-schema.sh`). Apply
one or the other to an empty database, not both — only `db:migrate` records
what it applied, so later migrations can follow it.

```bash
# Only this tier's direct URL is needed; no app secrets.
DATABASE_URL_UNPOOLED='<the branch's direct URL>' npm run db:migrate
# Prints "Migrations applied to the application database (DATABASE_URL_UNPOOLED)."

# The seed runs through the app's own configuration, so it needs the pooled
# URL and AUTH_SECRET/CRON_SECRET set (to anything; it uses neither).
DATABASE_URL='<the branch's pooled URL>' AUTH_SECRET=x CRON_SECRET=x \
  npm run db:seed -- --minimal     # reference data only — first deploy
```

A variable set in the shell beats `.env`, and a `DATABASE_URL` set in the
shell beats a `DATABASE_URL_UNPOOLED` from `.env`, so a command line always
names the database it acts on.

Use `--minimal` in production: it seeds roles, permissions and the dairy/bakery
catalogue, but **not** the demo shops.

Migration policy:

1. Back up before every migration (see §7).
2. Apply to staging first and exercise the app there.
3. Expand-then-contract for breaking changes: add the new column, backfill,
   switch the code, drop the old column in a later release.

## 5. Schedule the daily order engine

This is the step that makes subscriptions work. Without it, no daily orders are
generated and no wallets are debited.

```bash
# Daily at 05:00 IST
0 5 * * * curl -fsS -X POST https://your-domain.com/api/cron/daily-orders \
  -H "Authorization: Bearer $CRON_SECRET" >> /var/log/daily-orders.log 2>&1
```

Any scheduler works — the host's cron panel, GitHub Actions on a schedule, or an
external monitor. The job is idempotent, so a duplicate or retried run is
harmless.

Verify wiring without generating anything:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/daily-orders
# {"status":"ready","timezone":"Asia/Kolkata"}
```

Backfill a missed day:

```bash
curl -X POST https://your-domain.com/api/cron/daily-orders \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" -d '{"date":"2026-08-20"}'
```

The response reports `generated`, `skipped`, `alreadyExisted`, `walletFailures`,
`unavailable` and `errors`. **Alert on `errors` being non-empty and on
`generated` being 0 on a day you expect deliveries** — a silent scheduler
failure is the most damaging outage this system has, because customers simply
stop receiving milk.

## 6. Cashfree

1. Complete KYC and switch the account to Live mode.
2. Copy the live App ID and Secret Key into the environment, and set
   `CASHFREE_ENV=production`.
3. Add a webhook pointing at `https://your-domain.com/api/webhooks/cashfree`
   in the Cashfree dashboard — it authenticates with the same
   `CASHFREE_SECRET_KEY`, there is no separate webhook secret.

The wallet is credited only after the server independently confirms payment
with Cashfree's own API (never from anything the client reports), and
`payments.gateway_payment_id` is UNIQUE, so a replayed callback or a webhook
racing the browser callback cannot credit twice.

With no Cashfree credentials the app runs in **mock payment mode**, which is
correct for local development but must never reach production — confirm
`CASHFREE_APP_ID` is set before going live.

## 7. Backups

Wallet balances are money. Treat the database accordingly.

```bash
# Nightly logical backup, 30-day retention. pg_dump takes a consistent snapshot
# without locking the site out. -Fc is the compressed custom format pg_restore
# reads. Use a pg_dump whose major version is >= the server's.
0 2 * * * pg_dump -Fc "$DATABASE_URL_UNPOOLED" > /backups/dairy_$(date +\%F).dump && \
  find /backups -name 'dairy_*.dump' -mtime +30 -delete
```

Restore into an empty database with:

```bash
pg_restore --no-owner --no-privileges -d "$RESTORE_DATABASE_URL" /backups/dairy_<date>.dump
```

`pg_dump` goes over the direct URL, not the pooler. Neon also keeps the
branch's history for point-in-time restore; check the retention your plan
gives you rather than relying on it blindly.

- Enable point-in-time recovery (WAL archiving) if the provider offers it.
- Store backups off-host.
- **Restore-test quarterly.** An untested backup is a hypothesis, not a backup.

The ledger is append-only and self-verifying, so corruption is detectable:

```sql
-- Must return zero rows: every row's arithmetic must hold.
SELECT id FROM wallet_transactions
WHERE new_balance_paise <> previous_balance_paise + amount_paise;

-- Must return zero rows: no wallet may drift from its ledger.
SELECT w.id, w.balance_paise, COALESCE(SUM(t.amount_paise), 0) AS ledger_sum
FROM wallets w
LEFT JOIN wallet_transactions t ON t.wallet_id = w.id
GROUP BY w.id, w.balance_paise
HAVING w.balance_paise <> COALESCE(SUM(t.amount_paise), 0);
```

Run both as a scheduled integrity check and alert on any output.

## 7a. Moving existing data off MySQL

Until this change the app ran on MySQL (the dev tier's hPanel database,
`u879099820_main_milk_dev`). That database is not read by this version at all.
If it holds anything worth keeping, copy it across **before** pointing users at
the PostgreSQL deployment; if it only ever held test data, start fresh instead.

The table and column names are unchanged; only the types differ (UUIDs were
`varchar(36)` and become `uuid`, booleans were `tinyint(1)`, enums were inline
and become named PostgreSQL enum types, JSON becomes `jsonb`). So the approach
is: create the schema with this repo's migrations, then load **data only**.

1. Put the site in maintenance (or stop it) so nothing writes to MySQL.
2. Take a MySQL backup first (`mysqldump`, or phpMyAdmin → Export).
3. Create the empty PostgreSQL database and run `npm run db:migrate` against it.
4. Copy the rows with [pgloader](https://pgloader.readthedocs.io/) from MySQL
   into that existing schema, in data-only mode (no table creation, so the
   migrated types, constraints and defaults are kept). Run it with the MySQL
   session in UTC — the MySQL timestamps were written in UTC. Check the exact
   load-file options against the pgloader documentation for your version; a
   dump-and-convert script works too if pgloader is not available. Skip the
   three MySQL-only counter tables `shop_registration_seq`, `product_code_seq`
   and `grievance_ticket_seq`: on PostgreSQL those are real sequences.
5. Move the sequences past the numbers already issued, so new shops, products
   and grievances do not reuse a reference:

   ```sql
   SELECT setval('shop_registration_seq', COALESCE(MAX(substring(registration_number FROM 5)::bigint), 0) + 1, false) FROM shops;
   SELECT setval('product_code_seq',      COALESCE(MAX(substring(code FROM 2)::bigint), 0) + 1, false) FROM products;
   SELECT setval('grievance_ticket_seq',  COALESCE(MAX(substring(ticket_number FROM 5)::bigint), 0) + 1, false) FROM grievances;
   ```

6. Verify: compare row counts table by table, and run both ledger integrity
   queries from §7 — they must return zero rows.

The PostgreSQL schema also restores four foreign keys that the MySQL schema did
not have (`shops.registration_fee_id`, `shops.referral_code_id`,
`shop_payments.reversal_of_id`, `wallet_transactions.voucher_redemption_id`).
A row that points at something missing will be rejected during the load;
fix or null it in the source rather than dropping the constraint.

None of this has been rehearsed against the real dev database — do a trial run
into a scratch PostgreSQL database first.

## 8. Monitoring

Watch, at minimum:

| Signal | Why |
|---|---|
| Daily cron ran and `errors` is empty | Silent failure stops all deliveries |
| `subscription_orders` with `WALLET_INSUFFICIENT` | Customers needing a top-up |
| 5xx rate on `/api/checkout` and `/api/wallet/*` | Money paths |
| Wallet-vs-ledger drift (query above) | Financial integrity |
| Database connection pool saturation | `DATABASE_POOL_MAX` per app process |
| Shops stuck in `PENDING_APPROVAL` | Operator SLA |

Application logs go to stdout. The audit log (`audit_logs`) records every
sensitive mutation — approvals, classification changes, price changes, wallet
adjustments, refunds, role changes, order status changes — with actor, entity
and before/after values.

### Known scaling limit

Rate limiting is an in-process fixed-window counter, so a horizontally scaled
deployment gets N× the configured limit per window. For a single instance this
is fine. Before scaling out, replace the store in
`src/server/api/rate-limit.ts` with Redis — the interface is one function
(`enforceRateLimit`) and nothing else changes.

## 9. Rollback

The app is stateless; rolling back code is redeploying the previous commit.

**Database rollback is the risk.** Drizzle does not generate down-migrations, so:

- Prefer additive, backward-compatible migrations, so the previous release keeps
  working against the new schema.
- For a destructive change, write and test the reverse SQL *before* deploying.
- If a rollback needs a restore, put the app in maintenance first — restoring
  over a live wallet system loses real transactions.

Rollback checklist:

1. Redeploy the previous commit.
2. Confirm `/` and `/api/cron/daily-orders` (GET health) respond.
3. Run the ledger integrity queries from §7.
4. Check for `WALLET_INSUFFICIENT` subscription orders created during the
   incident and retry them once the cause is fixed.

## 10. Pre-launch checklist

- [ ] `AUTH_SECRET` and `CRON_SECRET` are freshly generated, not the dev defaults
- [ ] The database role is `bk_milk_app` (never a superuser), and this tier's `.env` holds only **its own** Neon branch's URLs
- [ ] `DATABASE_URL` is the pooled URL and `DATABASE_URL_UNPOOLED` the direct one, both ending `?sslmode=require&channel_binding=require`
- [ ] Google OAuth redirect URI matches the deployed domain exactly
- [ ] `CASHFREE_APP_ID` is set with `CASHFREE_ENV=production` — confirm the app is not in mock payment mode
- [ ] Migrations applied; `npm run db:seed -- --minimal` run once
- [ ] Daily cron scheduled **and observed to run successfully once**
- [ ] Signed in with the bootstrap admin, then removed `BOOTSTRAP_ADMIN_EMAILS`
- [ ] Backups scheduled and one restore tested
- [ ] Ledger integrity queries scheduled with alerting
- [ ] HTTPS enforced; HTTP redirects to HTTPS
- [ ] A real end-to-end purchase and a real subscription day verified in production
