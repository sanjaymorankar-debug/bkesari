/**
 * Live-path payment confirmation (§18, §20, §48) — `verifyAndCreditTopUp`
 * calling Cashfree's Get Order Payments API server-to-server.
 *
 * `global.fetch` is stubbed rather than hitting the real sandbox here, so
 * this suite is deterministic and offline; the real sandbox integration was
 * separately smoke-tested by hand against the actual Cashfree API during
 * development (order creation + status fetch both confirmed working).
 * `verifyAndCreditTopUp` does not branch on live/mock — it always calls
 * Cashfree — so a MOCK-created payment (fast, no network) is a fine subject
 * for testing this verification logic in isolation.
 */
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/server/db";
import { wallets } from "@/server/db/schema";
import { createTopUpOrder, verifyAndCreditTopUp } from "@/server/services/payments";
import { createUserWithWallet, resetDatabase } from "../helpers/fixtures";

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }),
  );
}

const balanceOf = async (userId: string) =>
  (await db.query.wallets.findFirst({ where: eq(wallets.userId, userId) }))!
    .balancePaise;

describe("verifyAndCreditTopUp — live Cashfree confirmation", () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.unstubAllGlobals());

  it("credits the wallet when Cashfree reports a SUCCESS payment attempt", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 500_000);

    mockFetchOnce(200, [
      { cf_payment_id: "cf_pay_1", payment_status: "SUCCESS" },
    ]);

    const result = await verifyAndCreditTopUp({
      userId: user.id,
      gatewayOrderId: intent.gatewayOrderId,
    });

    expect(result.balancePaise).toBe(500_000);
    expect(await balanceOf(user.id)).toBe(500_000);
  });

  it("picks the SUCCESS attempt out of several (e.g. a failed retry followed by success)", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 200_000);

    mockFetchOnce(200, [
      { cf_payment_id: "cf_pay_failed", payment_status: "FAILED" },
      { cf_payment_id: "cf_pay_ok", payment_status: "SUCCESS" },
    ]);

    const result = await verifyAndCreditTopUp({
      userId: user.id,
      gatewayOrderId: intent.gatewayOrderId,
    });

    expect(result.balancePaise).toBe(200_000);
  });

  it("fails closed when Cashfree reports no successful attempt yet", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 300_000);

    mockFetchOnce(200, []);

    await expect(
      verifyAndCreditTopUp({ userId: user.id, gatewayOrderId: intent.gatewayOrderId }),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });

    expect(await balanceOf(user.id)).toBe(0);
  });

  it("fails closed when the Cashfree API call itself errors", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 300_000);

    mockFetchOnce(500, { message: "internal error" });

    await expect(
      verifyAndCreditTopUp({ userId: user.id, gatewayOrderId: intent.gatewayOrderId }),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });

    expect(await balanceOf(user.id)).toBe(0);
  });

  it("does not credit twice when confirmed twice (replay via client + webhook race)", async () => {
    const { user } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(user.id, 400_000);

    mockFetchOnce(200, [{ cf_payment_id: "cf_pay_dup", payment_status: "SUCCESS" }]);

    const first = await verifyAndCreditTopUp({
      userId: user.id,
      gatewayOrderId: intent.gatewayOrderId,
    });
    const second = await verifyAndCreditTopUp({
      userId: user.id,
      gatewayOrderId: intent.gatewayOrderId,
    });

    expect(first.alreadyProcessed).toBe(false);
    expect(second.alreadyProcessed).toBe(true);
    expect(await balanceOf(user.id)).toBe(400_000);
  });

  it("refuses to let one user confirm another user's payment", async () => {
    const { user: payer } = await createUserWithWallet({ balancePaise: 0 });
    const { user: attacker } = await createUserWithWallet({ balancePaise: 0 });
    const intent = await createTopUpOrder(payer.id, 400_000);

    mockFetchOnce(200, [{ cf_payment_id: "cf_pay_hijack", payment_status: "SUCCESS" }]);

    await expect(
      verifyAndCreditTopUp({ userId: attacker.id, gatewayOrderId: intent.gatewayOrderId }),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });

    expect(await balanceOf(attacker.id)).toBe(0);
    expect(await balanceOf(payer.id)).toBe(0);
  });
});
