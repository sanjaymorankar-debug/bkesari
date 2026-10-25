/**
 * Order service (requirements §17, §22–§23, §41).
 *
 * Checkout is the second financial hot path after the wallet. Its guarantees:
 *
 *  - **Server-authoritative pricing.** Prices, quantities and totals are read
 *    from the database at checkout time. Nothing monetary is accepted from the
 *    client (§47).
 *  - **Atomicity.** Order creation, stock consumption and the wallet debit all
 *    happen in ONE transaction. A failure at any step leaves no order and no
 *    deduction.
 *  - **Idempotency.** A caller-supplied request id is folded into the wallet
 *    transaction key, so a double-submitted checkout returns the original order
 *    instead of charging twice.
 *  - **Per-shop split.** A cart spanning several shops becomes one order per
 *    shop, each paid for independently (§17).
 */
import { and, desc, eq, inArray, like } from "drizzle-orm";

import { conflict, invalidTransition, notFound, validationFailed } from "@/lib/errors";
import { lineTotalPaise, sumPaise } from "@/lib/money";
import { db } from "@/server/db";
import {
  addresses,
  orderItems,
  orderStatusHistory,
  orders,
  productCategories,
  products,
  shopProducts,
  shops,
  walletTransactions,
  type DeliveryWindow,
  type Order,
  type OrderStatus,
  type UserRole,
} from "@/server/db/schema";
import { AUDIT_ACTIONS, recordAudit } from "./audit";
import { clearCartForShop, computeDeliveryFee, getCart } from "./cart";
import { consumeOnlineStock, loadPurchasableShopProduct } from "./catalogue";
import { DELIVERY_WINDOW_MINUTES, getFeasibleDeliveryWindows } from "./delivery-feasibility";
import { applyWalletMutation, refundOriginalDebit } from "./wallet";

/* ------------------------------------------------------- state machine */

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "PAYMENT_FAILED", "WALLET_INSUFFICIENT"],
  WALLET_INSUFFICIENT: ["CONFIRMED", "CANCELLED"],
  PAYMENT_FAILED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED", "REFUND_PENDING"],
  PREPARING: ["READY", "CANCELLED", "REFUND_PENDING"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUND_PENDING"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED", "REFUND_PENDING"],
  DELIVERED: ["REFUND_PENDING"],
  CANCELLED: ["REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Statuses at which the customer has already been charged. */
const PAID_STATUSES: readonly OrderStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  PAYMENT_FAILED: "Payment failed",
  WALLET_INSUFFICIENT: "Awaiting wallet top-up",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
};

/* ------------------------------------------------------------ checkout */

export interface CheckoutInput {
  userId: string;
  addressId?: string | null;
  /**
   * Stable id for this checkout attempt, supplied by the client. Re-submitting
   * the same id returns the original orders instead of charging again.
   */
  requestId: string;
  notes?: string | null;
  /**
   * Requested delivery window per shop (cart spans several shops → one order
   * each). Re-validated against live feasibility at order-creation time — a
   * client's earlier selection is a hint, never trusted outright, since a
   * rider may have gone offline between browsing and paying (§21: never
   * promise a window the system can't actually back).
   */
  deliveryWindows?: Record<string, DeliveryWindow>;
}

export interface CheckoutResult {
  orders: Order[];
  deduplicated: boolean;
}

