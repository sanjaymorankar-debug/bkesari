/**
 * The last units of online stock under concurrent orders.
 *
 * `consumeOnlineStock` decrements with a guarded
 * `UPDATE ... SET online_stock = online_stock - n WHERE online_stock >= n`.
 * Two orders racing for the last unit must not both get it: the second
 * statement waits for the first one's row lock, PostgreSQL re-checks the guard
 * against the committed row, and the loser sees zero rows and raises
 * OUT_OF_STOCK. The append-only `inventory_movements` ledger must agree with
 * the stock column row by row: `previous + delta = new`, with no two movements
 * claiming the same starting level.
 *
 * Runs against real PostgreSQL: the guarantee is the row lock, which no mock has.
 */
import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { db } from "@/server/db";
import {
  inventoryMovements,
  orders,
  shopProducts,
  wallets,
} from "@/server/db/schema";
import { addToCart } from "@/server/services/cart";
import { consumeOnlineStock } from "@/server/services/catalogue";
import { checkout } from "@/server/services/orders";
import {
  createCategory,
  createProduct,
  createShop,
  createShopProduct,
  createUser,
  createUserWithWallet,
  resetDatabase,
} from "../helpers/fixtures";

beforeEach(resetDatabase);

/** An approved shop selling one product online, with `stock` units left. */
async function productWithStock(stock: number) {
  const owner = await createUser({ role: "SHOP_OWNER" });
  const category = await createCategory({ department: "DAIRY", name: "Paneer" });
  const product = await createProduct(category.id, { name: "Fresh Paneer", unit: "kg" });
  const shop = await createShop(owner.id, { status: "APPROVED" });
  const shopProduct = await createShopProduct(shop.id, product.id, {
    onlinePricePaise: 9000,
    onlineStock: stock,
  });
  return { shop, shopProduct };
}

const stockOf = async (shopProductId: string) =>
  (await db.query.shopProducts.findFirst({
    where: eq(shopProducts.id, shopProductId),
  }))!.onlineStock;

const movementsOf = (shopProductId: string) =>
  db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.shopProductId, shopProductId))
    .orderBy(asc(inventoryMovements.createdAt));

/** Every movement's arithmetic holds, and no two start from the same level. */
function expectContiguousLedger(
  movements: { previousUnits: number; deltaUnits: number; newUnits: number }[],
) {
  for (const m of movements) {
    expect(m.previousUnits + m.deltaUnits).toBe(m.newUnits);
  }
  const starts = movements.map((m) => m.previousUnits);
  expect(new Set(starts).size).toBe(starts.length);
}

const isOutOfStock = (reason: unknown) =>
  reason instanceof AppError && reason.code === "OUT_OF_STOCK";

describe("concurrent orders for the last units (consumeOnlineStock)", () => {
  it("lets exactly as many concurrent consumers succeed as there are units", async () => {
    const { shopProduct } = await productWithStock(5);

    // Each attempt in its own transaction, as checkout and the daily engine do.
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        db.transaction((tx) =>
          consumeOnlineStock(shopProduct.id, 1, "concurrency test", tx),
        ),
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(succeeded).toHaveLength(5);
    expect(rejected).toHaveLength(7);
    expect(rejected.every((r) => isOutOfStock(r.reason))).toBe(true);

    expect(await stockOf(shopProduct.id)).toBe(0);

    const movements = await movementsOf(shopProduct.id);
    expect(movements).toHaveLength(5);
    expectContiguousLedger(movements);
    expect(movements.map((m) => m.previousUnits).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("never takes stock below zero when each request wants several units", async () => {
    const { shopProduct } = await productWithStock(5);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        db.transaction((tx) =>
          consumeOnlineStock(shopProduct.id, 2, "concurrency test", tx),
        ),
      ),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(await stockOf(shopProduct.id)).toBe(1);

    const movements = await movementsOf(shopProduct.id);
    expect(movements).toHaveLength(2);
    expectContiguousLedger(movements);
  });
});

describe("concurrent checkouts for the last unit", () => {
  it("sells the last units once, charges only the winners, and keeps the ledger whole", async () => {
    const { shopProduct } = await productWithStock(3);

    const customers = [];
    for (let i = 0; i < 8; i += 1) {
      const { user } = await createUserWithWallet({ balancePaise: 100_000 });
      await addToCart(user.id, shopProduct.id, 1);
      customers.push(user);
    }

    const results = await Promise.allSettled(
      customers.map((customer, i) =>
        checkout({ userId: customer.id, requestId: `last-unit-${i}` }),
      ),
    );

    const winners = customers.filter((_, i) => results[i].status === "fulfilled");
    const losers = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(winners).toHaveLength(3);
    expect(losers).toHaveLength(5);
    expect(losers.every((r) => isOutOfStock(r.reason))).toBe(true);

    expect(await stockOf(shopProduct.id)).toBe(0);
    const placed = await db.select().from(orders);
    expect(placed).toHaveLength(3);
    expect(placed.map((o) => o.userId).sort()).toEqual(winners.map((w) => w.id).sort());
    expect(placed.every((o) => o.subtotalPaise === 9000)).toBe(true);

    // Winners paid exactly their order's total; losers paid nothing.
    for (const customer of customers) {
      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, customer.id),
      });
      const order = placed.find((o) => o.userId === customer.id);
      expect(wallet!.balancePaise).toBe(100_000 - (order?.totalPaise ?? 0));
    }

    const movements = await movementsOf(shopProduct.id);
    expect(movements).toHaveLength(3);
    expectContiguousLedger(movements);
  });
});
