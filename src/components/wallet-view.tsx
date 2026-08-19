"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, Card, Money, inputClass } from "@/components/ui";
import { TOPUP_PRESETS_PAISE, formatPaiseCompact, rupeesToPaise } from "@/lib/money";
import type { WalletForecast } from "@/server/services/subscriptions";

interface Transaction {
  id: string;
  type: string;
  amountPaise: number;
  newBalancePaise: number;
  description: string;
  createdAt: string;
}

/** Wallet screen per requirements §19, §20, §24, §37. */
export function WalletView({
  balancePaise,
  lowBalanceThresholdPaise,
  todaysDeductionPaise,
  forecast,
  transactions,
}: {
  balancePaise: number;
  lowBalanceThresholdPaise: number;
  todaysDeductionPaise: number;
  forecast: WalletForecast;
  transactions: Transaction[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  const isLow = balancePaise < lowBalanceThresholdPaise;

  /**
   * Creates a gateway order then settles it.
   *
   * In mock mode (no Razorpay credentials) the client asks the server for a
   * signed confirmation so the full verify-then-credit path still runs. With
   * live credentials this is where the Razorpay checkout widget opens instead.
   */
  async function addMoney(amountPaise: number) {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const createResponse = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaise }),
      });
      const intent = await createResponse.json();
      if (!createResponse.ok) {
        throw new Error(intent?.error?.message ?? "Could not start the payment.");
      }

      if (!intent.mock) {
        setNotice(
          "Razorpay checkout would open here. Configure RAZORPAY_KEY_ID to complete live payments.",
        );
        return;
      }

      const settleResponse = await fetch("/api/dev/settle-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gatewayOrderId: intent.gatewayOrderId }),
      });
      const settled = await settleResponse.json();
      if (!settleResponse.ok) {
        throw new Error(settled?.error?.message ?? "Payment could not be verified.");
      }

      setNotice(`${formatPaiseCompact(amountPaise)} added to your wallet.`);
      setCustom("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function addCustom() {
    const rupees = Number(custom);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    addMoney(rupeesToPaise(rupees));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Card className="p-6">
          <p className="text-sm text-ink-500">Current balance</p>
          <p className="mt-1 text-4xl font-bold text-ink-900">
            <Money paise={balancePaise} />
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-cream-50 p-3">
              <p className="text-ink-500">Today&apos;s deduction</p>
              <p className="mt-0.5 font-semibold text-ink-900">
                <Money paise={todaysDeductionPaise} />
              </p>
            </div>
            <div className="rounded-lg bg-cream-50 p-3">
              <p className="text-ink-500">
                Next {forecast.horizonDays} days of subscriptions
              </p>
              <p className="mt-0.5 font-semibold text-ink-900">
                <Money paise={forecast.upcomingCostPaise} />
              </p>
            </div>
          </div>

          {isLow ? (
            <div className="mt-4">
              <Alert tone="warning" title="Low balance">
                Your balance is below your{" "}
                <Money paise={lowBalanceThresholdPaise} /> reminder threshold.
              </Alert>
            </div>
          ) : null}

          {!forecast.sufficient ? (
            <div className="mt-3">
              <Alert tone="danger" title="Upcoming subscriptions may not be covered">
                Your wallet may be insufficient for the next{" "}
                {forecast.horizonDays} days. We recommend adding{" "}
                <Money paise={forecast.recommendedTopUpPaise} />.
                <div className="mt-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => addMoney(forecast.recommendedTopUpPaise)}
                  >
                    Add {formatPaiseCompact(forecast.recommendedTopUpPaise)}
                  </Button>
                </div>
              </Alert>
            </div>
          ) : null}
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 text-base font-semibold text-ink-900">
            Transactions
          </h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-ink-500">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-cream-200">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {t.description}
                    </p>
                    <p className="text-xs text-ink-500">
                      {t.type.replace(/_/g, " ").toLowerCase()} ·{" "}
                      {new Date(t.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        t.amountPaise > 0
                          ? "font-semibold text-leaf-700"
                          : "font-semibold text-ink-900"
                      }
                    >
                      {t.amountPaise > 0 ? "+" : "−"}
                      <Money paise={Math.abs(t.amountPaise)} />
                    </p>
                    <p className="text-xs text-ink-400">
                      bal <Money paise={t.newBalancePaise} />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink-900">Add money</h2>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {TOPUP_PRESETS_PAISE.map((paise) => (
              <Button
                key={paise}
                variant="secondary"
                disabled={busy}
                onClick={() => addMoney(paise)}
              >
                {formatPaiseCompact(paise)}
              </Button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Custom ₹"
              aria-label="Custom amount in rupees"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className={inputClass}
            />
            <Button disabled={busy || !custom} onClick={addCustom}>
              Add
            </Button>
          </div>

          {notice ? (
            <div className="mt-3">
              <Alert tone="success">{notice}</Alert>
            </div>
          ) : null}
          {error ? (
            <div className="mt-3">
              <Alert tone="danger">{error}</Alert>
            </div>
          ) : null}

          <p className="mt-3 text-xs text-ink-500">
            Payments are processed by Razorpay. Your wallet is credited only
            after the payment is verified.
          </p>
        </Card>
      </div>
    </div>
  );
}
