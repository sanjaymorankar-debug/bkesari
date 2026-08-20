/**
 * Price update approval workflow (§2.4, §7, §10, §25.7–§25.10).
 *
 * These tests exist to pin down the one rule the whole feature turns on: an
 * operator's proposed price does NOT move the live price until the shop owner
 * says so. Every assertion below re-reads shop_products from the database
 * rather than trusting a return value, because "the live price did not change"
 * is precisely the claim being made.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { priceUpdateRequests, shopProducts } from "@/server/db/schema";
import {
  appliesImmediately,
  decideBatch,
  decideRequests,
  listPendingForShop,
  overrideRequest,
  submitPriceRequests,
} from "@/server/services/price-requests";
import { updateShopProduct } from "@/server/services/catalogue";
import {
  createShopProduct,
  createStandardMilkSetup,
  createUser,
  resetDatabase,
} from "../helpers/fixtures";

async function livePrice(shopProductId: string): Promise<number | null> {
  const [row] = await db
    .select({ price: shopProducts.onlinePricePaise })
    .from(shopProducts)
    .where(eq(shopProducts.id, shopProductId));
  return row?.price ?? null;
}

describe("price approval workflow", () => {
  beforeEach(resetDatabase);

  it("applies a shop owner's own price change immediately", async () => {
    const { owner, shop, shopProduct } = await createStandardMilkSetup();

    expect(appliesImmediately({ id: owner.id, role: "SHOP_OWNER" }, shop.ownerId)).toBe(
      true,
    );

    await updateShopProduct(
      shopProduct.id,
      { onlinePricePaise: 7200 },
      { id: owner.id, role: "SHOP_OWNER" },
    );

    expect(await livePrice(shopProduct.id)).toBe(7200);
    // Nothing should have been queued for approval.
    expect(await listPendingForShop(shop.id)).toHaveLength(0);
  });

  it("does not move the live price when an operator proposes one", async () => {
    const { shop, shopProduct } = await createStandardMilkSetup();
    const operator = await createUser({ role: "OPERATOR" });

    expect(
      appliesImmediately({ id: operator.id, role: "OPERATOR" }, shop.ownerId),
    ).toBe(false);

    const { requests } = await submitPriceRequests(
      {
        shopId: shop.id,
        changes: [
          {
            shopProductId: shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 7200,
          },
        ],
      },
      { id: operator.id, role: "OPERATOR" },
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].status).toBe("PENDING");
    // The whole point: ₹70 is still ₹70.
    expect(await livePrice(shopProduct.id)).toBe(7000);
  });

  it("makes the price live once the owner approves", async () => {
    const { owner, shop, shopProduct } = await createStandardMilkSetup();
    const operator = await createUser({ role: "OPERATOR" });

    const { requests } = await submitPriceRequests(
      {
        shopId: shop.id,
        changes: [
          {
            shopProductId: shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 7200,
          },
        ],
      },
      { id: operator.id, role: "OPERATOR" },
    );

    const result = await decideRequests(
      { requestIds: [requests[0].id], decision: "APPROVED" },
      { id: owner.id, role: "SHOP_OWNER" },
    );

    expect(result.approved).toBe(1);
    expect(await livePrice(shopProduct.id)).toBe(7200);
  });

  it("leaves the live price untouched when the owner rejects (§25.9)", async () => {
    const { owner, shop, shopProduct } = await createStandardMilkSetup();
    const operator = await createUser({ role: "OPERATOR" });

    const { requests } = await submitPriceRequests(
      {
        shopId: shop.id,
        changes: [
          {
            shopProductId: shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 9900,
          },
        ],
      },
      { id: operator.id, role: "OPERATOR" },
    );

    await decideRequests(
      {
        requestIds: [requests[0].id],
        decision: "REJECTED",
        rejectionReason: "Too high",
      },
      { id: owner.id, role: "SHOP_OWNER" },
    );

    expect(await livePrice(shopProduct.id)).toBe(7000);

    const [stored] = await db
      .select()
      .from(priceUpdateRequests)
      .where(eq(priceUpdateRequests.id, requests[0].id));
    expect(stored.status).toBe("REJECTED");
    expect(stored.rejectionReason).toBe("Too high");
    expect(stored.appliedAt).toBeNull();
  });

  it("refuses to let an operator approve their own proposal (§7, §17)", async () => {
    const { shop, shopProduct } = await createStandardMilkSetup();
    const operator = await createUser({ role: "OPERATOR" });

    const { requests } = await submitPriceRequests(
      {
        shopId: shop.id,
        changes: [
          {
            shopProductId: shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 7200,
          },
        ],
      },
      { id: operator.id, role: "OPERATOR" },
    );

    await expect(
      decideRequests(
        { requestIds: [requests[0].id], decision: "APPROVED" },
        { id: operator.id, role: "OPERATOR" },
      ),
    ).rejects.toThrow();

    expect(await livePrice(shopProduct.id)).toBe(7000);
  });

  it("refuses to let one shop owner decide another shop's updates (IDOR)", async () => {
    const { shop, shopProduct } = await createStandardMilkSetup();
    const operator = await createUser({ role: "OPERATOR" });
    const otherOwner = await createUser({ role: "SHOP_OWNER" });

    const { requests } = await submitPriceRequests(
      {
        shopId: shop.id,
        changes: [
          {
            shopProductId: shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 7200,
          },
        ],
      },
      { id: operator.id, role: "OPERATOR" },
    );

    await expect(
      decideRequests(
        { requestIds: [requests[0].id], decision: "APPROVED" },
        { id: otherOwner.id, role: "SHOP_OWNER" },
      ),
    ).rejects.toThrow();

    expect(await livePrice(shopProduct.id)).toBe(7000);
  });

  it("rejects a proposal targeting a product from another shop (IDOR)", async () => {
    const first = await createStandardMilkSetup();
    const otherOwner = await createUser({ role: "SHOP_OWNER" });
    const operator = await createUser({ role: "OPERATOR" });

    const { createShop } = await import("../helpers/fixtures");
    const otherShop = await createShop(otherOwner.id, { name: "Other Dairy" });
    const foreign = await createShopProduct(otherShop.id, first.product.id, {
      onlinePricePaise: 5000,
    });

    // Ask to price the OTHER shop's product while claiming the first shop.
    await expect(
      submitPriceRequests(
        {
          shopId: first.shop.id,
          changes: [
            {
              shopProductId: foreign.id,
              priceType: "ONLINE",
              proposedPricePaise: 100,
            },
          ],
        },
        { id: operator.id, role: "OPERATOR" },
      ),
    ).rejects.toThrow();

    expect(await livePrice(foreign.id)).toBe(5000);
  });

  it("supersedes an earlier pending proposal for the same product", async () => {
    const { shop, shopProduct } = await createStandardMilkSetup();
    const operator = await createUser({ role: "OPERATOR" });
    const actor = { id: operator.id, role: "OPERATOR" as const };

    const first = await submitPriceRequests(
      {
        shopId: shop.id,
        changes: [
          {
            shopProductId: shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 7200,
          },
        ],
      },
      actor,
    );
    await submitPriceRequests(
      {
        shopId: shop.id,
        changes: [
          {
            shopProductId: shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 7500,
          },
        ],
      },
      actor,
    );

    const [superseded] = await db
      .select()
      .from(priceUpdateRequests)
      .where(eq(priceUpdateRequests.id, first.requests[0].id));
    expect(superseded.status).toBe("SUPERSEDED");

    // The owner's queue shows one live proposal, not a stack of stale ones.
    const pending = await listPendingForShop(shop.id);
    expect(pending).toHaveLength(1);
    expect(pending[0].proposedPricePaise).toBe(7500);
  });

  it("approves an entire batch in one decision (§2.4 'Approve all')", async () => {
    const setup = await createStandardMilkSetup();
    const operator = await createUser({ role: "OPERATOR" });

    const second = await createShopProduct(setup.shop.id, setup.product.id, {
      onlinePricePaise: 4000,
    }).catch(async () => {
      // shop_products is UNIQUE(shop, product) — use a second product instead.
      const { createProduct } = await import("../helpers/fixtures");
      const other = await createProduct(setup.category.id, { name: "Curd" });
      return createShopProduct(setup.shop.id, other.id, {
        onlinePricePaise: 4000,
      });
    });

    const { batch } = await submitPriceRequests(
      {
        shopId: setup.shop.id,
        changes: [
          {
            shopProductId: setup.shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 7200,
          },
          {
            shopProductId: second.id,
            priceType: "ONLINE",
            proposedPricePaise: 4200,
          },
        ],
      },
      { id: operator.id, role: "OPERATOR" },
    );

    const result = await decideBatch(batch.id, "APPROVED", {
      id: setup.owner.id,
      role: "SHOP_OWNER",
    });

    expect(result.approved).toBe(2);
    expect(await livePrice(setup.shopProduct.id)).toBe(7200);
    expect(await livePrice(second.id)).toBe(4200);
  });

  it("lets an admin override without the owner's approval (§11)", async () => {
    const { shop, shopProduct } = await createStandardMilkSetup();
    const operator = await createUser({ role: "OPERATOR" });
    const admin = await createUser({ role: "ADMIN" });

    const { requests } = await submitPriceRequests(
      {
        shopId: shop.id,
        changes: [
          {
            shopProductId: shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 7200,
          },
        ],
      },
      { id: operator.id, role: "OPERATOR" },
    );

    await overrideRequest(requests[0].id, { id: admin.id, role: "ADMIN" }, "Urgent");

    expect(await livePrice(shopProduct.id)).toBe(7200);
  });

  it("refuses an override from a non-admin", async () => {
    const { owner, shop, shopProduct } = await createStandardMilkSetup();
    const operator = await createUser({ role: "OPERATOR" });

    const { requests } = await submitPriceRequests(
      {
        shopId: shop.id,
        changes: [
          {
            shopProductId: shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 7200,
          },
        ],
      },
      { id: operator.id, role: "OPERATOR" },
    );

    await expect(
      overrideRequest(requests[0].id, { id: owner.id, role: "SHOP_OWNER" }),
    ).rejects.toThrow();
    await expect(
      overrideRequest(requests[0].id, { id: operator.id, role: "OPERATOR" }),
    ).rejects.toThrow();
  });

  it("cannot decide the same request twice", async () => {
    const { owner, shop, shopProduct } = await createStandardMilkSetup();
    const operator = await createUser({ role: "OPERATOR" });

    const { requests } = await submitPriceRequests(
      {
        shopId: shop.id,
        changes: [
          {
            shopProductId: shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 7200,
          },
        ],
      },
      { id: operator.id, role: "OPERATOR" },
    );

    const ownerActor = { id: owner.id, role: "SHOP_OWNER" as const };
    await decideRequests(
      { requestIds: [requests[0].id], decision: "APPROVED" },
      ownerActor,
    );
    await expect(
      decideRequests(
        { requestIds: [requests[0].id], decision: "REJECTED" },
        ownerActor,
      ),
    ).rejects.toThrow();
  });

  it("writes price history when an approved request goes live (§25.10)", async () => {
    const { owner, shop, shopProduct } = await createStandardMilkSetup();
    const operator = await createUser({ role: "OPERATOR" });

    const { requests } = await submitPriceRequests(
      {
        shopId: shop.id,
        changes: [
          {
            shopProductId: shopProduct.id,
            priceType: "ONLINE",
            proposedPricePaise: 7200,
          },
        ],
      },
      { id: operator.id, role: "OPERATOR" },
    );
    await decideRequests(
      { requestIds: [requests[0].id], decision: "APPROVED" },
      { id: owner.id, role: "SHOP_OWNER" },
    );

    const { productPriceHistory } = await import("@/server/db/schema");
    const history = await db
      .select()
      .from(productPriceHistory)
      .where(eq(productPriceHistory.shopProductId, shopProduct.id));

    expect(history).toHaveLength(1);
    expect(history[0].previousPricePaise).toBe(7000);
    expect(history[0].newPricePaise).toBe(7200);
  });
});
