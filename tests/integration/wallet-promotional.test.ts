/**
 * Promotional vs customer-funded wallet balance (wallet & voucher brief
 * §27–§29). Covers TEST 26 (promotional-first spending) and TEST 27 (refund
 * restoring the original split) plus the §38 end-to-end example.
 */
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { wallets } from "@/server/db/schema";
import { applyWalletMutation, customerFundedBalancePaise, refundOriginalDebit } from "@/server/services/wallet";
import { createUserWithWallet, resetDatabase } from "../helpers/fixtures";

describe("promotional-first spending (§28, TEST 26)", () => {
  beforeEach(resetDatabase);

  it("draws down promotional balance before customer-funded balance", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });

    // Customer funded: ₹1,000. Promotional: ₹200. Total: ₹1,200.
    await applyWalletMutation({
      userId: user.id,
      amountPaise: 100_000,
      type: "TOP_UP",
      idempotencyKey: "t1",
      description: "top up",
    });
    await applyWalletMutation({
      userId: user.id,
      amountPaise: 20_000,
      type: "PROMOTIONAL_CREDIT",
      idempotencyKey: "t2",
      description: "bonus",
    });

    let [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    expect(wallet.balancePaise).toBe(120_000);
    expect(wallet.promotionalBalancePaise).toBe(20_000);

    // Purchase ₹150 — the §38 example exactly.
    const result = await applyWalletMutation({
      userId: user.id,
      amountPaise: 15_000,
      type: "PRODUCT_PURCHASE",
      idempotencyKey: "purchase1",
      description: "order",
    });

    expect(result.balancePaise).toBe(105_000); // ₹1,050
    expect(result.promotionalBalancePaise).toBe(5_000); // ₹50 promo left
    [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    expect(customerFundedBalancePaise(wallet)).toBe(100_000); // untouched — promo covered it first
  });

  it("falls through to customer-funded balance once promotional credit is exhausted", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    await applyWalletMutation({
      userId: user.id, amountPaise: 100_000, type: "TOP_UP",
      idempotencyKey: "t1", description: "top up",
    });
    await applyWalletMutation({
      userId: user.id, amountPaise: 20_000, type: "PROMOTIONAL_CREDIT",
      idempotencyKey: "t2", description: "bonus",
    });

    // Purchase ₹150: exhausts the ₹200... wait, promo is 200? no it's 20000 paise = ₹200.
    // Spend ₹300 — more than promo (₹200), so ₹200 comes from promo and ₹100 from customer funds.
    const result = await applyWalletMutation({
      userId: user.id,
      amountPaise: 30_000,
      type: "PRODUCT_PURCHASE",
      idempotencyKey: "purchase1",
      description: "big order",
    });

    expect(result.promotionalBalancePaise).toBe(0);
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    expect(customerFundedBalancePaise(wallet)).toBe(90_000); // 100,000 - 10,000 shortfall
  });

  it("never lets promotional balance exceed the total balance (CHECK constraint backstop)", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    await applyWalletMutation({
      userId: user.id, amountPaise: 50_000, type: "PROMOTIONAL_CREDIT",
      idempotencyKey: "t1", description: "bonus",
    });
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    expect(wallet.promotionalBalancePaise).toBeLessThanOrEqual(wallet.balancePaise);
  });
});