export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  if (!input.requestId?.trim()) {
    throw validationFailed("A checkout request id is required.");
  }

  // Replay check comes FIRST, before the empty-cart guard. A successful
  // checkout clears the cart, so a double-submitted request would otherwise be
  // told its cart is empty even though its order went through.
  const replayed = await findOrdersForRequest(input.userId, input.requestId);
  if (replayed.length > 0) {
    return { orders: replayed, deduplicated: true };
  }

  const cart = await getCart(input.userId);
  if (cart.groups.length === 0) {
    throw validationFailed("Your cart is empty.");
  }

  const purchasableGroups = cart.groups.filter((g) =>
    g.lines.some((l) => l.purchasable),
  );
  if (purchasableGroups.length === 0) {
    throw conflict(
      "None of the items in your cart can be ordered online right now.",
    );
  }

  const addressSnapshot = input.addressId
    ? await loadAddressSnapshot(input.userId, input.addressId)
    : null;

  const created: Order[] = [];
  let anyDeduplicated = false;

  // One transaction per shop: a problem with one shop's order must not roll back
  // a sibling shop's successful order.
  for (const group of purchasableGroups) {
    const idempotencyKey = `checkout:${input.userId}:${input.requestId}:${group.shop.id}`;

    // Fast path: this shop's order was already placed under this request id.
    const priorTxn = await db.query.walletTransactions.findFirst({
      where: eq(walletTransactions.idempotencyKey, idempotencyKey),
    });
    if (priorTxn?.orderId) {
      const existing = await db.query.orders.findFirst({
        where: eq(orders.id, priorTxn.orderId),
      });
      if (existing) {
        created.push(existing);
        anyDeduplicated = true;
        continue;
      }
    }

    const requestedWindow = input.deliveryWindows?.[group.shop.id];
    const { deliveryWindow, promisedByAt } = requestedWindow
      ? await resolvePromisedWindow(group.shop.id, requestedWindow)
      : { deliveryWindow: null, promisedByAt: null };

    const order = await db.transaction(async (tx) => {
      const lines: {
        shopProductId: string;
        productName: string;
        unit: string;
        unitPricePaise: number;
        quantityUnits: number;
        quantityMilli: number;
        lineTotalPaise: number;
      }[] = [];

      // Re-validate and re-price every line inside the transaction. The cart
      // view is a hint; this is the authority.
      for (const line of group.lines) {
        if (!line.purchasable) continue;

        const loaded = await loadPurchasableShopProduct(
          line.shopProductId,
          line.quantity,
          tx,
        );
        const quantityMilli = line.quantity * loaded.product.unitSizeMilli;
        lines.push({
          shopProductId: loaded.shopProduct.id,
          productName: loaded.product.name,
          unit: loaded.product.unit,
          unitPricePaise: loaded.unitPricePaise,
          quantityUnits: line.quantity,
          quantityMilli,
          lineTotalPaise: lineTotalPaise(loaded.unitPricePaise, quantityMilli),
        });
      }

      if (lines.length === 0) {
        throw conflict("These items are no longer available online.");
      }

      const subtotalPaise = sumPaise(lines.map((l) => l.lineTotalPaise));
      const [shopRow] = await tx
        .select()
        .from(shops)
        .where(eq(shops.id, group.shop.id));
      const deliveryFeePaise = computeDeliveryFee(shopRow, subtotalPaise);
      const taxPaise = 0;
      const totalPaise = subtotalPaise + deliveryFeePaise + taxPaise;

      const [orderRow] = await tx
        .insert(orders)
        .values({
          orderNumber: generateOrderNumber(),
          userId: input.userId,
          shopId: group.shop.id,
          addressId: input.addressId ?? null,
          deliveryAddressSnapshot: addressSnapshot,
          status: "PENDING",
          source: "DIRECT",
          subtotalPaise,
          deliveryFeePaise,
          taxPaise,
          totalPaise,
          deliveryWindow,
          promisedByAt,
          notes: input.notes ?? null,
        })
        .returning();

      await tx.insert(orderItems).values(
        lines.map((l) => ({
          orderId: orderRow.id,
          shopProductId: l.shopProductId,
          productNameSnapshot: l.productName,
          unitSnapshot: l.unit,
          unitPricePaise: l.unitPricePaise,
          quantityMilli: l.quantityMilli,
          lineTotalPaise: l.lineTotalPaise,
        })),
      );

      for (const l of lines) {
        await consumeOnlineStock(
          l.shopProductId,
          l.quantityUnits,
          "Online order",
          tx,
          orderRow.id,
        );
      }

      // Charge the wallet. Throws INSUFFICIENT_BALANCE, which rolls the whole
      // transaction back — no order, no stock consumed, no deduction (§23).
      await applyWalletMutation(
        {
          userId: input.userId,
          amountPaise: totalPaise,
          type: "PRODUCT_PURCHASE",
          idempotencyKey,
          description: `Order ${orderRow.orderNumber} — ${shopRow.name}`,
          orderId: orderRow.id,
        },
        tx,
      );

      const [confirmed] = await tx
        .update(orders)
        .set({ status: "CONFIRMED", paidAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, orderRow.id))
        .returning();

      await tx.insert(orderStatusHistory).values({
        orderId: orderRow.id,
        previousStatus: "PENDING",
        newStatus: "CONFIRMED",
        changedBy: input.userId,
        note: "Paid from wallet",
      });

      await recordAudit(
        {
          actorId: input.userId,
          action: AUDIT_ACTIONS.ORDER_PLACED,
          entityType: "order",
          entityId: orderRow.id,
          newValue: { orderNumber: orderRow.orderNumber, totalPaise },
        },
        tx,
      );

      await clearCartForShop(input.userId, group.shop.id, tx);
      return confirmed;
    });

    created.push(order);
  }

  return { orders: created, deduplicated: anyDeduplicated };
}

