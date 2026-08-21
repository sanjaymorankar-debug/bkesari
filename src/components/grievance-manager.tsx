"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Badge, Button, Card, EmptyState, inputClass } from "@/components/ui";

export interface GrievanceRow {
  id: string;
  ticketNumber: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  resolutionNotes: string | null;
  createdAt: string;
}

export interface GrievanceDashboardData {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  total: number;
  overdue: number;
}

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

function statusTone(status: string): "warning" | "info" | "success" | "neutral" {
  if (status === "OPEN") return "warning";
  if (status === "IN_PROGRESS") return "info";
  if (status === "RESOLVED") return "success";
  return "neutral";
}

export function GrievanceManager({
  grievances,
  dashboard,
}: {
  grievances: GrievanceRow[];
  dashboard: GrievanceDashboardData;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [openFor, setOpenFor] = useState<string | null>(null);

  const filtered = grievances.filter((g) => {
    if (statusFilter && g.status !== statusFilter) return false;
    if (query) {
      const term = query.toLowerCase();
      if (!`${g.ticketNumber} ${g.email} ${g.subject}`.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Open" value={dashboard.open} tone={dashboard.open > 0 ? "warning" : "neutral"} />
        <Stat label="In progress" value={dashboard.inProgress} />
        <Stat label="Resolved" value={dashboard.resolved} />
        <Stat label="Closed" value={dashboard.closed} />
        <Stat
          label="Overdue (>15 days)"
          value={dashboard.overdue}
          tone={dashboard.overdue > 0 ? "warning" : "neutral"}
        />
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-ink-500">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ticket, email, subject"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="No complaints match those filters." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2">Ticket</th>
                <th className="px-4 py-2">From</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {filtered.map((g) => (
                <>
                  <tr key={g.id}>
                    <td className="px-4 py-2 font-medium text-ink-900">{g.ticketNumber}</td>
                    <td className="px-4 py-2">
                      {g.name}
                      <p className="text-xs text-ink-500">{g.email}</p>
                    </td>
                    <td className="px-4 py-2">
                      {g.subject}
                      <p className="text-xs text-ink-500">{g.category}</p>
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={statusTone(g.status)}>{g.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setOpenFor(openFor === g.id ? null : g.id)}
                      >
                        {openFor === g.id ? "Close" : "View"}
                      </Button>
                    </td>
                  </tr>
                  {openFor === g.id ? (
                    <tr key={`${g.id}-detail`}>
                      <td colSpan={5} className="bg-cream-50 px-4 py-4">
                        <GrievanceDetail
                          grievance={g}
                          onChanged={() => {
                            setOpenFor(null);
                            router.refresh();
                          }}
                        />
                      </td>
                    </tr>
                  ) : null}
                </>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function GrievanceDetail({
  grievance,
  onChanged,
}: {
  grievance: GrievanceRow;
  onChanged: () => void;
}) {
  const [resolutionNotes, setResolutionNotes] = useState(grievance.resolutionNotes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/grievances/${grievance.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error?.message ?? "Could not update this complaint.");
      return;
    }
    onChanged();
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <p className="whitespace-pre-wrap text-sm text-ink-700">{grievance.description}</p>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => patch({ action: "status", status: "IN_PROGRESS" })}>
          Mark in progress
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => patch({ action: "status", status: "CLOSED" })}>
          Close
        </Button>
      </div>

      <label className="block">
        <span className="text-xs text-ink-500">Resolution notes</span>
        <textarea
          className={inputClass}
          rows={2}
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
        />
      </label>
      <Button
        disabled={busy || resolutionNotes.trim().length < 5}
        onClick={() => patch({ action: "resolve", resolutionNotes: resolutionNotes.trim() })}
      >
        {busy ? "Saving…" : "Mark resolved"}
      </Button>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning";
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "warning" ? "text-kesari-600" : "text-ink-900"}`}>
        {value}
      </p>
    </Card>
  );
}
