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

import { eq } from "drizzle-orm";

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
import { applyWalletMutation } from "./wallet";

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
}

export async function createTopUpOrder(
  userId: string,
  amountPaise: number,
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
    })
    .returning();

  return {
    payment,
    gatewayOrderId,
    keyId: env.RAZORPAY_KEY_ID ?? null,
    amountPaise,
    currency: "INR",
    mock: !live,
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

  // Replay: already verified. Return the existing state rather than re-crediting.
  if (payment.status === "SUCCESS") {
    const wallet = await db.query.wallets.findFirst({
      where: (w, { eq: equals }) => equals(w.userId, input.userId),
    });
    return {
      payment,
      balancePaise: wallet?.balancePaise ?? 0,
      alreadyProcessed: true,
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

  // Mark verified. The UNIQUE index on gateway_payment_id means a concurrent
  // duplicate callback fails here rather than producing a second credit.
  const [verified] = await db
    .update(payments)
    .set({
      gatewayPaymentId: input.gatewayPaymentId,
      gatewaySignature: input.signature,
      status: "SUCCESS",
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id))
    .returning();

  // Credit only now, keyed on the gateway payment id.
  const result = await applyWalletMutation({
    userId: input.userId,
    amountPaise: payment.amountPaise,
    type: "TOP_UP",
    idempotencyKey: `topup:${input.gatewayPaymentId}`,
    description: "Wallet top-up",
    paymentId: payment.id,
  });

  await recordAudit({
    actorId: input.userId,
    action: AUDIT_ACTIONS.WALLET_TOPUP_VERIFIED,
    entityType: "payment",
    entityId: payment.id,
    newValue: {
      amountPaise: payment.amountPaise,
      gatewayPaymentId: input.gatewayPaymentId,
    },
  });

  await notify({
    userId: input.userId,
    type: NOTIFICATION_TYPES.WALLET_TOPUP_SUCCESS,
    title: "Wallet topped up",
    body: `₹${(payment.amountPaise / 100).toFixed(2)} has been added to your wallet.`,
    actionUrl: "/wallet",
  });

  return {
    payment: verified,
    balancePaise: result.balancePaise,
    alreadyProcessed: result.deduplicated,
  };
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
