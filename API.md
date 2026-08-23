# API Reference

All endpoints return JSON. Errors use a single shape:

```json
{ "error": { "code": "INSUFFICIENT_BALANCE", "message": "…", "details": { } } }
```

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No active session |
| `FORBIDDEN` | 403 | Role or ownership check failed |
| `NOT_FOUND` | 404 | No such resource |
| `VALIDATION_FAILED` | 422 | Bad input; `details.fields` maps field → message |
| `CONFLICT` | 409 | State conflict |
| `INSUFFICIENT_BALANCE` | 402 | `details` has `requiredPaise`, `availablePaise`, `shortfallPaise` |
| `PRODUCT_NOT_PURCHASABLE_ONLINE` | 409 | Offline-only, inactive, or shop unapproved |
| `OUT_OF_STOCK` | 409 | Insufficient online stock |
| `INVALID_STATE_TRANSITION` | 409 | Illegal order status change |
| `PAYMENT_VERIFICATION_FAILED` | 400 | Signature invalid or payment not yours |
| `RATE_LIMITED` | 429 | `details.retryAfterSeconds` |
| `INTERNAL` | 500 | Unexpected; details are logged server-side only |

**All monetary values are integer paise. All quantities are integer
milli-units.** `₹70.00` is `7000`; `2 L` is `2000`.

Authentication is a session cookie from Auth.js. Sign in at `/signin`.

---

## Catalogue (public)

### `GET /api/catalogue`
Query: `department` (`DAIRY`|`BAKERY`), `categoryId`, `subscribable=true`
→ `{ categories: [...], products: [...] }`

### `GET /api/shops`
Public shop search. Only `APPROVED` shops are ever returned.

Query: `q`, `city`, `area`, `pincode`, `type` (`DAIRY`|`BAKERY`|`BOTH`),
`classification` (`KESARI`|`GREEN`), `delivery=true`, `limit`, `offset`

### `GET /api/shops/{id}/products`
Query: `onlineOnly=true` to restrict to online-purchasable offerings.

---

## Shops

### `POST /api/shops` — register
Requires `shop:create`. Always creates a shop with status `PENDING_APPROVAL`
and no classification; both are server-assigned and cannot be supplied.

```json
{
  "name": "Kesari Dairy",
  "ownerName": "Owner Name",
  "phone": "9876543210",
  "addressLine1": "1 Main Road",
  "city": "Pune",
  "pincode": "411038",
  "shopType": "DAIRY",
  "deliveryAvailable": true,
  "deliveryFeePaise": 2000
}
```

### `POST /api/shops/{id}/approve`
Requires `shop:approve` (Operator/Admin). Body: `{ "classification": "KESARI" | "GREEN" }`

### `POST /api/shops/{id}/reject`
Requires `shop:reject`. Body: `{ "reason": "…" }`

### `GET|POST /api/shops/{id}/classification`
Requires `shop:set-classification` — **not held by shop owners**.
`GET` returns the change history. `POST` body:
`{ "classification": "KESARI" | "GREEN", "reason": "…" }` (reason mandatory).

### `POST /api/shops/{id}/products`
Owner of the shop, or Operator/Admin. Enabling a channel requires that
channel's price.

```json
{
  "productId": "uuid",
  "onlineSaleEnabled": true,
  "onlinePricePaise": 7000,
  "offlineSaleEnabled": true,
  "offlinePricePaise": 6500,
  "trackInventory": true,
  "onlineStock": 100
}
```

### `PATCH /api/shop-products/{id}`
Same authorization. Any subset of the create fields. Price changes are written
to `product_price_history` and audit-logged in the same transaction.

---

## Cart

### `GET /api/cart`
Returns the cart grouped by shop with live prices, per-shop delivery fees, and a
`purchasable` flag plus `unavailableReason` per line.

### `POST /api/cart`
`{ "shopProductId": "uuid", "quantity": 1 }` — validated against the *total*
resulting quantity, not just the delta.

### `PATCH /api/cart/items/{id}` · `DELETE /api/cart/items/{id}` · `DELETE /api/cart`

---

## Checkout & orders

### `POST /api/checkout`
```json
{ "requestId": "client-generated-stable-id", "addressId": null, "notes": null }
```

Splits the cart into one order per shop, recomputes every price server-side,
consumes stock and debits the wallet — all atomically per shop.

