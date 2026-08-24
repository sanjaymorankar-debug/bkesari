import { redirect } from "next/navigation";

import {
  Alert,
  Badge,
  Card,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { formatQuantity } from "@/lib/money";
import { getCurrentUser } from "@/server/authz/guards";
import { getDeliveryOrdersForOrders } from "@/server/services/delivery-assignment";
import { listOrdersForUser } from "@/server/services/orders";

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  OFFERED: "Finding a rider",
  ACCEPTED: "Rider assigned",
  PICKED_UP: "Picked up — on the way",
  DELIVERED: "Delivered",
  REJECTED: "Finding a rider",
  CANCELLED: "Finding a rider",
};

export const metadata = { title: "My Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const [orders, params] = await Promise.all([
    listOrdersForUser(user.id, { limit: 50 }),
    searchParams,
  ]);
  const deliveryOrders = await getDeliveryOrdersForOrders(orders.map((o) => o.id));

  return (
    <>
      <PageHeader title="My Orders" description="Track everything you've ordered." />

      {params.placed ? (
        <div className="mb-6">
          <Alert tone="success" title="Order placed">
            Your order has been confirmed and paid from your wallet.
          </Alert>
        </div>
      ) : null}

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Your orders and subscription deliveries will appear here."
          action={<LinkButton href="/">Start shopping</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="p-5" data-testid="order-card">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.status} />
                  {order.source === "SUBSCRIPTION" ? (
                    <Badge tone="info">subscription</Badge>
                  ) : null}
                  <span className="text-sm text-ink-500">
                    {order.orderNumber}
                  </span>
                </div>
                <span className="font-semibold text-ink-900">
                  <Money paise={order.totalPaise} />
                </span>
              </div>

              <p className="text-sm font-medium text-ink-900">{order.shopName}</p>
              <p className="text-xs text-ink-500">
                {new Date(order.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {order.deliveryDate ? ` · for ${order.deliveryDate}` : ""}
              </p>

              <ul className="mt-3 space-y-1 text-sm text-ink-600">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.productNameSnapshot} ·{" "}
                      {formatQuantity(item.quantityMilli, item.unitSnapshot)}
                    </span>
                    <Money paise={item.lineTotalPaise} />
                  </li>
                ))}
              </ul>

              {deliveryOrders.has(order.id) ? (
                <p className="mt-3 border-t border-cream-100 pt-3 text-sm text-ink-600">
                  {DELIVERY_STATUS_LABELS[deliveryOrders.get(order.id)!.status]} ·{" "}
                  {deliveryOrders.get(order.id)!.partnerName}
                </p>
              ) : null}

              {order.status === "WALLET_INSUFFICIENT" ? (
                <div className="mt-3">
                  <Alert tone="danger">
                    This delivery could not be paid for. Top up your wallet and
                    retry from the subscription page.
                  </Alert>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
