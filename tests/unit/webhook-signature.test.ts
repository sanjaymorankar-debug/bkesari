/**
 * Cashfree webhook signature verification (wallet & voucher brief §3, §4).
 * Pure HMAC math — no database needed.
 */
import { describe, expect, it } from "vitest";
import crypto from "node:crypto";

import { verifyWebhookSignature } from "@/server/services/payments";

function sign(secret: string, timestamp: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(timestamp + body).digest("base64");
}

describe("verifyWebhookSignature", () => {
  it("accepts a correctly-signed body", () => {
    const secret = process.env.CASHFREE_SECRET_KEY!;
    const timestamp = "1735689600";
    const body = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" });
    const signature = sign(secret, timestamp, body);
    expect(verifyWebhookSignature(body, timestamp, signature)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const secret = process.env.CASHFREE_SECRET_KEY!;
    const timestamp = "1735689600";
    const body = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" });
    const signature = sign(secret, timestamp, body);
    const tampered = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", amount: 999999999 });
    expect(verifyWebhookSignature(tampered, timestamp, signature)).toBe(false);
  });

  it("rejects a signature produced with the wrong secret", () => {
    const timestamp = "1735689600";
    const body = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" });
    const wrongSignature = sign("wrong-secret", timestamp, body);
    expect(verifyWebhookSignature(body, timestamp, wrongSignature)).toBe(false);
  });

  it("rejects a signature computed with a different timestamp", () => {
    const secret = process.env.CASHFREE_SECRET_KEY!;
    const body = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" });
    const signature = sign(secret, "1735689600", body);
    expect(verifyWebhookSignature(body, "1735689601", signature)).toBe(false);
  });

  it("rejects mismatched signature lengths without throwing", () => {
    expect(verifyWebhookSignature("{}", "1735689600", "short")).toBe(false);
  });
});
