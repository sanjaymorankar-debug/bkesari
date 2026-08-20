/**
 * Payment gateway integration — Razorpay (requirements §18, §20, §48).
 *
 * The rule that matters: **the wallet is credited only after a signature is
 * verified server-side.** A client claiming "payment succeeded" proves nothing.
 *
 * Replay protection is structural rather than procedural:
 *   - `payments.gateway_payment_id` is UNIQUE, so the same Razorpay payment can
 *     never be recorded twice.
 *   - The wallet credit uses `topup:<paymentId>` as its idempotency key, so even
 *     if the callback and the webhook both fire, only one credit is applied.
 *
 * With no Razorpay credentials configured the service runs in MOCK mode so the
 * whole flow — including verification — is exercisable in development and tests.
 */
import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";

import { getEnv, isPaymentGatewayLive } from "@/lib/env";
import {
  conflict,
  notFound,
  paymentVerificationFailed,
  validationFailed,
} from "@/lib/errors";
import { db } from "@/server/db";
import { payments, type Payment } from "@/server/db/schema";
import { AUDIT_ACTIONS, recordAudit } from "./audit";
import { NOTIFICATION_TYPES, notify } from "./notifications";
import { getOrCreateWallet, applyWalletMutation } from "./wallet";
import { previewVoucher, redeemVoucher } from "./vouchers";

/** Razorpay's floor is ₹1. */
const MIN_TOPUP_PAISE = 100;
/** Sanity ceiling to blunt fat-finger and abuse cases. */
const MAX_TOPUP_PAISE = 10_000_000; // ₹1,00,000

export interface CreateTopUpResult {
  payment: Payment;
  /** Passed to the Razorpay checkout widget. */
  gatewayOrderId: string;
  keyId: string | null;
  amountPaise: number;
  currency: string;
  mock: boolean;
  /** Set only when a voucher code was supplied and validated (§18 preview). */
  voucherPreview: {
    code: string;
    name: string;
    bonusPercent: number;
    bonusAmountPaise: number;
    totalCreditPaise: number;
  } | null;
}

export async function createTopUpOrder(
  userId: string,
  amountPaise: number,
  voucherCode?: string | null,
): Promise<CreateTopUpResult> {
  if (!Number.isInteger(amountPaise)) {
    throw validationFailed("Amount must be a whole number of paise.");
  }
  if (amountPaise < MIN_TOPUP_PAISE) {
    throw validationFailed("The minimum top-up is ₹1.");
  }
  if (amountPaise > MAX_TOPUP_PAISE) {
    throw validationFailed("The maximum top-up is ₹1,00,000.");
  }

  // Validated and computed HERE, at order-creation time, then the code (not
  // the bonus figure) is stored on the payment row. Verification re-derives
  // the bonus from the voucher and the payment's own amount — the client
  // never gets to supply a bonus amount at any point (§32).
  const voucherPreview = voucherCode
    ? await previewVoucher(voucherCode, amountPaise, userId)
    : null;

  const env = getEnv();
  const live = isPaymentGatewayLive();

  const gatewayOrderId = live
    ? await createRazorpayOrder(amountPaise, userId)
    : `mock_order_${crypto.randomUUID()}`;

  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      gateway: live ? "RAZORPAY" : "MOCK",
      gatewayOrderId,
      amountPaise,
      currency: "INR",
      status: "CREATED",
      purpose: "WALLET_TOPUP",
      voucherCode: voucherPreview?.code ?? null,
    })
    .returning();

  return {
    payment,
    gatewayOrderId,
    keyId: env.RAZORPAY_KEY_ID ?? null,
    amountPaise,
    currency: "INR",
    mock: !live,
    voucherPreview: voucherPreview
      ? {
          code: voucherPreview.code!,
          name: voucherPreview.name,
          bonusPercent: voucherPreview.bonusPercent,
          bonusAmountPaise: voucherPreview.bonusAmountPaise,
          totalCreditPaise: voucherPreview.totalCreditPaise,
        }
      : null,
  };
}

export interface VerifyTopUpInput {
  userId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}

export interface VerifyTopUpResult {
  payment: Payment;
  balancePaise: number;
  /** True when this callback had already been processed. */
  alreadyProcessed: boolean;
  voucherBonusPaise: number;
}

/**
 * Verifies a Razorpay callback and credits the wallet.
 *
 * Order of operations is deliberate: verify the signature FIRST, then mark the
 * payment, then credit. A forged callback never reaches the wallet.
 */
