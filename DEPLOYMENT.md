# Deployment

Targets Hostinger Node.js Web App Hosting (which auto-detects Next.js and runs
`npm run build` / `npm start`), but nothing here is Hostinger-specific — any
Node 20+ host with a PostgreSQL database works.

## 1. Provision PostgreSQL

Create the production database and a dedicated application user. Do **not** use
a superuser for the app.

```sql
CREATE DATABASE dairy_bakery;
CREATE USER dairy_app WITH PASSWORD '<strong-password>';
GRANT ALL PRIVILEGES ON DATABASE dairy_bakery TO dairy_app;
```

Require TLS in transit:

```
DATABASE_URL=postgresql://dairy_app:<password>@<host>:5432/dairy_bakery?sslmode=require
```

## 2. Configure environment variables

Set these in the host's environment-variable UI — never commit them.

```bash
NODE_ENV=production
DATABASE_URL=postgresql://dairy_app:...@host:5432/dairy_bakery?sslmode=require

AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://your-domain.com

AUTH_GOOGLE_ID=<google oauth client id>
AUTH_GOOGLE_SECRET=<google oauth client secret>

RAZORPAY_KEY_ID=<live key id>
RAZORPAY_KEY_SECRET=<live key secret>
RAZORPAY_WEBHOOK_SECRET=<webhook secret>

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
gate. Give each environment its **own database** and its own Razorpay keys — use
Razorpay test keys on staging so no real money moves.

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

## 6. Razorpay

1. Complete KYC and switch the account to Live mode.
2. Copy the live Key ID and Key Secret into the environment.
3. Add a webhook pointing at your domain and set `RAZORPAY_WEBHOOK_SECRET`.

The wallet is credited only after server-side signature verification, and
`payments.gateway_payment_id` is UNIQUE, so a replayed callback or a webhook
racing the browser callback cannot credit twice.

With no Razorpay credentials the app runs in **mock payment mode**, which is
correct for local development but must never reach production — confirm
`RAZORPAY_KEY_ID` is set before going live.

## 7. Backups

Wallet balances are money. Treat the database accordingly.

```bash
# Nightly logical backup, 30-day retention
0 2 * * * pg_dump "$DATABASE_URL" -Fc \
  -f /backups/dairy_$(date +\%F).dump && \
  find /backups -name 'dairy_*.dump' -mtime +30 -delete
```

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
- [ ] `DATABASE_URL` uses a non-superuser and `sslmode=require`
- [ ] Google OAuth redirect URI matches the deployed domain exactly
- [ ] `RAZORPAY_KEY_ID` is set — confirm the app is not in mock payment mode
- [ ] Migrations applied; `npm run db:seed -- --minimal` run once
- [ ] Daily cron scheduled **and observed to run successfully once**
- [ ] Signed in with the bootstrap admin, then removed `BOOTSTRAP_ADMIN_EMAILS`
- [ ] Backups scheduled and one restore tested
- [ ] Ledger integrity queries scheduled with alerting
- [ ] HTTPS enforced; HTTP redirects to HTTPS
- [ ] A real end-to-end purchase and a real subscription day verified in production
