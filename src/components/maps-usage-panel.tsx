import { Alert, Card } from "@/components/ui";
import type { MapsUsageSummary } from "@/server/services/maps-usage";

/**
 * Admin-only visibility into Google Maps Platform usage. Deliberately never
 * labelled as a real invoice figure — see the disclaimer below.
 */
export function MapsUsagePanel({ summary }: { summary: MapsUsageSummary }) {
  return (
    <div className="space-y-4">
      <Alert tone="info">
        This shows how many server-side Geocoding calls this app has made —
        it is a count of requests, not a Google invoice. Client-side map
        display and address search (Autocomplete) are billed separately by
        Google and are not logged here, since they never touch this server.
      </Alert>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-ink-500">Geocoding calls (30d)</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{summary.totalCalls}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-500">Successful</p>
          <p className="mt-1 text-2xl font-bold text-leaf-700">{summary.successCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-500">Failed</p>
          <p className={`mt-1 text-2xl font-bold ${summary.failureCount > 0 ? "text-red-600" : "text-ink-900"}`}>
            {summary.failureCount}
          </p>
        </Card>
      </div>

      {summary.byPurpose.length > 0 ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2">Purpose</th>
                <th className="px-4 py-2">Calls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {summary.byPurpose.map((p) => (
                <tr key={p.purpose}>
                  <td className="px-4 py-2 text-ink-700">{p.purpose}</td>
                  <td className="px-4 py-2 text-ink-500">{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
