import { redirect } from "next/navigation";

import { ShopOrderManager } from "@/components/shop-order-manager";
import { EmptyState, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/server/authz/guards";
import { getDeliveryOrdersForOrders } from "@/server/services/delivery-assignment";
import { listOrdersForShop } from "@/server/services/orders";
import { listShopsForOwner } from "@/server/services/shops";

export const metadata = { title: "Shop Orders" };
export const dynamic = "force-dynamic";

/**
 * Shop owner's order queue — advance status and, once ready, find a
 * delivery partner (delivery-system Part 58, Slice C).
 */
export default async function ShopOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const shops = await listShopsForOwner(user.id);
  if (shops.length === 0) redirect("/shop");
  const shop = shops[0];

  const orders = await listOrdersForShop(shop.id, { limit: 100 });
  const deliveryOrders = await getDeliveryOrdersForOrders(orders.map((o) => o.id));

  return (
    <>
      <PageHeader title="Orders" description={`${shop.name} — manage and fulfil incoming orders.`} />

      {orders.length === 0 ? (
        <EmptyState title="No orders yet." />
      ) : (
        <ShopOrderManager
          deliveryAvailable={shop.deliveryAvailable}
          orders={orders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            totalPaise: o.totalPaise,
            createdAt: o.createdAt.toISOString(),
            items: o.items,
            deliveryStatus: deliveryOrders.get(o.id)?.status ?? null,
          }))}
        />
      )}
    </>
  );
}
