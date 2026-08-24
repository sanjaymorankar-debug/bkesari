"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Badge, Button, Card, Money, StatusBadge } from "@/components/ui";
import { formatQuantity } from "@/lib/money";

const NEXT_STATUS: Record<string, { to: string; label: string }[]> = {
  CONFIRMED: [{ to: "PREPARING", label: "Start preparing" }],
  PREPARING: [{ to: "READY", label: "Mark ready" }],
  READY: [
    { to: "OUT_FOR_DELIVERY", label: "Mark out for delivery" },
    { to: "DELIVERED", label: "Mark delivered" },
  ],
  OUT_FOR_DELIVERY: [{ to: "DELIVERED", label: "Mark delivered" }],
};

const DELIVERY_STATUS_LABEL: Record<string, string> = {
  OFFERED: "Offer sent to rider",
  ACCEPTED: "Rider accepted",
  PICKED_UP: "Picked up by rider",
  DELIVERED: "Delivered by rider",
  REJECTED: "Rider declined",
  CANCELLED: "Assignment cancelled",
};

export interface ShopOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  items: { id: string; productNameSnapshot: string; unitSnapshot: string; quantityMilli: number; lineTotalPaise: number }[];
  deliveryStatus: string | null;
}

/** Shop-owner order queue — status transitions and delivery assignment (delivery-system Part 58, Slice C). */
export function ShopOrderManager({
  orders,
  deliveryAvailable,
}: {
  orders: ShopOrderRow[];
  deliveryAvailable: boolean;
}) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} deliveryAvailable={deliveryAvailable} onChanged={() => router.refresh()} />
      ))}
    </div>
  );
}

function OrderRow({
  order,
  deliveryAvailable,
  onChanged,
}: {
  order: ShopOrderRow;
  deliveryAvailable: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function advance(to: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "Could not update status.");
      return;
    }
    onChanged();
  }

  async function findRider() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/orders/${order.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "No delivery partner is available right now.");
      return;
    }
    onChanged();
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          {order.deliveryStatus ? (
            <Badge tone="info">{DELIVERY_STATUS_LABEL[order.deliveryStatus] ?? order.deliveryStatus}</Badge>
          ) : null}
          <span className="text-sm text-ink-500">{order.orderNumber}</span>
        </div>
        <span className="font-semibold text-ink-900">
          <Money paise={order.totalPaise} />
        </span>
      </div>

      <ul className="mt-2 space-y-1 text-sm text-ink-600">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span>
              {item.productNameSnapshot} · {formatQuantity(item.quantityMilli, item.unitSnapshot)}
            </span>
            <Money paise={item.lineTotalPaise} />
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        {(NEXT_STATUS[order.status] ?? []).map((transition) => (
          <Button key={transition.to} size="sm" disabled={busy} onClick={() => advance(transition.to)}>
            {transition.label}
          </Button>
        ))}
        {order.status === "READY" && deliveryAvailable && !order.deliveryStatus ? (
          <Button size="sm" variant="secondary" disabled={busy} onClick={findRider}>
            Find rider
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-2">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}
    </Card>
  );
}
