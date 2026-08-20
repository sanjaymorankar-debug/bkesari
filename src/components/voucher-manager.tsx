"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Badge, Button, Card, EmptyState, Money, inputClass } from "@/components/ui";
import { rupeesToPaise } from "@/lib/money";

export interface VoucherRow {
  id: string;
  name: string;
  code: string | null;
  applyMode: "CODE" | "AUTO_APPLY";
  bonusPercent: number;
  minimumTopupPaise: number;
  maximumBonusPaise: number | null;
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  perCustomerLimit: number;
  totalBudgetPaise: number | null;
  budgetUsedPaise: number;
  redemptionCount: number;
  status: string;
}

export interface VoucherDashboardData {
  totalVouchers: number;
  activeVouchers: number;
  expiredVouchers: number;
  scheduledVouchers: number;
  totalRedemptions: number;
  totalPromotionalIssuedPaise: number;
  remainingLiabilityPaise: number;
}

/**
 * Admin voucher console (Part B of the wallet/voucher brief, §12–§17, §30).
 * Create/edit is deliberately ADMIN-only (VOUCHER_MANAGE) — an operator
 * reaching this page via VOUCHER_UPLOAD alone sees the list and dashboard but
 * not the create form, matching §37's "do not give Operator authority to
 * change promotional percentages."
 */
