/**
 * Shop location capture and verification (delivery-system Part 58 follow-up,
 * Slice A) — one-time verification, pickup point, and re-verification on
 * pin movement only (never on unrelated field changes).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerShop, updateShop } from "@/server/services/shops";
import { createUser, resetDatabase } from "../helpers/fixtures";

function mockGeocodeSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "OK", results: [{ formatted_address: "Somewhere" }] }),
    }),
  );
}

const baseShop = {
  name: "Test Shop",
  ownerName: "Owner",
  phone: "9876543210",
  addressLine1: "1 Test Road",
  city: "Pune",
  pincode: "411001",
  shopType: "DAIRY" as const,
};

describe("registerShop location", () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.unstubAllGlobals());

  it("registers unverified when no coordinates are supplied", async () => {
    const user = await createUser();
    const shop = await registerShop(baseShop, { id: user.id, role: user.role });
    expect(shop.locationVerified).toBe(false);
    expect(shop.locationSource).toBeNull();
  });

  it("registers GOOGLE_VERIFIED when coordinates geocode successfully", async () => {
    mockGeocodeSuccess();
    const user = await createUser();
    const shop = await registerShop(
      { ...baseShop, latitude: "18.55", longitude: "73.93" },
      { id: user.id, role: user.role },
    );
    expect(shop.locationVerified).toBe(true);
    expect(shop.locationSource).toBe("GOOGLE_VERIFIED");
  });

  it("stores an independent pickup point", async () => {
    const user = await createUser();
    const shop = await registerShop(
      {
        ...baseShop,
        pickupLatitude: "18.56",
        pickupLongitude: "73.94",
        pickupInstructions: "Service entrance, Gate 3",
      },
      { id: user.id, role: user.role },
    );
    expect(shop.pickupLatitude).toBe("18.56");
    expect(shop.pickupInstructions).toBe("Service entrance, Gate 3");
  });
});

describe("updateShop location", () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.unstubAllGlobals());

  it("does not re-geocode when coordinates are unchanged", async () => {
    mockGeocodeSuccess();
    const user = await createUser();
    const shop = await registerShop(
      { ...baseShop, latitude: "18.55", longitude: "73.93" },
      { id: user.id, role: user.role },
    );

    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("should not be called")));
    const updated = await updateShop(
      shop.id,
      { latitude: "18.55", longitude: "73.93", description: "Updated description" },
      { id: user.id, role: user.role },
    );
    expect(updated.locationVerified).toBe(true);
    expect(updated.description).toBe("Updated description");
  });

  it("re-verifies and can flip back to unverified when the pin moves and the new geocode fails", async () => {
    mockGeocodeSuccess();
    const user = await createUser();
    const shop = await registerShop(
      { ...baseShop, latitude: "18.55", longitude: "73.93" },
      { id: user.id, role: user.role },
    );
    expect(shop.locationVerified).toBe(true);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ZERO_RESULTS", results: [] }),
      }),
    );
    const updated = await updateShop(
      shop.id,
      { latitude: "19.00", longitude: "74.00" },
      { id: user.id, role: user.role },
    );
    // The old verified location must not silently carry over onto an
    // unverified new pin.
    expect(updated.locationVerified).toBe(false);
    expect(updated.latitude).toBe("19.00");
  });
});
