/**
 * Google Geocoding — the one server-side Maps Platform call in the
 * location-capture flow (delivery-system Part 58 follow-up).
 *
 * `global.fetch` is stubbed rather than hitting the real Google API — this
 * suite verifies the call-exactly-once-and-log discipline, not Google's own
 * response correctness.
 */
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/server/db";
import { mapsApiCallLog } from "@/server/db/schema";
import { resolveLocationVerification, verifyLocation } from "@/server/services/geocoding";
import { resetDatabase } from "../helpers/fixtures";

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

describe("verifyLocation", () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.unstubAllGlobals());

  it("returns the formatted address on a successful geocode and logs exactly one row", async () => {
    mockFetchOnce(200, {
      status: "OK",
      results: [{ formatted_address: "123 Test Road, Pune, Maharashtra 411001" }],
    });

    const result = await verifyLocation({
      latitude: 18.5204,
      longitude: 73.8567,
      purpose: "shop_registration",
      entityType: "shop",
    });

    expect(result.formattedAddress).toBe("123 Test Road, Pune, Maharashtra 411001");

    const logs = await db.select().from(mapsApiCallLog);
    expect(logs).toHaveLength(1);
    expect(logs[0].service).toBe("GEOCODING");
    expect(logs[0].purpose).toBe("shop_registration");
    expect(logs[0].success).toBe(true);
  });

  it("throws and logs a failure when Google returns a non-OK status", async () => {
    mockFetchOnce(200, { status: "ZERO_RESULTS", results: [] });

    await expect(
      verifyLocation({ latitude: 0, longitude: 0, purpose: "address_save" }),
    ).rejects.toThrow();

    const logs = await db.select().from(mapsApiCallLog);
    expect(logs).toHaveLength(1);
    expect(logs[0].success).toBe(false);
  });

  it("throws and logs a failure when the HTTP call itself errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(
      verifyLocation({ latitude: 18.5, longitude: 73.8, purpose: "address_save" }),
    ).rejects.toThrow("network down");

    const logs = await db.select().from(mapsApiCallLog);
    expect(logs).toHaveLength(1);
    expect(logs[0].success).toBe(false);
    expect(logs[0].errorMessage).toContain("network down");
  });

  it("writes the related entity id when supplied", async () => {
    mockFetchOnce(200, { status: "OK", results: [{ formatted_address: "Somewhere" }] });

    await verifyLocation({
      latitude: 18.5,
      longitude: 73.8,
      purpose: "shop_location_update",
      entityType: "shop",
      entityId: "test-shop-id",
    });

    const [log] = await db.select().from(mapsApiCallLog).where(eq(mapsApiCallLog.entityId, "test-shop-id"));
    expect(log.entityType).toBe("shop");
  });
});

describe("resolveLocationVerification", () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.unstubAllGlobals());

  it("returns unverified/null when no coordinates are supplied", async () => {
    const result = await resolveLocationVerification(null, null, "shop_registration");
    expect(result).toEqual({ locationVerified: false, locationVerifiedAt: null, locationSource: null });

    const logs = await db.select().from(mapsApiCallLog);
    expect(logs).toHaveLength(0);
  });

  it("marks GOOGLE_VERIFIED when the geocode succeeds", async () => {
    mockFetchOnce(200, { status: "OK", results: [{ formatted_address: "Somewhere" }] });

    const result = await resolveLocationVerification(18.5, 73.8, "shop_registration");
    expect(result.locationVerified).toBe(true);
    expect(result.locationSource).toBe("GOOGLE_VERIFIED");
    expect(result.locationVerifiedAt).not.toBeNull();
  });

  it("falls back to MANUAL_ENTRY without throwing when the geocode fails", async () => {
    mockFetchOnce(200, { status: "ZERO_RESULTS", results: [] });

    const result = await resolveLocationVerification(18.5, 73.8, "shop_registration");
    expect(result.locationVerified).toBe(false);
    expect(result.locationSource).toBe("MANUAL_ENTRY");
    expect(result.locationVerifiedAt).toBeNull();
  });
});
