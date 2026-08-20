/**
 * Registration fees and payments (§12, §15, §25.11, §25.12).
 *
 * The two claims under test are both about things NOT changing:
 *   - raising the current fee must not re-bill an existing shop
 *   - a recorded payment must never be edited or deleted
 */
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { shopPayments, shops } from "@/server/db/schema";
import {
  getActiveFee,
  listFeeHistory,
  resolveFeeForNewRegistration,
  setRegistrationFee,
} from "@/server/services/registration-fees";
import {
  getRegistrationFeeReport,
  listPaymentsForShop,
  recordPayment,
  reversePayment,
} from "@/server/services/shop-payments";
import { registerShop } from "@/server/services/shops";
import { createShop, createUser, resetDatabase } from "../helpers/fixtures";

const ADMIN = (id: string) => ({ id, role: "ADMIN" as const });
const OPERATOR = (id: string) => ({ id, role: "OPERATOR" as const });

describe("registration fee schedule", () => {
  beforeEach(resetDatabase);

  it("records history and activates exactly one fee", async () => {
    const admin = await createUser({ role: "ADMIN" });

    await setRegistrationFee({ amountPaise: 500_000 }, ADMIN(admin.id));
    await setRegistrationFee(
      { amountPaise: 600_000, reason: "Annual revision" },
      ADMIN(admin.id),
    );

    const active = await getActiveFee();
    expect(active?.amountPaise).toBe(600_000);

    const history = await listFeeHistory();
    expect(history).toHaveLength(2);
    expect(history[0].previousAmountPaise).toBe(500_000);
    expect(history[0].newAmountPaise).toBe(600_000);
    expect(history[0].reason).toBe("Annual revision");
  });

  it("does not change what an already-registered shop was charged (§25.11)", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const applicant = await createUser({ role: "CUSTOMER" });

    await setRegistrationFee({ amountPaise: 500_000 }, ADMIN(admin.id));

    const shop = await registerShop(
      {
        name: "Shop A",
        ownerName: "A",
        phone: "9876543210",
        addressLine1: "1 Road",
        city: "Pune",
        pincode: "411001",
        shopType: "DAIRY",
      },
      { id: applicant.id, role: "CUSTOMER" },
    );
    expect(shop.registrationFeePaise).toBe(500_000);

    // The fee goes up AFTER Shop A registered.
    await setRegistrationFee({ amountPaise: 600_000 }, ADMIN(admin.id));

    const [reloaded] = await db
      .select()
      .from(shops)
      .where(eq(shops.id, shop.id));
    expect(reloaded.registrationFeePaise).toBe(500_000);

    // ...and a shop registering now picks up the new amount.
    expect((await resolveFeeForNewRegistration()).amountPaise).toBe(600_000);
  });

  it("assigns a unique registration number to every shop", async () => {
    const a = await createUser();
    const b = await createUser();
    const shopA = await createShop(a.id, { name: "A" });
    const shopB = await createShop(b.id, { name: "B" });

    expect(shopA.registrationNumber).toMatch(/^BKS-\d{6}$/);
    expect(shopB.registrationNumber).not.toBe(shopA.registrationNumber);
  });
});

