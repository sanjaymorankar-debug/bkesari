/**
 * Customer delivery addresses (delivery-system Part 58 follow-up, Slice A).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAddress,
  deleteAddress,
  getAddress,
  listAddresses,
  updateAddress,
} from "@/server/services/addresses";
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

function mockGeocodeFailure() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ZERO_RESULTS", results: [] }),
    }),
  );
}

const baseInput = {
  line1: "12 MG Road",
  area: "Kharadi",
  city: "Pune",
  pincode: "411014",
};

describe("createAddress", () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.unstubAllGlobals());

  it("saves an address without coordinates as unverified", async () => {
    const user = await createUser();
    const address = await createAddress(user.id, baseInput);
    expect(address.locationVerified).toBe(false);
    expect(address.locationSource).toBeNull();
    expect(address.latitude).toBeNull();
  });

  it("marks the address GOOGLE_VERIFIED when coordinates geocode successfully", async () => {
    mockGeocodeSuccess();
    const user = await createUser();
    const address = await createAddress(user.id, { ...baseInput, latitude: 18.55, longitude: 73.93 });
    expect(address.locationVerified).toBe(true);
    expect(address.locationSource).toBe("GOOGLE_VERIFIED");
    expect(address.latitude).toBe("18.55");
  });

  it("still saves the address, unverified, when geocoding fails", async () => {
    mockGeocodeFailure();
    const user = await createUser();
    const address = await createAddress(user.id, { ...baseInput, latitude: 18.55, longitude: 73.93 });
    expect(address.locationVerified).toBe(false);
    expect(address.locationSource).toBe("MANUAL_ENTRY");
    // The customer-supplied pin is still saved even though it wasn't verified.
    expect(address.latitude).toBe("18.55");
  });

  it("rejects an invalid pincode", async () => {
    const user = await createUser();
    await expect(createAddress(user.id, { ...baseInput, pincode: "123" })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it("unsets other defaults when a new default address is added", async () => {
    const user = await createUser();
    const first = await createAddress(user.id, { ...baseInput, isDefault: true });
    const second = await createAddress(user.id, { ...baseInput, label: "Work", isDefault: true });

    const list = await listAddresses(user.id);
    const refreshedFirst = list.find((a) => a.id === first.id)!;
    const refreshedSecond = list.find((a) => a.id === second.id)!;
    expect(refreshedFirst.isDefault).toBe(false);
    expect(refreshedSecond.isDefault).toBe(true);
  });
});

describe("updateAddress", () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.unstubAllGlobals());

  it("re-verifies only when the coordinates actually change", async () => {
    mockGeocodeSuccess();
    const user = await createUser();
    const address = await createAddress(user.id, { ...baseInput, latitude: 18.55, longitude: 73.93 });
    expect(address.locationVerified).toBe(true);

    // Update something unrelated, keeping the same coordinates — no new
    // geocode call, verification status carries forward.
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("should not be called")));
    const updated = await updateAddress(user.id, address.id, {
      ...baseInput,
      landmark: "Near the water tank",
      latitude: 18.55,
      longitude: 73.93,
    });
    expect(updated.locationVerified).toBe(true);
    expect(updated.landmark).toBe("Near the water tank");
  });

  it("re-verifies when the pin moves", async () => {
    mockGeocodeSuccess();
    const user = await createUser();
    const address = await createAddress(user.id, { ...baseInput, latitude: 18.55, longitude: 73.93 });

    mockGeocodeFailure();
    const updated = await updateAddress(user.id, address.id, {
      ...baseInput,
      latitude: 19.0,
      longitude: 74.0,
    });
    // Pin moved and the new geocode failed — verification resets, not stays stale-true.
    expect(updated.locationVerified).toBe(false);
    expect(updated.locationSource).toBe("MANUAL_ENTRY");
  });

  it("throws NOT_FOUND for another user's address", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const address = await createAddress(owner.id, baseInput);

    await expect(updateAddress(attacker.id, address.id, baseInput)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("listAddresses / getAddress / deleteAddress", () => {
  beforeEach(resetDatabase);

  it("lists only the caller's own, non-deleted addresses, default first", async () => {
    const user = await createUser();
    await createAddress(user.id, { ...baseInput, label: "Home" });
    const work = await createAddress(user.id, { ...baseInput, label: "Work", isDefault: true });

    const list = await listAddresses(user.id);
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe(work.id);
  });

  it("soft-deletes so the address no longer appears in the list", async () => {
    const user = await createUser();
    const address = await createAddress(user.id, baseInput);
    await deleteAddress(user.id, address.id);

    expect(await listAddresses(user.id)).toHaveLength(0);
    await expect(getAddress(user.id, address.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuses to delete another user's address", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const address = await createAddress(owner.id, baseInput);

    await expect(deleteAddress(attacker.id, address.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
