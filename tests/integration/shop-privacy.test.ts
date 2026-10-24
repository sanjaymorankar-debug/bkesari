/**
 * Public shop search returns only a shop's public columns.
 *
 * searchShops() feeds GET /api/shops and the home, shops and search pages,
 * whose client components get every field they are handed serialised into the
 * page. The full row carries the owner's PAN (encrypted), its holder name and
 * last four digits, the registration fee and what has been paid of it, and
 * internal ids — none of which an anonymous visitor may see.
 */
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { shops } from "@/server/db/schema";
import { searchShops } from "@/server/services/shops";
import { createShop, createUser, resetDatabase } from "../helpers/fixtures";

beforeEach(resetDatabase);

const PRIVATE_COLUMNS = [
  "ownerId",
  "panNumberEncrypted",
  "panLast4",
  "panHolderName",
  "panStatus",
  "panVerifiedBy",
  "gstVerifiedBy",
  "registrationNumber",
  "registrationFeePaise",
  "registrationFeeId",
  "amountPaidPaise",
  "feePaymentStatus",
  "referralCodeId",
  "pickupLatitude",
  "pickupLongitude",
  "pickupInstructions",
  "approvedBy",
  "rejectionReason",
  "deletedAt",
] as const;

describe("public shop search", () => {
  it("never returns a shop's private columns", async () => {
    const owner = await createUser({ role: "SHOP_OWNER" });
    const shop = await createShop(owner.id, { status: "APPROVED", name: "Private Dairy" });
    await db
      .update(shops)
      .set({
        panNumberEncrypted: "v1:ciphertext",
        panLast4: "234F",
        panHolderName: "Owner Name",
        amountPaidPaise: 250_000,
        pickupInstructions: "Back gate, ask for the owner",
      })
      .where(eq(shops.id, shop.id));

    const [found] = await searchShops({ query: "Private Dairy" });

    expect(found?.id).toBe(shop.id);
    // What the shop cards need is still there.
    expect(found).toMatchObject({ name: "Private Dairy", slug: shop.slug, city: "Pune" });
    for (const column of PRIVATE_COLUMNS) {
      expect(found).not.toHaveProperty(column);
    }
    expect(JSON.stringify(found)).not.toContain("234F");
    expect(JSON.stringify(found)).not.toContain("ciphertext");
  });
});
