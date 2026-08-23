# Dairy & Bakery Marketplace — Architecture & Decisions

Fresh greenfield build. No code reused from any prior project.

## 1. Technology decisions

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript (strict) | Server Components + Route Handlers give one deployable unit; server-side authz by default. |
| Styling | Tailwind CSS v4 | Utility-first, responsive, no runtime cost. |
| Database | PostgreSQL 16 | Transactional integrity, row locking, partial/unique indexes — required for wallet correctness. |
| ORM | **Drizzle ORM** (deviation — see §1.1) | Pure TypeScript, explicit SQL control for `FOR UPDATE` locking and isolation levels. |
| Auth | Auth.js (NextAuth v5) + Google OAuth | Mandated. Database sessions, server-side role resolution. |
| Validation | Zod v4 | Every external input parsed at the server boundary. |
| Client state | Zustand (UI only) | Cart/wallet/subscription state is **server-owned**; Zustand holds ephemeral UI state only. |
| Payments | Cashfree | India-first: UPI, cards, netbanking. Server-side confirmation via Cashfree's Get Order API; webhook HMAC signature verification. |
| Tests | Vitest (unit + integration against real Postgres), Playwright (E2E) | Integration tests run real SQL so concurrency/idempotency claims are actually proven. |

### 1.1 Deviation: Drizzle instead of Prisma

The brief prefers Prisma. Prisma was installed first and **could not be used**: it requires
Rust engine binaries fetched from `binaries.prisma.sh`, which is unreachable from this build
environment (HTTP 403 at the network proxy). `prisma init`, `generate` and `migrate` all fail.

Drizzle ORM was adopted because it is pure TypeScript with zero binary dependencies. Beyond
unblocking the build it is a better fit here:

- **Explicit transaction control.** Wallet integrity needs `SELECT … FOR UPDATE` and settable
  isolation levels. Drizzle exposes both directly; Prisma abstracts them away.
- **Deployment simplicity.** No platform-specific engine binary to ship to Hostinger's Node runtime.
- **Migrations are plain SQL** files under `drizzle/`, reviewable in PRs and runnable by any DBA.

Trade-off accepted: less schema-level magic (no automatic nested writes). Business logic lives in
explicit service functions anyway, so this is not a real loss.

## 2. Money and quantity representation

Two rules that prevent an entire class of financial bug:

- **All money is integer paise** (`bigint`, JS `number` mode). `₹70.00` is stored as `7000`.
  Floating point never touches a monetary value. Formatting to `₹` happens only at the view layer.
- **All quantities are integer milli-units** (thousandths). `2 L` is `2000`; `0.5 L` is `500`.
  Lets customers use `±0.5 L` steps with exact arithmetic.

Line total = `unitPricePaise × quantityMilli / 1000`, computed server-side with integer math.

## 3. Module map

```
src/
  server/
    db/            schema, client, migrations
    services/      ALL business logic (pure, testable, no React)
      auth, shops, products, cart, orders, wallet, payments,
      subscriptions, notifications, reports, audit
    authz/         role → permission matrix, guards
  app/
    (public)/      home, search, shop profile, product
    (customer)/    cart, checkout, orders, wallet, subscriptions
    (shop)/        shop-owner dashboard
    (admin)/       admin + operator dashboards
    api/           route handlers (thin: parse → authorize → call service → respond)
  components/      presentational, no business logic
  lib/             money, dates, errors, formatting
```

**Rule:** UI components never compute prices, totals, balances or permissions. They render what a
service returned.

## 4. Roles & permissions

Four roles: `CUSTOMER`, `SHOP_OWNER`, `OPERATOR`, `ADMIN`.

Authorization is a **capability matrix** (`src/server/authz/permissions.ts`) checked server-side on
every mutation. Role is read from the database session, never from the client. Ownership checks
(is this shop mine?) are separate from capability checks and both must pass.

Self-assignment of `OPERATOR`/`ADMIN` is impossible: role is never accepted from any request body.
New Google users are created as `CUSTOMER` with a wallet, inside one transaction.

Guarded invariants:
- Shop owners cannot change their own Kesari/Green classification (operator/admin only).
- Shop owners can only touch rows where `shop.ownerId = session.user.id`.
- Operators get operational capabilities but not system config, role management, or user deletion.

## 5. Order lifecycle

