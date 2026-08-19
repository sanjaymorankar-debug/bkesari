/**
 * Payment verification (requirements §18, §20, §48).
 *
 * The forged-signature and replayed-callback cases are the ones that matter:
 * they are the difference between a wallet and a money printer.
 */
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { payments, walletTransactions, wallets } from "@/server/db/schema";
import {
  createTopUpOrder,
  signForMock,
  verifyAndCreditTopUp,
  verifySignature,
} from "@/server/services/payments";
import { createUserWithWallet, resetDatabase } from "../helpers/fixtures";

beforeEach(resetDatabase);

const balanceOf = async (userId: string) =>
  (await db.query.wallets.findFirst({ where: eq(wallets.userId, userId) }))!
    .balancePaise;

describe("top-up intent", () => {
  it("creates a payment record without moving any money", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });

    const intent = await createTopUpOrder(user.id, 500_000);

    expect(intent.amountPaise).toBe(500_000);
    expect(intent.payment.status).toBe("CREATED");
    // Critically: nothing credited yet.
    expect(await balanceOf(user.id)).toBe(0);
  });

  it("enforces minimum and maximum amounts", async () => {
    const { user } = await createUserWithWallet();

    await expect(createTopUpOrder(user.id, 50)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    await expect(
      createTopUpOrder(user.id, 20_000_000),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("rejects fractional paise", async () => {
    const { user } = await createUserWithWallet();
    await expect(createTopUpOrder(user.id, 100.5)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });
});

describe("signature verification", () => {
  it("accepts a correctly signed callback and credits exactly once", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 500_000);
    const paymentId = "pay_test_1";

    const result = await verifyAndCreditTopUp({
      userId: user.id,
      gatewayOrderId: intent.gatewayOrderId,
      gatewayPaymentId: paymentId,
      signature: signForMock(intent.gatewayOrderId, paymentId),
    });

    expect(result.balancePaise).toBe(500_000);
    expect(await balanceOf(user.id)).toBe(500_000);

    const txns = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, user.id));
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe("TOP_UP");
  });

  it("rejects a forged signature and credits nothing", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 500_000);

    await expect(
      verifyAndCreditTopUp({
        userId: user.id,
        gatewayOrderId: intent.gatewayOrderId,
        gatewayPaymentId: "pay_forged",
        signature: "deadbeef".repeat(8),
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });

    expect(await balanceOf(user.id)).toBe(0);

    const record = await db.query.payments.findFirst({
      where: eq(payments.id, intent.payment.id),
    });
    expect(record?.status).toBe("FAILED");
  });

  it("rejects a signature belonging to a different payment", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 500_000);

    // Valid HMAC, but computed over someone else's payment id.
    const wrongSignature = signForMock(intent.gatewayOrderId, "pay_other");

    await expect(
      verifyAndCreditTopUp({
        userId: user.id,
        gatewayOrderId: intent.gatewayOrderId,
        gatewayPaymentId: "pay_mine",
        signature: wrongSignature,
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });

    expect(await balanceOf(user.id)).toBe(0);
  });

  it("refuses to let one user settle another user's payment", async () => {
    const { user: payer } = await createUserWithWallet({ balancePaise: 0 });
    const { user: attacker } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(payer.id, 500_000);
    const paymentId = "pay_hijack";

    await expect(
      verifyAndCreditTopUp({
        userId: attacker.id,
        gatewayOrderId: intent.gatewayOrderId,
        gatewayPaymentId: paymentId,
        signature: signForMock(intent.gatewayOrderId, paymentId),
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });

    expect(await balanceOf(attacker.id)).toBe(0);
    expect(await balanceOf(payer.id)).toBe(0);
  });

  it("verifies HMAC directly", () => {
    const sig = signForMock("order_1", "pay_1");
    expect(verifySignature("order_1", "pay_1", sig)).toBe(true);
    expect(verifySignature("order_1", "pay_2", sig)).toBe(false);
    expect(verifySignature("order_2", "pay_1", sig)).toBe(false);
    expect(verifySignature("order_1", "pay_1", "short")).toBe(false);
  });
});

describe("replay protection (§48)", () => {
  it("does not credit twice when the callback is replayed", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 500_000);
    const paymentId = "pay_replay";
    const signature = signForMock(intent.gatewayOrderId, paymentId);

    const first = await verifyAndCreditTopUp({
      userId: user.id,
      gatewayOrderId: intent.gatewayOrderId,
      gatewayPaymentId: paymentId,
      signature,
    });
    const second = await verifyAndCreditTopUp({
      userId: user.id,
      gatewayOrderId: intent.gatewayOrderId,
      gatewayPaymentId: paymentId,
      signature,
    });

    expect(first.alreadyProcessed).toBe(false);
    expect(second.alreadyProcessed).toBe(true);
    expect(await balanceOf(user.id)).toBe(500_000);

    const txns = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, user.id));
    expect(txns).toHaveLength(1);
  });

  it("survives concurrent duplicate callbacks", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 500_000);
    const paymentId = "pay_concurrent";
    const signature = signForMock(intent.gatewayOrderId, paymentId);

    // Callback and webhook racing each other.
    await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        verifyAndCreditTopUp({
          userId: user.id,
          gatewayOrderId: intent.gatewayOrderId,
          gatewayPaymentId: paymentId,
          signature,
        }),
      ),
    );

    expect(await balanceOf(user.id)).toBe(500_000);
    const txns = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, user.id));
    expect(txns).toHaveLength(1);
  });
});
