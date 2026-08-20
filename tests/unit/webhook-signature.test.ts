/**
 * Razorpay webhook signature verification (wallet & voucher brief §3, §4).
 * Pure HMAC math — no database needed.
 */
import { describe, expect, it } from "vitest";
import crypto from "node:crypto";

import { verifyWebhookSignature } from "@/server/services/payments";

describe("verifyWebhookSignature", () => {
  it("accepts a correctly-signed body", () => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const body = JSON.stringify({ event: "payment.captured" });
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, signature)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const body = JSON.stringify({ event: "payment.captured" });
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const tampered = JSON.stringify({ event: "payment.captured", amount: 999999999 });
    expect(verifyWebhookSignature(tampered, signature)).toBe(false);
  });

  it("rejects a signature produced with the wrong secret", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const wrongSignature = crypto.createHmac("sha256", "wrong-secret").update(body).digest("hex");
    expect(verifyWebhookSignature(body, wrongSignature)).toBe(false);
  });

  it("rejects mismatched signature lengths without throwing", () => {
    expect(verifyWebhookSignature("{}", "short")).toBe(false);
  });
});