export async function verifyAndCreditTopUp(
  input: VerifyTopUpInput,
): Promise<VerifyTopUpResult> {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.gatewayOrderId, input.gatewayOrderId),
  });
  if (!payment) throw notFound("Payment");

  // A payment may only ever be settled by the user who initiated it.
  if (payment.userId !== input.userId) {
    throw paymentVerificationFailed("This payment does not belong to you.");
  }

  // Replay: already verified — including by the webhook, which may have won
  // the race. Return the existing state rather than re-crediting.
  if (payment.status === "SUCCESS") {
    const wallet = await db.query.wallets.findFirst({
      where: (w, { eq: equals }) => equals(w.userId, input.userId),
    });
    return {
      payment,
      balancePaise: wallet?.balancePaise ?? 0,
      alreadyProcessed: true,
      voucherBonusPaise: 0,
    };
  }

  if (payment.status === "REFUNDED" || payment.status === "FAILED") {
    throw conflict("This payment can no longer be completed.");
  }

  const signatureValid = verifySignature(
    input.gatewayOrderId,
    input.gatewayPaymentId,
    input.signature,
  );
  if (!signatureValid) {
    await db
      .update(payments)
      .set({
        status: "FAILED",
        failureReason: "Signature verification failed",
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));
    throw paymentVerificationFailed();
  }

  return finalizeVerifiedPayment(payment, {
    gatewayPaymentId: input.gatewayPaymentId,
    gatewaySignature: input.signature,
  });
}

/**
 * Marks a payment SUCCESS and credits the wallet — the one code path both
 * `verifyAndCreditTopUp` (client-invoked, checkout-signature verified) and
 * the Razorpay webhook (server-to-server, webhook-signature verified) funnel
 * into once THEIR OWN authentication has passed. Whichever one reaches here
 * first wins; the other's replay is absorbed by the SUCCESS-status check in
 * its own caller, or by the UNIQUE index on `payments.gateway_payment_id` /
 * the wallet idempotency key if both race past that check simultaneously.
 */
async function finalizeVerifiedPayment(
  payment: Payment,
  gateway: { gatewayPaymentId: string; gatewaySignature: string | null },
): Promise<VerifyTopUpResult> {
  // Mark verified. The UNIQUE index on gateway_payment_id means a concurrent
  // duplicate callback fails here rather than producing a second credit.
  const [verified] = await db
    .update(payments)
    .set({
      gatewayPaymentId: gateway.gatewayPaymentId,
      gatewaySignature: gateway.gatewaySignature,
      status: "SUCCESS",
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(payments.id, payment.id), eq(payments.status, "CREATED")))
    .returning();

  // Another caller (the other of {client verify, webhook}) won the race
  // between our SELECT above and this UPDATE — treat as an already-processed
  // replay rather than crediting twice.
  if (!verified) {
    const settled = await db.query.payments.findFirst({
      where: eq(payments.id, payment.id),
    });
    const wallet = await db.query.wallets.findFirst({
      where: (w, { eq: equals }) => equals(w.userId, payment.userId),
    });
    return {
      payment: settled ?? payment,
      balancePaise: wallet?.balancePaise ?? 0,
      alreadyProcessed: true,
      voucherBonusPaise: 0,
    };
  }

  // Credit the REAL money only now, keyed on the gateway payment id. This
  // step is guaranteed: nothing about the voucher below is allowed to stop
  // money the customer actually paid from reaching their wallet.
  const result = await applyWalletMutation({
    userId: payment.userId,
    amountPaise: payment.amountPaise,
    type: "TOP_UP",
    idempotencyKey: `topup:${gateway.gatewayPaymentId}`,
    description: "Wallet top-up",
    paymentId: payment.id,
  });

  await recordAudit({
    actorId: payment.userId,
    action: AUDIT_ACTIONS.WALLET_TOPUP_VERIFIED,
    entityType: "payment",
    entityId: payment.id,
    newValue: {
      amountPaise: payment.amountPaise,
      gatewayPaymentId: gateway.gatewayPaymentId,
    },
  });

  await notify({
    userId: payment.userId,
    type: NOTIFICATION_TYPES.WALLET_TOPUP_SUCCESS,
    title: "Wallet topped up",
    body: `₹${(payment.amountPaise / 100).toFixed(2)} has been added to your wallet.`,
    actionUrl: "/wallet",
  });

  // Voucher bonus is opportunistic, not guaranteed (§19): a voucher that
  // expired or hit its budget in the seconds between checkout and this
  // callback must never claw back or block the real TOP_UP above — the
  // customer already paid. Failure here is caught and reported as "no bonus",
  // never surfaced as a payment failure.
  let voucherBonusPaise = 0;
  if (payment.voucherCode) {
    try {
      const wallet = await getOrCreateWallet(payment.userId);
      const redemption = await redeemVoucher({
        code: payment.voucherCode,
        userId: payment.userId,
        walletId: wallet.id,
        topupAmountPaise: payment.amountPaise,
        paymentId: payment.id,
      });
      if (redemption.status === "APPLIED" && redemption.bonusAmountPaise > 0) {
        await applyWalletMutation({
          userId: payment.userId,
          amountPaise: redemption.bonusAmountPaise,
          type: "PROMOTIONAL_CREDIT",
          idempotencyKey: `voucher-credit:${redemption.id}`,
          description: `Voucher bonus (${payment.voucherCode})`,
          paymentId: payment.id,
          voucherRedemptionId: redemption.id,
        });
        voucherBonusPaise = redemption.bonusAmountPaise;
      }
    } catch (error) {
      console.error("[vouchers] bonus not applied for payment", payment.id, error);
    }
  }

  const finalWallet = await db.query.wallets.findFirst({
    where: (w, { eq: equals }) => equals(w.userId, payment.userId),
  });

  return {
    payment: verified,
    balancePaise: finalWallet?.balancePaise ?? result.balancePaise,
    alreadyProcessed: result.deduplicated,
    voucherBonusPaise,
  };
}

