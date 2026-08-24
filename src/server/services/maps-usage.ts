/**
 * Admin visibility into Google Maps Platform usage (delivery-system Part 58
 * follow-up). Reads `maps_api_call_log`, which is written exclusively by
 * src/server/services/geocoding.ts's one server-side call per confirmed
 * location. This is NOT a real Google billing figure — just a count of how
 * many calls this app actually made, and to what.
 */
import { gte } from "drizzle-orm";

import { db } from "@/server/db";
import { mapsApiCallLog } from "@/server/db/schema";

export interface MapsUsageSummary {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  byDay: { date: string; count: number }[];
  byPurpose: { purpose: string; count: number }[];
}

export async function getMapsUsageSummary(days = 30): Promise<MapsUsageSummary> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(mapsApiCallLog)
    .where(gte(mapsApiCallLog.createdAt, since));

  const byDayMap = new Map<string, number>();
  const byPurposeMap = new Map<string, number>();
  let successCount = 0;

  for (const row of rows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
    byPurposeMap.set(row.purpose, (byPurposeMap.get(row.purpose) ?? 0) + 1);
    if (row.success) successCount += 1;
  }

  return {
    totalCalls: rows.length,
    successCount,
    failureCount: rows.length - successCount,
    byDay: Array.from(byDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
    byPurpose: Array.from(byPurposeMap.entries())
      .map(([purpose, count]) => ({ purpose, count }))
      .sort((a, b) => b.count - a.count),
  };
}