Re-sending the same `requestId` returns the original orders with
`deduplicated: true` instead of charging again. Returns `402` with a shortfall
if the balance is insufficient; nothing is created and no stock is consumed.

### `GET /api/orders`

### `PATCH /api/orders/{id}/status`
`{ "status": "PREPARING", "note": "optional" }`

Shop staff may advance their own shop's orders; Operator/Admin may advance any.
A customer may cancel their own order. Cancelling a paid order refunds the
wallet idempotently. Illegal transitions return `409`.

Lifecycle: `PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY →
DELIVERED`, with `CANCELLED`, `PAYMENT_FAILED`, `WALLET_INSUFFICIENT`,
`REFUND_PENDING`, `REFUNDED`.

---

## Wallet

### `GET /api/wallet`
Balance, today's deductions, low-balance state, 15-day subscription forecast and
recent transactions.

### `POST /api/wallet/topup`
`{ "amountPaise": 500000 }` (min ₹1, max ₹1,00,000)

Creates a gateway order only — **no money moves**. Returns
`{ gatewayOrderId, paymentSessionId, cashfreeMode, amountPaise, mock }`.

### `POST /api/wallet/verify`
```json
{ "gatewayOrderId": "…" }
```

Independently confirms with Cashfree's own API whether this order was
actually paid — nothing the client posts here is trusted as proof of
payment, only which order to check. Idempotent on the gateway payment id, so
a replayed call returns `alreadyProcessed: true` without a second credit. If
Cashfree does not confirm payment, the payment is marked `FAILED` and
nothing is credited.

### `PATCH /api/wallet/settings`
`lowBalanceThresholdPaise`, `autoRechargeEnabled`, `autoRechargeTriggerPaise`,
`autoRechargeAmountPaise`. Enabling auto-recharge requires both a trigger and an
amount.

---

## Subscriptions

### `GET /api/subscriptions` · `POST /api/subscriptions`
```json
{
  "shopProductId": "uuid",
  "quantityMilli": 2000,
  "frequency": "DAILY",
  "weekdays": [],
  "startDate": "2026-08-20"
}
```
`weekdays` uses ISO days (Monday = 1) and is required for `WEEKLY`.

### `GET|PATCH|DELETE /api/subscriptions/{id}`
`PATCH` changes the standing subscription permanently. `DELETE` cancels with an
optional `reason`.

### `POST /api/subscriptions/{id}/override`
`{ "date": "2026-08-21", "quantityMilli": 3000 }`

Changes one date only; the schedule reverts to the standing quantity the next
day. `DELETE` with `{ "date": … }` restores the standard quantity.

### `POST /api/subscriptions/{id}/skip`
`{ "date": "2026-08-25" }` — no order, no deduction.

### `POST /api/subscriptions/{id}/pause` · `/resume`
`{ "from": "2026-08-25", "until": "2026-08-30" }` — inclusive of both ends.

### `GET /api/subscriptions/{id}/calendar?days=30`
Per-date `delivers`, `quantityMilli`, `reason`, `isOverridden`,
`estimatedCostPaise`, `generatedStatus`.

### `POST /api/subscriptions/{id}/retry`
`{ "date": "2026-08-20" }` — retries a day that failed for insufficient balance.

A past or already-processed date cannot be modified.

---

## Notifications

### `GET /api/notifications?unreadOnly=true`
### `PATCH /api/notifications` — `{ "id": "uuid" }` or `{ "all": true }`

---

## Cron

### `POST /api/cron/daily-orders`
`Authorization: Bearer $CRON_SECRET` (compared in constant time).
Optional body: `{ "date": "YYYY-MM-DD", "subscriptionIds": ["uuid"] }`

```json
{
  "date": "2026-08-20",
  "generated": 12,
  "skipped": 3,
  "alreadyExisted": 0,
  "walletFailures": 1,
  "unavailable": 0,
  "errors": []
}
```

Idempotent per `(subscription, date)`. `GET` with the same header is a health
probe that generates nothing.

---

## Rate limits

| Scope | Limit |
|---|---|
| Payment create/verify | 10 / minute / user |
| Checkout | 15 / minute / user |
| Cron | 30 / minute / IP |

Exceeding a limit returns `429` with `details.retryAfterSeconds`.
