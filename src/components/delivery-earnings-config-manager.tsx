"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, Card, Money, inputClass } from "@/components/ui";
import { rupeesToPaise } from "@/lib/money";

interface Config {
  baseFeePaise: number;
  perKmFeePaise: number;
  note: string | null;
}

/** Admin-configurable delivery-partner base/per-km earnings rate (delivery-system Part 58, Slice C). */
export function DeliveryEarningsConfigManager({ active }: { active: Config }) {
  const router = useRouter();
  const [baseFee, setBaseFee] = useState("");
  const [perKmFee, setPerKmFee] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(): Promise<void> {
    const baseRupees = Number(baseFee.replace(/[₹,\s]/g, ""));
    const perKmRupees = Number(perKmFee.replace(/[₹,\s]/g, ""));
    if (!Number.isFinite(baseRupees) || baseRupees < 0) {
      setError("Enter a valid base fee in rupees.");
      return;
    }
    if (!Number.isFinite(perKmRupees) || perKmRupees < 0) {
      setError("Enter a valid per-km fee in rupees.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/delivery-partner/earnings-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseFeePaise: rupeesToPaise(baseRupees),
          perKmFeePaise: rupeesToPaise(perKmRupees),
          note: note || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "That did not work.");
      setNotice("Delivery earnings rate updated. Already-completed deliveries keep their original payout.");
      setBaseFee("");
      setPerKmFee("");
      setNote("");
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
      {notice ? <Alert tone="success" title="Saved">{notice}</Alert> : null}

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-ink-500">Current base fee</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">
              <Money paise={active.baseFeePaise} />
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-500">Current per-km fee</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">
              <Money paise={active.perKmFeePaise} /> / km
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs text-ink-500">New base fee (₹)</span>
            <input value={baseFee} onChange={(e) => setBaseFee(e.target.value)} inputMode="decimal" placeholder="20" className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">New per-km fee (₹)</span>
            <input value={perKmFee} onChange={(e) => setPerKmFee(e.target.value)} inputMode="decimal" placeholder="8" className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className={inputClass} />
          </label>
        </div>

        <div className="mt-3">
          <Button disabled={busy} onClick={submit}>
            Update rate
          </Button>
        </div>
      </Card>
    </div>
  );
}
