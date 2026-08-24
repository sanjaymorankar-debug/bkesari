/**
 * Delivery-partner vehicle types (delivery-system Part 58 follow-up).
 *
 * An app-level list, not a Postgres enum — the brief calls for vehicle
 * types to be "configurable"; adding one here is a code change, not a
 * schema migration. Mirrors the SHOP_TYPES pattern in shop-types.ts.
 */
export interface VehicleTypeDefinition {
  key: string;
  label: string;
}

export const VEHICLE_TYPES = [
  { key: "BICYCLE", label: "Bicycle" },
  { key: "MOTORCYCLE", label: "Motorcycle" },
  { key: "SCOOTER", label: "Scooter" },
  { key: "ELECTRIC_VEHICLE", label: "Electric Vehicle" },
  { key: "OTHER", label: "Other" },
] as const satisfies readonly VehicleTypeDefinition[];

export type VehicleTypeKey = (typeof VEHICLE_TYPES)[number]["key"];

export const VEHICLE_TYPE_KEYS = VEHICLE_TYPES.map((t) => t.key) as [
  VehicleTypeKey,
  ...VehicleTypeKey[],
];

export function vehicleTypeLabel(key: string): string {
  return VEHICLE_TYPES.find((t) => t.key === key)?.label ?? key;
}