/**
 * Server-to-server confirmation path (§3, §4) — the safety net for when a
 * customer's browser never calls `verifyAndCreditTopUp` (closed tab, network
 * drop after paying). The webhook's OWN signature over the raw request body
 * is what authenticates this call; there is no checkout-widget signature to
 * check here because Razorpay's webhook payload never contains one.
 */
export async function creditFromWebhook(
  gatewayOrderId: string,
  gatewayPaymentId: string,
): Promise<VerifyTopUpResult | null> {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.gatewayOrderId, gatewayOrderId),
  });
  if (!payment) return null; // Not one of ours (or a different purpose) — ignore, not an error.

  if (payment.status === "SUCCESS") {
    const wallet = await db.query.wallets.findFirst({
      where: (w, { eq: equals }) => equals(w.userId, payment.userId),
    });
    return {
      payment,
      balancePaise: wallet?.balancePaise ?? 0,
      alreadyProcessed: true,
      voucherBonusPaise: 0,
    };
  }
  if (payment.status === "REFUNDED" || payment.status === "FAILED") return null;

  return finalizeVerifiedPayment(payment, {
    gatewayPaymentId,
    gatewaySignature: null,
  });
}

/**
 * HMAC-SHA256 over `order_id|payment_id`, per Razorpay's specification.
 * Compared in constant time to avoid leaking the expected digest by timing.
 */
export function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  // Keyed off live-mode detection rather than a `??` fallback, so a blank or
  // partially configured credential can never silently sign with "".
  const secret = isPaymentGatewayLive()
    ? getEnv().RAZORPAY_KEY_SECRET!
    : MOCK_SECRET;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verifies a Razorpay webhook body. Webhooks sign the raw payload rather than
 * the order/payment pair, so this is a separate function on purpose.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const secret = getEnv().RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Development/test secret. Only ever used when no real credentials are set, so
 * the mock flow still exercises genuine HMAC verification rather than skipping
 * the check entirely.
 */
const MOCK_SECRET = "mock_razorpay_secret";

/** Produces a valid signature for the mock gateway (dev and tests only). */
export function signForMock(orderId: string, paymentId: string): string {
  if (isPaymentGatewayLive()) {
    throw new Error("signForMock must not be used with live credentials.");
  }
  return crypto
    .createHmac("sha256", MOCK_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

async function createRazorpayOrder(
  amountPaise: number,
  userId: string,
): Promise<string> {
  const env = getEnv();
  // Imported lazily so the SDK is never pulled into a bundle that does not need it.
  const Razorpay = (await import("razorpay")).default;
  const client = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID!,
    key_secret: env.RAZORPAY_KEY_SECRET!,
  });

  const order = await client.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `topup_${Date.now()}`,
    notes: { userId, purpose: "WALLET_TOPUP" },
  });
  return order.id;
}

export async function listPayments(userId: string): Promise<Payment[]> {
  return db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(payments.createdAt);
}