describe("refund preserves the original split (§29, TEST 27)", () => {
  beforeEach(resetDatabase);

  // Refunds are exercised against subscriptionId rather than orderId: the
  // point under test is the wallet-side split-preservation logic in
  // refundOriginalDebit, not orders-table referential integrity — and
  // wallet_transactions.subscription_id (unlike order_id) carries no FK, so a
  // synthetic UUID is legitimate here without standing up a real order row.
  // orders.ts's actual cancelOrder call site is covered separately by
  // exercising the real order flow.

  it("restores customer-funded and promotional portions separately, not as one lump sum", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const subscriptionId = crypto.randomUUID();
    // §29's own example: ₹100 customer-funded + ₹50 promotional in the
    // wallet, a ₹100 debit exhausts the ₹50 of promo first, then draws ₹50
    // more from customer-funded.
    await applyWalletMutation({
      userId: user.id, amountPaise: 100_000, type: "TOP_UP",
      idempotencyKey: "t1", description: "top up",
    });
    await applyWalletMutation({
      userId: user.id, amountPaise: 5_000, type: "PROMOTIONAL_CREDIT",
      idempotencyKey: "t2", description: "bonus",
    });

    await applyWalletMutation({
      userId: user.id,
      amountPaise: 10_000,
      type: "PRODUCT_PURCHASE",
      idempotencyKey: "debit:abc",
      description: "order",
      subscriptionId,
    });

    let [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    expect(wallet.balancePaise).toBe(95_000); // 105,000 - 10,000
    expect(wallet.promotionalBalancePaise).toBe(0); // the ₹50 promo was fully consumed

    const refund = await refundOriginalDebit({
      userId: user.id,
      referenceType: "subscriptionId",
      referenceId: subscriptionId,
      idempotencyKey: "refund:abc",
      description: "refund",
    });

    expect(refund.balancePaise).toBe(105_000); // full ₹100 restored
    expect(refund.promotionalBalancePaise).toBe(5_000); // exactly the ₹50 that was promotional

    [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    expect(customerFundedBalancePaise(wallet)).toBe(100_000); // back to exactly what it was
  });

  it("refunding a purely customer-funded purchase restores zero promotional credit", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const subscriptionId = crypto.randomUUID();
    await applyWalletMutation({
      userId: user.id, amountPaise: 100_000, type: "TOP_UP",
      idempotencyKey: "t1", description: "top up",
    });
    await applyWalletMutation({
      userId: user.id,
      amountPaise: 10_000,
      type: "PRODUCT_PURCHASE",
      idempotencyKey: "debit:xyz",
      description: "order",
      subscriptionId,
    });

    const refund = await refundOriginalDebit({
      userId: user.id,
      referenceType: "subscriptionId",
      referenceId: subscriptionId,
      idempotencyKey: "refund:xyz",
      description: "refund",
    });
    expect(refund.promotionalBalancePaise).toBe(0);
  });

  it("is idempotent — refunding the same debit twice does not double-credit", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const subscriptionId = crypto.randomUUID();
    await applyWalletMutation({
      userId: user.id, amountPaise: 100_000, type: "TOP_UP",
      idempotencyKey: "t1", description: "top up",
    });
    await applyWalletMutation({
      userId: user.id, amountPaise: 10_000, type: "PRODUCT_PURCHASE",
      idempotencyKey: "debit:dup", description: "order", subscriptionId,
    });

    await refundOriginalDebit({
      userId: user.id, referenceType: "subscriptionId", referenceId: subscriptionId,
      idempotencyKey: "refund:dup", description: "refund",
    });
    const second = await refundOriginalDebit({
      userId: user.id, referenceType: "subscriptionId", referenceId: subscriptionId,
      idempotencyKey: "refund:dup", description: "refund",
    });
    expect(second.deduplicated).toBe(true);

    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    expect(wallet.balancePaise).toBe(100_000); // not 110,000
  });
});

describe("insufficient balance still rejects cleanly with promotional balance in play", () => {
  beforeEach(resetDatabase);

  it("rejects a purchase larger than total (promo + customer-funded) balance (TEST 6)", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 30_000 });
    await expect(
      applyWalletMutation({
        userId: user.id,
        amountPaise: 50_000,
        type: "PRODUCT_PURCHASE",
        idempotencyKey: "over",
        description: "too much",
      }),
    ).rejects.toThrow(/insufficient/i);

    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    expect(wallet.balancePaise).toBe(30_000); // unchanged
  });
});
