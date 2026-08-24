/**
 * Straight-line distance between two coordinates — pure math, no external
 * API call. This is the workhorse for every "nearby" query (shop search,
 * rider assignment) so routine reads never cost a Google Maps request; see
 * the cost-optimization notes in src/server/services/geocoding.ts.
 */

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres between two lat/long points. */
export function haversineDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Parses the app's stored text lat/long columns; null if either is missing/invalid. */
export function parseCoordinates(
  latitude: string | null | undefined,
  longitude: string | null | undefined,
): { latitude: number; longitude: number } | null {
  if (!latitude || !longitude) return null;
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { latitude: lat, longitude: lon };
}
