/**
 * Integration-test fixtures.
 *
 * Builds real rows in the real test database so tests exercise the same
 * constraints and locking behaviour as production.
 */
import { sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  productCategories,
  products,
  shopProducts,
  shops,
  users,
  wallets,
  type Department,
  type UserRole,
} from "@/server/db/schema";
import type { ShopTypeKey } from "@/lib/shop-types";

let counter = 0;
const uniq = () => `${Date.now().toString(36)}-${(counter += 1)}`;

/** Wipes all business data between tests. Order is handled by CASCADE. */
export async function resetDatabase(): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      audit_logs, notifications,
      subscription_orders, subscription_daily_overrides, subscriptions,
      wallet_transactions, wallets, payments,
      order_status_history, order_items, orders,
      cart_items, carts,
      inventory_movements, product_price_history, shop_products,
      products, product_categories,
      shop_classification_history, shops,
      sessions, accounts, users
    RESTART IDENTITY CASCADE
  `);
}

export async function createUser(
  overrides: { email?: string; role?: UserRole; name?: string } = {},
) {
  const [user] = await db
    .insert(users)
    .values({
      email: overrides.email ?? `user-${uniq()}@test.local`,
      name: overrides.name ?? "Test User",
      role: overrides.role ?? "CUSTOMER",
    })
    .returning();
  return user;
}

export async function createUserWithWallet(
  overrides: { email?: string; role?: UserRole; balancePaise?: number } = {},
) {
  const user = await createUser(overrides);
  const [wallet] = await db
    .insert(wallets)
    .values({ userId: user.id, balancePaise: overrides.balancePaise ?? 0 })
    .returning();
  return { user, wallet };
}

export async function createCategory(
  overrides: { department?: Department; name?: string } = {},
) {
  const name = overrides.name ?? "Milk";
  const [category] = await db
    .insert(productCategories)
    .values({
      department: overrides.department ?? "DAIRY",
      name,
      slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${uniq()}`,
    })
    .returning();
  return category;
}

export async function createProduct(
  categoryId: string,
  overrides: { name?: string; unit?: string; subscribable?: boolean } = {},
) {
  const name = overrides.name ?? "Cow Milk";
  const [product] = await db
    .insert(products)
    .values({
      categoryId,
      name,
      slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${uniq()}`,
      unit: overrides.unit ?? "L",
      unitSizeMilli: 1000,
      subscribable: overrides.subscribable ?? true,
    })
    .returning();
  return product;
}

export async function createShop(
  ownerId: string,
  overrides: {
    status?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED" | "INACTIVE";
    shopType?: ShopTypeKey;
    classification?: "KESARI" | "GREEN" | null;
    name?: string;
    deliveryAvailable?: boolean;
  } = {},
) {
  const name = overrides.name ?? "Test Dairy";
  const [shop] = await db
    .insert(shops)
    .values({
      ownerId,
      name,
      slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${uniq()}`,
      ownerName: "Owner",
      phone: "9999999999",
      addressLine1: "1 Test Road",
      city: "Pune",
      pincode: "411001",
      shopType: overrides.shopType ?? "DAIRY",
      status: overrides.status ?? "APPROVED",
      classification: overrides.classification ?? "KESARI",
      deliveryAvailable: overrides.deliveryAvailable ?? true,
    })
    .returning();
  return shop;
}

export async function createShopProduct(
  shopId: string,
  productId: string,
  overrides: {
    onlinePricePaise?: number | null;
    offlinePricePaise?: number | null;
    onlineSaleEnabled?: boolean;
    offlineSaleEnabled?: boolean;
    onlineStock?: number;
    trackInventory?: boolean;
    isActive?: boolean;
    isAvailable?: boolean;
  } = {},
) {
  const onlineEnabled = overrides.onlineSaleEnabled ?? true;
  const [shopProduct] = await db
    .insert(shopProducts)
    .values({
      shopId,
      productId,
      onlineSaleEnabled: onlineEnabled,
      onlinePricePaise:
        overrides.onlinePricePaise !== undefined
          ? overrides.onlinePricePaise
          : onlineEnabled
            ? 7000
            : null,
      offlineSaleEnabled: overrides.offlineSaleEnabled ?? false,
      offlinePricePaise:
        overrides.offlinePricePaise !== undefined
          ? overrides.offlinePricePaise
          : (overrides.offlineSaleEnabled ?? false)
            ? 6500
            : null,
      onlineStock: overrides.onlineStock ?? 100,
      trackInventory: overrides.trackInventory ?? true,
      isActive: overrides.isActive ?? true,
      isAvailable: overrides.isAvailable ?? true,
    })
    .returning();
  return shopProduct;
}

/** Convenience: an approved dairy shop selling 1 L cow milk online at ₹70. */
export async function createStandardMilkSetup(
  options: { customerBalancePaise?: number } = {},
) {
  const { user: customer, wallet } = await createUserWithWallet({
    balancePaise: options.customerBalancePaise ?? 500_000,
  });
  const owner = await createUser({ role: "SHOP_OWNER" });
  const category = await createCategory({ department: "DAIRY", name: "Milk" });
  const product = await createProduct(category.id, {
    name: "Cow Milk",
    unit: "L",
    subscribable: true,
  });
  const shop = await createShop(owner.id, { status: "APPROVED" });
  const shopProduct = await createShopProduct(shop.id, product.id, {
    onlinePricePaise: 7000,
    offlinePricePaise: 6500,
    onlineSaleEnabled: true,
    offlineSaleEnabled: true,
    onlineStock: 1000,
  });
  return { customer, wallet, owner, category, product, shop, shopProduct };
}
