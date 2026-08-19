import { notFound } from "next/navigation";

import { ProductGrid } from "@/app/page";
import { Badge, Card, ClassificationBadge, EmptyState, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/server/authz/guards";
import { listStorefrontProducts } from "@/server/services/catalogue";
import { getPublicShopBySlug, isShopOpenNow } from "@/server/services/shops";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await getPublicShopBySlug(slug);
  return { title: shop?.name ?? "Shop" };
}

/** Public shop profile (§16). Only APPROVED shops resolve — others 404. */
export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await getPublicShopBySlug(slug);
  if (!shop) notFound();

  const user = await getCurrentUser();
  const products = await listStorefrontProducts({ shopId: shop.id, limit: 100 });

  // Products are separated by department, per §16.
  const dairy = products.filter((p) => p.department === "DAIRY");
  const bakery = products.filter((p) => p.department === "BAKERY");
  const open = isShopOpenNow(shop);

  return (
    <>
      <Card className="mb-6 overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-kesari-100 via-cream-100 to-leaf-100" />
        <div className="p-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ClassificationBadge value={shop.classification} />
            <Badge>
              {shop.shopType === "BOTH"
                ? "Dairy & Bakery"
                : shop.shopType === "DAIRY"
                  ? "Dairy"
                  : "Bakery"}
            </Badge>
            {open ? (
              <Badge tone="success">Open now</Badge>
            ) : (
              <Badge tone="danger">Closed</Badge>
            )}
            {shop.deliveryAvailable ? <Badge tone="info">Delivery</Badge> : null}
          </div>

          <h1 className="text-2xl font-semibold text-ink-900">{shop.name}</h1>
          {shop.description ? (
            <p className="mt-1 text-sm text-ink-600">{shop.description}</p>
          ) : null}

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-medium text-ink-700">Address</dt>
              <dd className="text-ink-500">
                {shop.addressLine1}
                {shop.addressLine2 ? `, ${shop.addressLine2}` : ""}
                <br />
                {[shop.area, shop.city].filter(Boolean).join(", ")} —{" "}
                {shop.pincode}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink-700">Opening hours</dt>
              <dd className="text-ink-500">
                {shop.openingHours.length === 0 ? (
                  "Not specified"
                ) : (
                  <ul>
                    {shop.openingHours.slice(0, 7).map((h) => (
                      <li key={h.day}>
                        {DAY_NAMES[h.day]}:{" "}
                        {h.closed ? "Closed" : `${h.open}–${h.close}`}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink-700">Delivery</dt>
              <dd className="text-ink-500">
                {shop.deliveryAvailable
                  ? `₹${(shop.deliveryFeePaise / 100).toFixed(0)} delivery fee${
                      shop.freeDeliveryAbovePaise
                        ? `, free above ₹${(shop.freeDeliveryAbovePaise / 100).toFixed(0)}`
                        : ""
                    }`
                  : "Pickup only"}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      {dairy.length > 0 ? (
        <section className="mb-8">
          <PageHeader title="Dairy" />
          <ProductGrid products={dairy} signedIn={Boolean(user)} />
        </section>
      ) : null}

      {bakery.length > 0 ? (
        <section className="mb-8">
          <PageHeader title="Bakery" />
          <ProductGrid products={bakery} signedIn={Boolean(user)} />
        </section>
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          title="This shop has not listed any products yet."
          description="Check back soon."
        />
      ) : null}
    </>
  );
}