```
PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
        ↘ CANCELLED / PAYMENT_FAILED / WALLET_INSUFFICIENT
                    ↘ REFUND_PENDING → REFUNDED
```

Transitions are validated by a state machine; illegal transitions are rejected server-side.
Carts spanning multiple shops are **split into one order per shop** at checkout.

## 6. Wallet architecture (financial integrity)

- One wallet per customer, `balancePaise bigint NOT NULL CHECK (balance >= 0)`.
- Every balance change writes an **immutable** `wallet_transactions` row recording
  `previousBalance`, `amount`, `newBalance`, type, and references. Rows are never updated or deleted.
- All mutations run inside `db.transaction()` opening with
  `SELECT … FROM wallets WHERE user_id = $1 FOR UPDATE` so concurrent deductions serialize.
  READ COMMITTED (the default) is deliberate: the row lock already provides the necessary
  serialisation, and it avoids the spurious serialisation failures — and retry loops —
  that REPEATABLE READ would introduce under load.
- **Idempotency:** `wallet_transactions.idempotency_key` is `UNIQUE`. A retried operation collides
  on the unique index and returns the original transaction instead of double-charging.
- The DB `CHECK` constraint is the last line of defence — a negative balance is impossible even if
  application logic is wrong.
- Wallet is credited **only** after the server independently confirms payment with
  Cashfree's own API (never from anything the client reports). `payments.gateway_payment_id`
  is `UNIQUE`, so a replayed webhook cannot credit twice.

## 7. Subscription architecture

```
Subscription (recurring intent: product, shop, qty/day, frequency, window)
   ├─ SubscriptionDailyOverride  (per-date qty change, or SKIP)
   └─ SubscriptionOrder          (materialised delivery for one date) → Order
```

Effective quantity for a date:
1. If a `PAUSED` window covers the date → no delivery.
2. Else if an override exists for that date → `SKIP` (no delivery) or its quantity.
3. Else → the subscription's standing quantity.

Overrides apply to exactly one date, so the schedule reverts automatically the next day.

**Daily order engine** (`generateDailyOrders`) is idempotent by construction: a `UNIQUE(subscription_id,
delivery_date)` index on `subscription_orders` means a second run of the same day is a no-op. It is
invoked by `POST /api/cron/daily-orders` guarded by a `CRON_SECRET` bearer token, so any scheduler
(Hostinger cron, GitHub Actions, Vercel Cron) can drive it.

Pricing: each generated order snapshots the shop product's **current** online price into the order
item. Completed orders therefore keep their historical price forever; price changes only affect
future generations.

Insufficient balance → order is created with status `WALLET_INSUFFICIENT`, no deduction occurs, the
customer is notified, and the day can be retried after a top-up.

## 8. Online / offline selling

`shop_products` carries independent `onlineSaleEnabled` / `offlineSaleEnabled` flags and separate
`onlinePricePaise` / `offlinePricePaise`. A product is purchasable online only if **all** hold:

```
shop.status = APPROVED ∧ shopProduct.isActive ∧ shopProduct.isAvailable
∧ onlineSaleEnabled ∧ onlinePricePaise IS NOT NULL ∧ (¬trackInventory ∨ onlineStock ≥ qty)
```

Enforced by `assertOnlinePurchasable()` in the service layer — called on add-to-cart, checkout and
every subscription order generation. A DB `CHECK` also forbids `onlineSaleEnabled` without a price.

## 9. Security model

- Google OAuth only; no passwords stored.
- Role, price, balance, ownership and totals are **always** recomputed server-side.
- Zod-validated inputs; parameterised queries throughout (no string-built SQL).
- Rate limiting on auth, payment and cron endpoints.
- Audit log on: shop approval/rejection, classification change, price change, availability change,
  wallet adjustment, refund, role change, subscription modification, order status change.
- Secrets only in env vars; none in the client bundle.

## 10. Testing strategy

| Level | Tool | Covers |
|---|---|---|
| Unit | Vitest | money math, effective-quantity resolution, order state machine, permission matrix |
| Integration | Vitest + real Postgres | wallet concurrency, duplicate payment callbacks, negative-balance prevention, subscription idempotency, online/offline enforcement, authz |
| E2E | Playwright | the §55 acceptance scenario end to end |

Integration tests run against `dairy_bakery_test` and truncate between cases.
