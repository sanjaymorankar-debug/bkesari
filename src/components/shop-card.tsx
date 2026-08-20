import Link from "next/link";

import { Badge, Card, ClassificationBadge } from "@/components/ui";
import { shopTypeLabel } from "@/lib/shop-types";
import { isShopOpenNow } from "@/server/services/shops";
import type { Shop } from "@/server/db/schema";

/** Shop card per requirement §15. */
export function ShopCard({ shop }: { shop: Shop }) {
  const open = isShopOpenNow(shop);

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-cream-100 to-cream-200">
        {shop.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shop.logoUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <span className="text-2xl font-bold text-kesari-600">
            {shop.name.charAt(0)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <ClassificationBadge value={shop.classification} />
          <Badge>{shopTypeLabel(shop.shopType)}</Badge>
          {open ? (
            <Badge tone="success">Open</Badge>
          ) : (
            <Badge tone="danger">Closed</Badge>
          )}
        </div>

        <h3 className="text-base font-semibold text-ink-900">{shop.name}</h3>
        <p className="mt-0.5 text-sm text-ink-500">
          {[shop.area, shop.city].filter(Boolean).join(", ")} · {shop.pincode}
        </p>

        <div className="mt-2 text-xs text-ink-500">
          {shop.deliveryAvailable ? "Home delivery available" : "Pickup only"}
        </div>

        <Link
          href={`/shops/${shop.slug}`}
          className="mt-4 inline-flex justify-center rounded-lg border border-cream-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-cream-100"
        >
          View Shop
        </Link>
      </div>
    </Card>
  );
}
