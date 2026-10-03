# Deployment

Targets Hostinger Node.js Web App Hosting (which auto-detects Next.js and runs
`npm run build` / `npm start`), but nothing here is Hostinger-specific — any
Node 20+ host with a **MySQL 8.0.16+** database works. (8.0.16 is where MySQL
began enforcing `CHECK` constraints, which the schema relies on.)

For the dev tier this is automated: pushing to `dev` deploys through
`.github/workflows/deploy-dev.yml`. See `DEPLOY.md` in the `bkesari-platform`
repository, Part 6, for the one-time secret setup. Everything below is the
manual procedure, and is still what test and production use.

## 1. Provision MySQL

On Hostinger, hPanel → Databases → MySQL Databases creates the database and its
user together, and the host is `localhost`. Each tier gets its **own** database
and never connects to another's:

| Tier | Database |
|---|---|
| dev | `u879099820_main_milk_dev` |
| test | `u879099820_main_milk_test` (not created yet) |
| production | `u879099820_main_milk_prod` (not created yet) |

Database names are case-sensitive on Linux — match hPanel exactly.

Elsewhere, create the database and a dedicated application user by hand. Do
**not** use `root` for the app:

```sql
CREATE DATABASE dairy_bakery CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dairy_app'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT ALL PRIVILEGES ON dairy_bakery.* TO 'dairy_app'@'localhost';
FLUSH PRIVILEGES;
```

Fill in `DB_HOST`, `DB_NAME`, `DB_USER` and `DB_PASS` in the server's `.env`
(see `.env.example`), or give the whole connection string at once:

```
DATABASE_URL=mysql://dairy_app:<password>@localhost:3306/dairy_bakery
```

On Hostinger the database is local and the connection does not cross a network,
so no TLS is used. Against a managed provider that requires TLS, add `?ssl=true`
— the connection code reads that flag rather than assuming either way.

## 2. Configure environment variables

Set these in the host's environment-variable UI — never commit them.

```bash
NODE_ENV=production
APP_ENV=prod
DATABASE_URL=mysql://dairy_app:...@localhost:3306/dairy_bakery

AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://your-domain.com

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

Migrations are plain SQL under `drizzle/` and are not run automatically.

```bash
npm run db:migrate                 # apply pending migrations
npm run db:seed -- --minimal       # reference data only — first deploy
```

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
# Nightly logical backup, 30-day retention. --single-transaction keeps the dump
# consistent without locking the site out, and routines/triggers/events are not
# included by default.
0 2 * * * mysqldump --single-transaction --quick --routines --triggers --events \
  -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  | gzip > /backups/dairy_$(date +\%F).sql.gz && \
  find /backups -name 'dairy_*.sql.gz' -mtime +30 -delete
```

Restore with:

```bash
gunzip -c /backups/dairy_<date>.sql.gz \
  | mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME"
```

On Hostinger, hPanel → Files → Backups also takes database snapshots, and
phpMyAdmin → Export produces the same kind of dump through the browser if you
have no shell.

- Enable point-in-time recovery (binary logging) if the provider offers it.
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

## 8. Monitoring

Watch, at minimum:

| Signal | Why |
|---|---|
| Daily cron ran and `errors` is empty | Silent failure stops all deliveries |
| `subscription_orders` with `WALLET_INSUFFICIENT` | Customers needing a top-up |
| 5xx rate on `/api/checkout` and `/api/wallet/*` | Money paths |
| Wallet-vs-ledger drift (query above) | Financial integrity |
| Database connection pool saturation | `max: 20` in production |
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
- [ ] The database user is not `root`, and this tier points at its **own** database
- [ ] Google OAuth redirect URI matches the deployed domain exactly
- [ ] `CASHFREE_APP_ID` is set with `CASHFREE_ENV=production` — confirm the app is not in mock payment mode
- [ ] Migrations applied; `npm run db:seed -- --minimal` run once
- [ ] Daily cron scheduled **and observed to run successfully once**
- [ ] Signed in with the bootstrap admin, then removed `BOOTSTRAP_ADMIN_EMAILS`
- [ ] Backups scheduled and one restore tested
- [ ] Ledger integrity queries scheduled with alerting
- [ ] HTTPS enforced; HTTP redirects to HTTPS
- [ ] A real end-to-end purchase and a real subscription day verified in production