describe("shop payments", () => {
  beforeEach(resetDatabase);

  it("moves the shop from PENDING to PARTIALLY_PAID to PAID", async () => {
    const operator = await createUser({ role: "OPERATOR" });
    const owner = await createUser({ role: "SHOP_OWNER" });
    const shop = await createShop(owner.id, { registrationFeePaise: 500_000 });

    expect(shop.feePaymentStatus).toBe("PENDING");

    const partial = await recordPayment(
      {
        shopId: shop.id,
        paymentType: "REGISTRATION_FEE",
        amountPaise: 200_000,
        method: "UPI",
      },
      OPERATOR(operator.id),
    );
    expect(partial.feePaymentStatus).toBe("PARTIALLY_PAID");
    expect(partial.amountPaidPaise).toBe(200_000);

    const full = await recordPayment(
      {
        shopId: shop.id,
        paymentType: "REGISTRATION_FEE",
        amountPaise: 300_000,
        method: "CASH",
      },
      OPERATOR(operator.id),
    );
    expect(full.feePaymentStatus).toBe("PAID");
    expect(full.amountPaidPaise).toBe(500_000);
  });

  it("corrects a mistake with a reversal rather than a deletion (§15)", async () => {
    const operator = await createUser({ role: "OPERATOR" });
    const owner = await createUser({ role: "SHOP_OWNER" });
    const shop = await createShop(owner.id, { registrationFeePaise: 500_000 });

    const { payment } = await recordPayment(
      {
        shopId: shop.id,
        paymentType: "REGISTRATION_FEE",
        amountPaise: 500_000,
      },
      OPERATOR(operator.id),
    );

    const reversed = await reversePayment(
      payment.id,
      "Recorded against the wrong shop",
      OPERATOR(operator.id),
    );

    // The original row is still there, byte for byte.
    const [original] = await db
      .select()
      .from(shopPayments)
      .where(eq(shopPayments.id, payment.id));
    expect(original).toBeDefined();
    expect(original.amountPaise).toBe(500_000);

    // ...and the settlement is back to zero via the mirror row, not an edit.
    expect(reversed.amountPaidPaise).toBe(0);
    expect(reversed.feePaymentStatus).toBe("PENDING");

    const all = await listPaymentsForShop(shop.id);
    expect(all).toHaveLength(2);
  });

  it("refuses to reverse the same payment twice", async () => {
    const operator = await createUser({ role: "OPERATOR" });
    const owner = await createUser({ role: "SHOP_OWNER" });
    const shop = await createShop(owner.id, { registrationFeePaise: 500_000 });

    const { payment } = await recordPayment(
      { shopId: shop.id, paymentType: "REGISTRATION_FEE", amountPaise: 100_000 },
      OPERATOR(operator.id),
    );

    await reversePayment(payment.id, "duplicate", OPERATOR(operator.id));
    await expect(
      reversePayment(payment.id, "again", OPERATOR(operator.id)),
    ).rejects.toThrow();
  });

  it("stores a refund as a negative amount so the net is correct", async () => {
    const operator = await createUser({ role: "OPERATOR" });
    const owner = await createUser({ role: "SHOP_OWNER" });
    const shop = await createShop(owner.id, { registrationFeePaise: 500_000 });

    await recordPayment(
      { shopId: shop.id, paymentType: "REGISTRATION_FEE", amountPaise: 500_000 },
      OPERATOR(operator.id),
    );
    const refunded = await recordPayment(
      { shopId: shop.id, paymentType: "REFUND", amountPaise: 100_000 },
      OPERATOR(operator.id),
    );

    expect(refunded.amountPaidPaise).toBe(400_000);
    expect(refunded.feePaymentStatus).toBe("PARTIALLY_PAID");
  });

  it("rejects a zero or negative payment", async () => {
    const operator = await createUser({ role: "OPERATOR" });
    const owner = await createUser({ role: "SHOP_OWNER" });
    const shop = await createShop(owner.id);

    await expect(
      recordPayment(
        { shopId: shop.id, paymentType: "REGISTRATION_FEE", amountPaise: 0 },
        OPERATOR(operator.id),
      ),
    ).rejects.toThrow();
    await expect(
      recordPayment(
        { shopId: shop.id, paymentType: "REGISTRATION_FEE", amountPaise: -100 },
        OPERATOR(operator.id),
      ),
    ).rejects.toThrow();
  });

  it("totals the registration fee report across shops (§14)", async () => {
    const operator = await createUser({ role: "OPERATOR" });
    const ownerA = await createUser({ role: "SHOP_OWNER" });
    const ownerB = await createUser({ role: "SHOP_OWNER" });

    const shopA = await createShop(ownerA.id, {
      name: "A",
      registrationFeePaise: 500_000,
    });
    await createShop(ownerB.id, { name: "B", registrationFeePaise: 500_000 });

    await recordPayment(
      { shopId: shopA.id, paymentType: "REGISTRATION_FEE", amountPaise: 500_000 },
      OPERATOR(operator.id),
    );

    const report = await getRegistrationFeeReport();
    expect(report.totalShops).toBe(2);
    expect(report.expectedPaise).toBe(1_000_000);
    expect(report.collectedPaise).toBe(500_000);
    expect(report.pendingPaise).toBe(500_000);
    expect(report.fullyPaid).toBe(1);
    expect(report.unpaid).toBe(1);
  });
});
