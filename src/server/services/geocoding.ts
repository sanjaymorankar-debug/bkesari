/**
 * Google Geocoding — the ONE server-side Google Maps Platform call in the
 * whole location-capture flow (delivery-system Part 58 follow-up).
 *
 * Cost-optimization architecture: Google is called exactly once per shop
 * location and once per customer address, at the moment it's confirmed —
 * never again for that same location. Address search-as-you-type and the
 * interactive map itself run entirely client-side against the browser-
 * restricted `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Places Autocomplete + Maps
 * JavaScript API) and never touch this server. This file is reached only by
 * the "Confirm location" action, and every call it makes is logged to
 * `maps_api_call_log` so usage stays auditable. Search, map-marker display,
 * rider assignment and every other read after that point uses the stored
 * `latitude`/`longitude` columns directly — see haversine.ts.
 */
import { getEnv, isGeocodingConfigured } from "@/lib/env";
import { db } from "@/server/db";
import { mapsApiCallLog } from "@/server/db/schema";

export interface VerifiedLocation {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface GeocodePurpose {
  purpose: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Reverse-geocodes a confirmed pin (lat/long from the map picker) into a
 * normalized formatted address, and logs the call. Callers should only
 * invoke this from a "Confirm location" action — never on page load, search,
 * or any read path.
 *
 * @throws if the server-side key isn't configured, or Google's API errors —
 *   callers must fail loudly (never silently mark a location "verified"
 *   without a successful response).
 */
export async function verifyLocation(
  input: { latitude: number; longitude: number } & GeocodePurpose,
): Promise<VerifiedLocation> {
  if (!isGeocodingConfigured()) {
    throw new Error(
      "Location verification is not configured (GOOGLE_MAPS_SERVER_API_KEY is unset).",
    );
  }

  const startedAt = Date.now();
  let success = false;
  let errorMessage: string | null = null;
  let formattedAddress = "";

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${input.latitude},${input.longitude}`);
    url.searchParams.set("key", getEnv().GOOGLE_MAPS_SERVER_API_KEY!);

    const response = await fetch(url, { method: "GET" });
    const body = (await response.json()) as {
      status: string;
      results?: Array<{ formatted_address: string }>;
      error_message?: string;
    };

    if (!response.ok || body.status !== "OK" || !body.results?.[0]) {
      throw new Error(body.error_message ?? `Geocoding failed: ${body.status}`);
    }

    formattedAddress = body.results[0].formatted_address;
    success = true;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown geocoding error";
    throw error;
  } finally {
    await db
      .insert(mapsApiCallLog)
      .values({
        service: "GEOCODING",
        purpose: input.purpose,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        success,
        responseTimeMs: Date.now() - startedAt,
        errorMessage,
      })
      .catch((err) => {
        // Logging must never break the actual verification flow.
        console.error("[maps] failed to record API call log", err);
      });
  }

  return { latitude: input.latitude, longitude: input.longitude, formattedAddress };
}

export interface LocationVerification {
  locationVerified: boolean;
  locationVerifiedAt: Date | null;
  locationSource: "GOOGLE_VERIFIED" | "MANUAL_ENTRY" | null;
}

/**
 * Shared "verify if coordinates were supplied" resolution used by both shop
 * and address save/update flows. Never trusts a caller-supplied
 * `locationVerified` flag — that would let a client claim verification
 * without ever calling Google. Verification status is always computed here,
 * from whether `verifyLocation()` actually succeeded.
 */
export async function resolveLocationVerification(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  purpose: GeocodePurpose["purpose"],
  entityType?: string,
  entityId?: string,
): Promise<LocationVerification> {
  if (latitude == null || longitude == null) {
    return { locationVerified: false, locationVerifiedAt: null, locationSource: null };
  }
  try {
    await verifyLocation({ latitude, longitude, purpose, entityType, entityId });
    return { locationVerified: true, locationVerifiedAt: new Date(), locationSource: "GOOGLE_VERIFIED" };
  } catch {
    return { locationVerified: false, locationVerifiedAt: null, locationSource: "MANUAL_ENTRY" };
  }
}
