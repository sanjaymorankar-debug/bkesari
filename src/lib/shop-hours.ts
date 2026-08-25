/**
 * Pure opening-hours logic, split out from server/services/shops.ts so
 * client components can check whether a shop is open without pulling in
 * that file's database imports (postgres uses Node's `fs`, which breaks a
 * client bundle).
 */
import type { Shop } from "@/server/db/schema";

export function isShopOpenNow(shop: Shop, now: Date = new Date()): boolean {
  const hours = shop.openingHours;
  if (!hours || hours.length === 0) return true; // unset means always open

  const day = now.getDay(); // 0 = Sunday
  const today = hours.find((h) => h.day === day);
  if (!today || today.closed) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  return minutes >= toMinutes(today.open) && minutes <= toMinutes(today.close);
}
