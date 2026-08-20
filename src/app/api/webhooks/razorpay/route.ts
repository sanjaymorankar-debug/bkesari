/**
 * Razorpay server-to-server webhook (requirements §3, §4, §41).
 *
 * This is the safety net the client-invoked `/api/wallet/verify` cannot be:
 * that endpoint only fires if the customer's browser stays online long enough
 * to call it back. If it closes the tab, loses connectivity, or the callback
 * JS simply errors, Razorpay still has the money and this webhook is the only
 * remaining path that credits the wallet.
 *
 * Security, in order:
 *  1. Read the RAW body — signature verification is over the exact bytes
 *     Razorpay sent, not a re-serialised JSON.parse/stringify round-trip.
 *  2. Verify `x-razorpay-signature` (HMAC-SHA256 over the raw body, keyed on
 *     RAZORPAY_WEBHOOK_SECRET) BEFORE touching anything else in the payload.
 *  3. Only then parse and act on it.
 *
 * Idempotent and retry-safe by construction, not by any special-casing here:
 * `creditFromWebhook` → `finalizeVerifiedPayment` does a conditional
 * `UPDATE ... WHERE status = 'CREATED'`, so a redelivered event (Razorpay
 * retries on anything but 2xx) finds the payment already SUCCESS and returns
 * without moving money twice — the same guarantee that protects the
 * client-invoked path racing against this one.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { creditFromWebhook, verifyWebhookSignature } from "@/server/services/payments";

export const dynamic = "force-dynamic";

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
      };
    };
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!getEnv().RAZORPAY_WEBHOOK_SECRET) {
    // Webhook secret not configured — nothing to verify against. Refuse
    // rather than silently accepting unauthenticated payloads (§3 "never put
    // secret keys in frontend code" extends to: never accept a webhook we
    // cannot authenticate).
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[webhook] Razorpay signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  // Only payment.captured actually confirms money moved. order.paid and
  // other lifecycle events are acknowledged (2xx, so Razorpay stops
  // retrying) but intentionally not acted on — acting on anything short of
  // "captured" risks crediting a wallet for a payment that later fails.
  if (event.event !== "payment.captured") {
    return NextResponse.json({ received: true });
  }

  const paymentEntity = event.payload?.payment?.entity;
  const gatewayOrderId = paymentEntity?.order_id;
  const gatewayPaymentId = paymentEntity?.id;
  if (!gatewayOrderId || !gatewayPaymentId) {
    return NextResponse.json({ error: "Missing payment identifiers" }, { status: 400 });
  }

  try {
    await creditFromWebhook(gatewayOrderId, gatewayPaymentId);
  } catch (error) {
    // A genuine processing failure (DB unavailable, etc.) — return non-2xx so
    // Razorpay retries per its documented backoff, rather than silently
    // losing the confirmation.
    console.error("[webhook] failed to process payment.captured", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
