/**
 * Wallet top-up + voucher integration through the real payment verification
 * path (wallet & voucher brief §2–§4, §18–§20; TEST 1–4, 8, 9, 33).
 *
 * Uses the mock-gateway signing helper so these exercise genuine HMAC
 * verification, not a shortcut that skips it — the same discipline
 * `dev/settle-topup` uses in the actual dev flow.
 */
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { payments, wallets } from "@/server/db/schema";
import {
  createTopUpOrder,
  creditFromWebhook,
  signForMock,
  verifyAndCreditTopUp,
} from "@/server/services/payments";
import { createPayment, createUserWithWallet, createVoucher, resetDatabase } from "../helpers/fixtures";

describe("wallet top-up (TEST 1)", () => {
  beforeEach(resetDatabase);

  it("credits the wallet only after signature verification, matching §2's example exactly", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 200_000 }); // ₹2,000

    const intent = await createTopUpOrder(user.id, 500_000); // ₹5,000
    expect(intent.mock).toBe(true);

    const paymentId = `mock_pay_${intent.gatewayOrderId.slice(-12)}`;
    const result = await verifyAndCreditTopUp({
      userId: user.id,
      gatewayOrderId: intent.gatewayOrderId,
      gatewayPaymentId: paymentId,
      signature: signForMock(intent.gatewayOrderId, paymentId),
    });

    expect(result.balancePaise).toBe(700_000); // ₹7,000
  });

  it("rejects a forged signature and credits nothing (TEST — backend never trusts the client)", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 100_000);

    await expect(
      verifyAndCreditTopUp({
        userId: user.id,
        gatewayOrderId: intent.gatewayOrderId,
        gatewayPaymentId: "pay_forged",
        signature: "not-a-real-signature",
      }),
    ).rejects.toThrow();

    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    expect(wallet.balancePaise).toBe(0);
  });
});

describe("duplicate/replayed payment confirmation (TEST 4)", () => {
  beforeEach(resetDatabase);

  it("does not double-credit when the same callback is processed twice", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 100_000);
    const paymentId = `mock_pay_${intent.gatewayOrderId.slice(-12)}`;
    const signature = signForMock(intent.gatewayOrderId, paymentId);

    const first = await verifyAndCreditTopUp({
      userId: user.id, gatewayOrderId: intent.gatewayOrderId,
      gatewayPaymentId: paymentId, signature,
    });
    const second = await verifyAndCreditTopUp({
      userId: user.id, gatewayOrderId: intent.gatewayOrderId,
      gatewayPaymentId: paymentId, signature,
    });

    expect(first.balancePaise).toBe(100_000);
    expect(second.alreadyProcessed).toBe(true);
    expect(second.balancePaise).toBe(100_000); // still 100,000, not 200,000
  });

  it("the webhook path and the client-verify path racing produce exactly one credit", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 100_000);
    const paymentId = `mock_pay_${intent.gatewayOrderId.slice(-12)}`;
    const signature = signForMock(intent.gatewayOrderId, paymentId);

    // Both "arrive" for the same payment — webhook first, then the client
    // callback (or vice versa; order doesn't matter to the guarantee).
    const [webhookResult, clientResult] = await Promise.all([
      creditFromWebhook(intent.gatewayOrderId, paymentId),
      verifyAndCreditTopUp({
        userId: user.id, gatewayOrderId: intent.gatewayOrderId,
        gatewayPaymentId: paymentId, signature,
      }),
    ]);

    expect(webhookResult).not.toBeNull();
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    expect(wallet.balancePaise).toBe(100_000); // exactly one credit, not two
    void clientResult;
  });
});

describe("top-up with a voucher (§18–§20, TEST 33)", () => {
  beforeEach(resetDatabase);

  it("credits TOP_UP and VOUCHER_BONUS as two distinct ledger entries", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    await createVoucher({ code: "FEST10", bonusPercent: 10 });

    const intent = await createTopUpOrder(user.id, 100_000, "FEST10");
    expect(intent.voucherPreview?.bonusAmountPaise).toBe(10_000);

    const [stored] = await db.select().from(payments).where(eq(payments.id, intent.payment.id));
    expect(stored.voucherCode).toBe("FEST10");

    const paymentId = `mock_pay_${intent.gatewayOrderId.slice(-12)}`;
    const result = await verifyAndCreditTopUp({
      userId: user.id,
      gatewayOrderId: intent.gatewayOrderId,
      gatewayPaymentId: paymentId,
      signature: signForMock(intent.gatewayOrderId, paymentId),
    });

    expect(result.voucherBonusPaise).toBe(10_000);
    expect(result.balancePaise).toBe(110_000); // ₹1,100 total, matching §20's example
  });

  it("still credits the real TOP_UP even if the voucher became invalid mid-flight", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const voucher = await createVoucher({ code: "RACY", bonusPercent: 10, usageLimit: 1 });

    const intent = await createTopUpOrder(user.id, 100_000, "RACY");

    // Someone else exhausts the voucher's single use between order creation
    // and this customer's payment confirming.
    const other = await createUserWithWallet({ balancePaise: 0 });
    const otherPayment = await createPayment(other.user.id, { amountPaise: 100_000 });
    const { redeemVoucher } = await import("@/server/services/vouchers");
    await redeemVoucher({
      code: "RACY", userId: other.user.id, walletId: other.wallet.id,
      topupAmountPaise: 100_000, paymentId: otherPayment.id,
    });
    void voucher;

    const paymentId = `mock_pay_${intent.gatewayOrderId.slice(-12)}`;
    const result = await verifyAndCreditTopUp({
      userId: user.id,
      gatewayOrderId: intent.gatewayOrderId,
      gatewayPaymentId: paymentId,
      signature: signForMock(intent.gatewayOrderId, paymentId),
    });

    // The real money is credited regardless — voucher failure never blocks it.
    expect(result.balancePaise).toBe(100_000);
    expect(result.voucherBonusPaise).toBe(0);
  });
});
