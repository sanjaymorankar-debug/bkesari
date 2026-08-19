"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, Card, inputClass } from "@/components/ui";
import { MILLI_PER_UNIT } from "@/lib/money";

/** Permanent subscription changes: quantity, pause window, cancel (§31, §32). */
export function SubscriptionControls({
  subscriptionId,
  status,
  standingQuantityMilli,
  unit,
  pauseFrom,
  pauseUntil,
}: {
  subscriptionId: string;
  status: string;
  standingQuantityMilli: number;
  unit: string;
  pauseFrom: string | null;
  pauseUntil: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(
    String(standingQuantityMilli / MILLI_PER_UNIT),
  );
  const [from, setFrom] = useState(pauseFrom ?? "");
  const [until, setUntil] = useState(pauseUntil ?? "");
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const isPaused = Boolean(pauseFrom && pauseUntil);
  const cancelled = status === "CANCELLED";

  async function call(
    path: string,
    body: unknown,
    method: "POST" | "PATCH" | "DELETE" = "POST",
    successMessage = "Saved.",
  ) {
    setBusy(true);
    setError(null);
    setNotice(null);

    const url = path
      ? `/api/subscriptions/${subscriptionId}/${path}`
      : `/api/subscriptions/${subscriptionId}`;

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "Could not save the change.");
      return;
    }
    setNotice(successMessage);
    router.refresh();
  }

  if (cancelled) {
    return (
      <Card className="p-5">
        <Alert tone="info">This subscription has been cancelled.</Alert>
      </Card>
    );
  }

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="text-base font-semibold text-ink-900">
          Change permanently
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Applies to every future delivery, not just one day.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label={`Standing quantity in ${unit}`}
            className={inputClass}
          />
          <Button
            disabled={busy}
            onClick={() =>
              call(
                "",
                {
                  quantityMilli: Math.round(Number(quantity) * MILLI_PER_UNIT),
                },
                "PATCH",
                "Standing quantity updated.",
              )
            }
          >
            Update
          </Button>
        </div>
      </div>

      <div className="border-t border-cream-200 pt-4">
        <h2 className="text-base font-semibold text-ink-900">
          {isPaused ? "Paused" : "Pause deliveries"}
        </h2>
        {isPaused ? (
          <>
            <p className="mt-1 text-sm text-ink-600">
              No deliveries or deductions from {pauseFrom} to {pauseUntil}.
            </p>
            <Button
              variant="secondary"
              className="mt-3"
              disabled={busy}
              onClick={() => call("resume", {}, "POST", "Deliveries resumed.")}
            >
              Resume now
            </Button>
          </>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-ink-500">
                From
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-xs text-ink-500">
                Until
                <input
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <Button
              variant="secondary"
              className="mt-3"
              disabled={busy || !from || !until}
              onClick={() =>
                call("pause", { from, until }, "POST", "Subscription paused.")
              }
            >
              Pause
            </Button>
          </>
        )}
      </div>

      {/* Two-step confirmation rather than window.confirm: a native dialog
          blocks the event loop and is awkward to drive in automated tests. */}
      <div className="border-t border-cream-200 pt-4">
        {confirmingCancel ? (
          <div className="space-y-2">
            <p className="text-sm text-ink-700">
              Cancel this subscription? Future deliveries will stop.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  call(
                    "",
                    { reason: "Cancelled by customer" },
                    "DELETE",
                    "Cancelled.",
                  )
                }
              >
                Yes, cancel it
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirmingCancel(false)}
              >
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => setConfirmingCancel(true)}
          >
            Cancel subscription
          </Button>
        )}
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
    </Card>
  );
}