/* --------------------------------------------------------- transitions */

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  actor: { id: string; role: UserRole },
  note?: string,
): Promise<Order> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");
    if (!order) throw notFound("Order");

    if (!canTransition(order.status, newStatus)) {
      throw invalidTransition(
        ORDER_STATUS_LABELS[order.status],
        ORDER_STATUS_LABELS[newStatus],
      );
    }

    const [updated] = await tx
      .update(orders)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === "CANCELLED" ? { cancellationReason: note ?? null } : {}),
      })
      .where(eq(orders.id, orderId))
      .returning();

    await tx.insert(orderStatusHistory).values({
      orderId,
      previousStatus: order.status,
      newStatus,
      changedBy: actor.id,
      note: note ?? null,
    });

    await recordAudit(
      {
        actorId: actor.id,
        actorRole: actor.role,
        action: AUDIT_ACTIONS.ORDER_STATUS_CHANGED,
        entityType: "order",
        entityId: orderId,
        previousValue: { status: order.status },
        newValue: { status: newStatus, note },
      },
      tx,
    );

    return updated;
  });
}

/**
 * Cancels an order and refunds the wallet when it had already been paid.
 * The refund is idempotent on the order id, so a repeated cancel cannot pay out
 * twice (§48).
 */
export async function cancelOrder(
  orderId: string,
  actor: { id: string; role: UserRole },
  reason: string,
): Promise<Order> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");
    if (!order) throw notFound("Order");

    if (!canTransition(order.status, "CANCELLED")) {
      throw invalidTransition(ORDER_STATUS_LABELS[order.status], "Cancelled");
    }

    const wasPaid = PAID_STATUSES.includes(order.status) && order.paidAt != null;

    const [updated] = await tx
      .update(orders)
      .set({
        status: "CANCELLED",
        cancellationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    await tx.insert(orderStatusHistory).values({
      orderId,
      previousStatus: order.status,
      newStatus: "CANCELLED",
      changedBy: actor.id,
      note: reason,
    });

    if (wasPaid) {
      // Preserves the original customer-funded / promotional split (§29) —
      // does not simply credit order.totalPaise as one lump customer-funded
      // sum, which would silently convert any promotional credit the order
      // used into real, withdrawable-feeling money.
      await refundOriginalDebit(
        {
          userId: order.userId,
          referenceType: "orderId",
          referenceId: order.id,
          idempotencyKey: `refund:order:${order.id}`,
          description: `Refund for cancelled order ${order.orderNumber}`,
          createdBy: actor.id,
        },
        tx,
      );
      await tx
        .update(orders)
        .set({ status: "REFUNDED", updatedAt: new Date() })
        .where(eq(orders.id, orderId));
      await tx.insert(orderStatusHistory).values({
        orderId,
        previousStatus: "CANCELLED",
        newStatus: "REFUNDED",
        changedBy: actor.id,
        note: "Wallet refunded",
      });
      return { ...updated, status: "REFUNDED" as OrderStatus };
    }

    return updated;
  });
}

/* ---------------------------------------------------------- retrieval */

export interface OrderDetail extends Order {
  items: {
    id: string;
    productNameSnapshot: string;
    unitSnapshot: string;
    unitPricePaise: number;
    quantityMilli: number;
    lineTotalPaise: number;
  }[];
  shopName: string;
  shopSlug: string;
}