export function VoucherManager({
  vouchers,
  dashboard,
  canManage,
}: {
  vouchers: VoucherRow[];
  dashboard: VoucherDashboardData;
  canManage: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active vouchers" value={dashboard.activeVouchers} />
        <Stat label="Total redemptions" value={dashboard.totalRedemptions} />
        <Stat
          label="Promotional credit issued"
          value={<Money paise={dashboard.totalPromotionalIssuedPaise} />}
        />
        <Stat
          label="Remaining liability"
          value={<Money paise={dashboard.remainingLiabilityPaise} />}
        />
        <Stat label="Expired" value={dashboard.expiredVouchers} />
        <Stat label="Scheduled" value={dashboard.scheduledVouchers} />
        <Stat label="Total vouchers" value={dashboard.totalVouchers} />
      </div>

      {canManage ? (
        <div className="flex gap-2">
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "Create Voucher"}
          </Button>
        </div>
      ) : null}

      {showForm && canManage ? (
        <CreateVoucherForm onCreated={() => { setShowForm(false); router.refresh(); }} />
      ) : null}

      {vouchers.length === 0 ? (
        <EmptyState title="No vouchers yet." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2">Name / Code</th>
                <th className="px-4 py-2">Bonus</th>
                <th className="px-4 py-2">Min / Max</th>
                <th className="px-4 py-2">Usage</th>
                <th className="px-4 py-2">Budget</th>
                <th className="px-4 py-2">Valid</th>
                <th className="px-4 py-2">Status</th>
                {canManage ? <th className="px-4 py-2" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {vouchers.map((v) => (
                <VoucherTableRow key={v.id} voucher={v} canManage={canManage} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function VoucherTableRow({ voucher, canManage }: { voucher: VoucherRow; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleStatus() {
    const next = voucher.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/vouchers/${voucher.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "Could not update.");
      return;
    }
    router.refresh();
  }

  const canToggle = voucher.status === "ACTIVE" || voucher.status === "PAUSED";

  return (
    <tr>
      <td className="px-4 py-2">
        <p className="font-medium text-ink-900">{voucher.name}</p>
        <p className="text-xs text-ink-500">{voucher.code ?? "AUTO-APPLY"}</p>
      </td>
      <td className="px-4 py-2">{voucher.bonusPercent}%</td>
      <td className="px-4 py-2 text-xs">
        <Money paise={voucher.minimumTopupPaise} />
        {voucher.maximumBonusPaise != null ? (
          <>
            {" / max "}
            <Money paise={voucher.maximumBonusPaise} />
          </>
        ) : null}
      </td>
      <td className="px-4 py-2 text-xs">
        {voucher.redemptionCount}
        {voucher.usageLimit != null ? ` / ${voucher.usageLimit}` : ""} · {voucher.perCustomerLimit}/customer
      </td>
      <td className="px-4 py-2 text-xs">
        <Money paise={voucher.budgetUsedPaise} />
        {voucher.totalBudgetPaise != null ? (
          <>
            {" / "}
            <Money paise={voucher.totalBudgetPaise} />
          </>
        ) : null}
      </td>
      <td className="px-4 py-2 text-xs">
        {voucher.startDate} → {voucher.endDate}
      </td>
      <td className="px-4 py-2">
        <Badge>{voucher.status.replace(/_/g, " ")}</Badge>
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </td>
      {canManage ? (
        <td className="px-4 py-2">
          {canToggle ? (
            <Button size="sm" variant="secondary" disabled={busy} onClick={toggleStatus}>
              {voucher.status === "ACTIVE" ? "Pause" : "Activate"}
            </Button>
          ) : null}
        </td>
      ) : null}
    </tr>
  );
}

function CreateVoucherForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [bonusPercent, setBonusPercent] = useState("10");
  const [minimumTopup, setMinimumTopup] = useState("");
  const [maximumBonus, setMaximumBonus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [perCustomerLimit, setPerCustomerLimit] = useState("1");
  const [totalBudget, setTotalBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (name.trim().length < 3) return setError("Voucher name must be at least 3 characters.");
    if (!code.trim()) return setError("Voucher code is required.");
    const bonus = Number(bonusPercent);
    if (!Number.isFinite(bonus) || bonus <= 0 || bonus > 100) {
      return setError("Bonus percentage must be between 1 and 100.");
    }
    if (!startDate || !endDate) return setError("Start and end dates are required.");
    if (endDate < startDate) return setError("End date must be on or after start date.");

    setBusy(true);
    setError(null);
    const response = await fetch("/api/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        code: code.trim(),
        bonusPercent: bonus,
        minimumTopupPaise: minimumTopup ? rupeesToPaise(Number(minimumTopup)) : 0,
        maximumBonusPaise: maximumBonus ? rupeesToPaise(Number(maximumBonus)) : null,
        startDate,
        endDate,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perCustomerLimit: perCustomerLimit ? Number(perCustomerLimit) : 1,
        totalBudgetPaise: totalBudget ? rupeesToPaise(Number(totalBudget)) : null,
      }),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error?.message ?? "Could not create the voucher.");
      return;
    }
    onCreated();
  }

  return (
    <Card className="p-4">
      {error ? <Alert tone="danger" title="Could not create">{error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-ink-700 sm:col-span-2">
          Voucher name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Festival 10% Bonus" className={inputClass} />
        </label>
        <label className="text-sm text-ink-700">
          Voucher code
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="FEST10" className={inputClass} />
        </label>
        <label className="text-sm text-ink-700">
          Bonus %
          <input type="number" min={1} max={100} value={bonusPercent} onChange={(e) => setBonusPercent(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm text-ink-700">
          Minimum top-up (₹)
          <input type="number" min={0} value={minimumTopup} onChange={(e) => setMinimumTopup(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm text-ink-700">
          Maximum bonus (₹)
          <input type="number" min={0} value={maximumBonus} onChange={(e) => setMaximumBonus(e.target.value)} placeholder="No cap" className={inputClass} />
        </label>
        <label className="text-sm text-ink-700">
          Valid from
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm text-ink-700">
          Valid until
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm text-ink-700">
          Usage limit (total)
          <input type="number" min={1} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Unlimited" className={inputClass} />
        </label>
        <label className="text-sm text-ink-700">
          Per-customer limit
          <input type="number" min={1} value={perCustomerLimit} onChange={(e) => setPerCustomerLimit(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm text-ink-700">
          Total budget (₹)
          <input type="number" min={0} value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} placeholder="Unlimited" className={inputClass} />
        </label>
      </div>
      <Button className="mt-3" disabled={busy} onClick={submit}>
        {busy ? "Creating…" : "Create voucher"}
      </Button>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink-900">{value}</p>
    </Card>
  );
}
