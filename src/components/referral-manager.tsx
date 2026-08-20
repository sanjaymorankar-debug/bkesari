"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Badge, Button, Card, EmptyState, Money, inputClass } from "@/components/ui";

export interface ReferralRow {
  id: string;
  code: string;
  label: string | null;
  referrerName: string | null;
  status: string;
  expiresAt: string | null;
  shopCount: number;
}

export interface ReferralPerformanceRow {
  id: string;
  code: string;
  referrerName: string | null;
  shopCount: number;
  feesAttributedPaise: number;
}

/** Referral code management and performance (§4.3, §14, §23). */
export function ReferralManager({
  codes,
  performance,
}: {
  codes: ReferralRow[];
  performance: ReferralPerformanceRow[];
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [referrerName, setReferrerName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function create(): Promise<void> {
    if (code.trim().length < 3) {
      setError("A referral code needs at least 3 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/referral-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          label: label || null,
          referrerName: referrerName || null,
          expiresAt: expiresAt || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "That did not work.");
      }
      setNotice(`Referral code ${payload.code} created.`);
      setCode("");
      setLabel("");
      setReferrerName("");
      setExpiresAt("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <Alert tone="danger" title="Could not save">{error}</Alert> : null}
      {notice ? <Alert tone="success" title="Created">{notice}</Alert> : null}

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-ink-900">
          Create referral code
        </h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="text-xs text-ink-500">Code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="PARTNER10"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Pune partner drive"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">Referrer</span>
            <input
              value={referrerName}
              onChange={(e) => setReferrerName(e.target.value)}
              placeholder="Name of referrer"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">Expires</span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <Button className="mt-3" disabled={busy} onClick={create}>
          Create code
        </Button>
      </Card>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink-900">
          Codes ({codes.length})
        </h3>
        {codes.length === 0 ? (
          <EmptyState title="No referral codes yet." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream-100 text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Label</th>
                  <th className="px-4 py-2">Referrer</th>
                  <th className="px-4 py-2">Shops</th>
                  <th className="px-4 py-2">Fees attributed</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {codes.map((c) => {
                  const perf = performance.find((p) => p.id === c.id);
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-2 font-medium text-ink-900">
                        {c.code}
                      </td>
                      <td className="px-4 py-2">{c.label ?? "—"}</td>
                      <td className="px-4 py-2">{c.referrerName ?? "—"}</td>
                      <td className="px-4 py-2">{c.shopCount}</td>
                      <td className="px-4 py-2">
                        <Money paise={Number(perf?.feesAttributedPaise ?? 0)} />
                      </td>
                      <td className="px-4 py-2">
                        <Badge>{c.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
