"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, Card, Money } from "@/components/ui";

export interface ActiveDelivery {
  id: string;
  status: string;
  orderNumber: string;
  orderTotalPaise: number;
  shopName: string;
  shopAddress: string;
  customerAddress: string | null;
  distanceKm: string | null;
}

export interface EarningsSummary {
  todayPaise: number;
  totalPaise: number;
  deliveryCount: number;
}

const STATUS_LABEL: Record<string, string> = {
  OFFERED: "New delivery offer",
  ACCEPTED: "Accepted — head to the shop",
  PICKED_UP: "Picked up — deliver to the customer",
};

/**
 * Online/offline toggle, active delivery actions, earnings summary
 * (delivery-system Part 58, Slice C). Location comes only from the
 * browser's native geolocation — never a Google Maps Platform call.
 */
export function DeliveryPartnerDashboard({
  isOnline: initialOnline,
  activeDelivery,
  earnings,
}: {
  isOnline: boolean;
  activeDelivery: ActiveDelivery | null;
  earnings: EarningsSummary;
}) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(initialOnline);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleOnline() {
    setError(null);
    if (isOnline) {
      setBusy(true);
      const response = await fetch("/api/delivery-partner/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "offline" }),
      });
      setBusy(false);
      if (!response.ok) {
        setError("Could not go offline. Try again.");
        return;
      }
      setIsOnline(false);
      router.refresh();
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Your browser does not support location — cannot go online.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const response = await fetch("/api/delivery-partner/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "online",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        });
        setBusy(false);
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.error?.message ?? "Could not go online.");
          return;
        }
        setIsOnline(true);
        router.refresh();
      },
      () => {
        setBusy(false);
        setError("Location permission is required to go online.");
      },
    );
  }

  async function act(action: "accept" | "reject" | "pickup" | "deliver") {
    if (!activeDelivery) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/delivery-orders/${activeDelivery.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "Action failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="font-semibold text-ink-900">{isOnline ? "You're online" : "You're offline"}</p>
          <p className="text-sm text-ink-500">
            {isOnline ? "You may be offered nearby deliveries." : "Go online to start receiving deliveries."}
          </p>
        </div>
        <Button
          variant={isOnline ? "secondary" : "primary"}
          disabled={busy || (!!activeDelivery && isOnline)}
          onClick={toggleOnline}
        >
          {isOnline ? "Go offline" : "Go online"}
        </Button>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-ink-500">Today</p>
          <p className="mt-1 text-lg font-bold text-ink-900">
            <Money paise={earnings.todayPaise} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-500">Total earned</p>
          <p className="mt-1 text-lg font-bold text-ink-900">
            <Money paise={earnings.totalPaise} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-500">Deliveries</p>
          <p className="mt-1 text-lg font-bold text-ink-900">{earnings.deliveryCount}</p>
        </Card>
      </div>

      {activeDelivery ? (
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-kesari-600">
            {STATUS_LABEL[activeDelivery.status] ?? activeDelivery.status}
          </p>
          <p className="mt-2 font-semibold text-ink-900">{activeDelivery.orderNumber}</p>
          <div className="mt-3 space-y-2 text-sm">
            <div>
              <p className="font-medium text-ink-700">Pickup</p>
              <p className="text-ink-500">{activeDelivery.shopName} — {activeDelivery.shopAddress}</p>
            </div>
            <div>
              <p className="font-medium text-ink-700">Drop</p>
              <p className="text-ink-500">{activeDelivery.customerAddress ?? "Address on order details"}</p>
            </div>
            {activeDelivery.distanceKm ? (
              <p className="text-ink-500">~{Number(activeDelivery.distanceKm).toFixed(1)} km delivery leg</p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {activeDelivery.status === "OFFERED" ? (
              <>
                <Button size="sm" disabled={busy} onClick={() => act("accept")}>
                  Accept
                </Button>
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => act("reject")}>
                  Reject
                </Button>
              </>
            ) : null}
            {activeDelivery.status === "ACCEPTED" ? (
              <Button size="sm" disabled={busy} onClick={() => act("pickup")}>
                Mark picked up
              </Button>
            ) : null}
            {activeDelivery.status === "PICKED_UP" ? (
              <Button size="sm" disabled={busy} onClick={() => act("deliver")}>
                Mark delivered
              </Button>
            ) : null}
          </div>
        </Card>
      ) : isOnline ? (
        <Card className="p-5 text-sm text-ink-500">Waiting for a delivery offer…</Card>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