export async function getOrder(orderId: string): Promise<OrderDetail | undefined> {
  const [row] = await db
    .select({ order: orders, shopName: shops.name, shopSlug: shops.slug })
    .from(orders)
    .innerJoin(shops, eq(orders.shopId, shops.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) return undefined;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return {
    ...row.order,
    shopName: row.shopName,
    shopSlug: row.shopSlug,
    items,
  };
}

export async function listOrdersForUser(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<OrderDetail[]> {
  const rows = await db
    .select({ order: orders, shopName: shops.name, shopSlug: shops.slug })
    .from(orders)
    .innerJoin(shops, eq(orders.shopId, shops.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(Math.min(options.limit ?? 25, 100))
    .offset(options.offset ?? 0);

  return attachItems(rows);
}

export async function listOrdersForShop(
  shopId: string,
  options: {
    status?: OrderStatus;
    source?: "DIRECT" | "SUBSCRIPTION";
    limit?: number;
  } = {},
): Promise<OrderDetail[]> {
  const rows = await db
    .select({ order: orders, shopName: shops.name, shopSlug: shops.slug })
    .from(orders)
    .innerJoin(shops, eq(orders.shopId, shops.id))
    .where(
      and(
        eq(orders.shopId, shopId),
        options.status ? eq(orders.status, options.status) : undefined,
        options.source ? eq(orders.source, options.source) : undefined,
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(Math.min(options.limit ?? 50, 200));

  return attachItems(rows);
}

async function attachItems(
  rows: { order: Order; shopName: string; shopSlug: string }[],
): Promise<OrderDetail[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.order.id);
  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, ids));

  const byOrder = new Map<string, typeof items>();
  for (const item of items) {
    const list = byOrder.get(item.orderId) ?? [];
    list.push(item);
    byOrder.set(item.orderId, list);
  }

  return rows.map((r) => ({
    ...r.order,
    shopName: r.shopName,
    shopSlug: r.shopSlug,
    items: byOrder.get(r.order.id) ?? [],
  }));
}

/* ------------------------------------------------------------ helpers */

/**
 * Finds orders already placed under a checkout request id.
 *
 * Wallet transaction keys are `checkout:<userId>:<requestId>:<shopId>`, so a
 * prefix match recovers every per-shop order belonging to one attempt.
 */
async function findOrdersForRequest(
  userId: string,
  requestId: string,
): Promise<Order[]> {
  const prefix = `checkout:${userId}:${requestId}:`;
  const priorTxns = await db
    .select({ orderId: walletTransactions.orderId })
    .from(walletTransactions)
    .where(like(walletTransactions.idempotencyKey, `${prefix}%`));

  const orderIds = priorTxns
    .map((t) => t.orderId)
    .filter((id): id is string => id !== null);
  if (orderIds.length === 0) return [];

  return db.select().from(orders).where(inArray(orders.id, orderIds));
}

/** Human-readable, collision-resistant. The unique index is the real guard. */
export function generateOrderNumber(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DB-${stamp}-${random}`;
}

/**
 * Re-checks a requested delivery window against live feasibility at the
 * moment of payment — never trusts the client's earlier selection outright,
 * since a rider may have gone offline between browsing and paying. Falls
 * back to the best still-feasible window rather than failing checkout over
 * a transient rider-availability gap.
 */
async function resolvePromisedWindow(
  shopId: string,
  requested: DeliveryWindow,
): Promise<{ deliveryWindow: DeliveryWindow | null; promisedByAt: Date | null }> {
  const feasibility = await getFeasibleDeliveryWindows(shopId);
  const actual: DeliveryWindow | null = feasibility[requested]
    ? requested
    : feasibility.EXPRESS_30
      ? "EXPRESS_30"
      : feasibility.STANDARD_60
        ? "STANDARD_60"
        : feasibility.SCHEDULED
          ? "SCHEDULED"
          : null;

  if (!actual || actual === "SCHEDULED") {
    return { deliveryWindow: actual, promisedByAt: null };
  }
  const minutes = DELIVERY_WINDOW_MINUTES[actual];
  return { deliveryWindow: actual, promisedByAt: new Date(Date.now() + minutes * 60_000) };
}

async function loadAddressSnapshot(
  userId: string,
  addressId: string,
): Promise<{
  line1: string;
  line2?: string | null;
  area?: string | null;
  city: string;
  pincode: string;
  latitude?: string | null;
  longitude?: string | null;
} | null> {
  const address = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
  });
  if (!address) throw notFound("Address");
  return {
    line1: address.line1,
    line2: address.line2,
    area: address.area,
    city: address.city,
    pincode: address.pincode,
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

/** Categorised product mix for a shop's order — used by the shop dashboard. */
export async function orderDepartments(orderId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ department: productCategories.department })
    .from(orderItems)
    .innerJoin(shopProducts, eq(orderItems.shopProductId, shopProducts.id))
    .innerJoin(products, eq(shopProducts.productId, products.id))
    .innerJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(eq(orderItems.orderId, orderId));
  return rows.map((r) => r.department);
}
