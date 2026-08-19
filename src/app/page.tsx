import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { ShopCard } from "@/components/shop-card";
import { Card, EmptyState, Section } from "@/components/ui";
import { getCurrentUser } from "@/server/authz/guards";
import { listCategories, listStorefrontProducts } from "@/server/services/catalogue";
import { searchShops } from "@/server/services/shops";

export const dynamic = "force-dynamic";

/** Marketplace home (requirement §6). All content comes from the database. */
export default async function HomePage() {
  const user = await getCurrentUser();

  const [
    dairyProducts,
    bakeryProducts,
    featuredShops,
    kesariShops,
    greenShops,
    dairyCategories,
    bakeryCategories,
  ] = await Promise.all([
    listStorefrontProducts({ department: "DAIRY", onlineOnly: true, limit: 8 }),
    listStorefrontProducts({ department: "BAKERY", onlineOnly: true, limit: 8 }),
    searchShops({ limit: 4 }),
    searchShops({ classification: "KESARI", limit: 4 }),
    searchShops({ classification: "GREEN", limit: 4 }),
    listCategories("DAIRY"),
    listCategories("BAKERY"),
  ]);

  const signedIn = Boolean(user);

  return (
    <>
      <section className="mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-kesari-50 via-cream-100 to-leaf-50 px-6 py-10 sm:px-10 sm:py-14">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Fresh dairy and bakery, delivered daily
        </h1>
        <p className="mt-3 max-w-xl text-base text-ink-600">
          Order from shops near you, pay straight from your wallet, and set up a
          daily milk subscription you can change any time.
        </p>

        <form action="/search" className="mt-6 flex max-w-xl gap-2">
          <input
            type="search"
            name="q"
            placeholder="Search milk, bread, a shop, an area or PIN code"
            aria-label="Search"
            className="min-w-0 flex-1 rounded-lg border border-cream-200 bg-white px-4 py-2.5 text-sm focus:border-kesari-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-kesari-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-kesari-700"
          >
            Search
          </button>
        </form>
      </section>

      {/* Two clearly separated departments (§7). */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2">
        <DepartmentTile
          href="/dairy"
          title="Dairy"
          description="Milk, curd, paneer, ghee and more"
          categories={dairyCategories.map((c) => c.name)}
          className="from-kesari-50 to-cream-100"
        />
        <DepartmentTile
          href="/bakery"
          title="Bakery"
          description="Bread, buns, cakes, khari and more"
          categories={bakeryCategories.map((c) => c.name)}
          className="from-leaf-50 to-cream-100"
        />
      </section>

      <Section title="Dairy products" href="/dairy">
        {dairyProducts.length === 0 ? (
          <EmptyState title="No dairy products listed yet." />
        ) : (
          <ProductGrid products={dairyProducts} signedIn={signedIn} />
        )}
      </Section>

      <Section title="Bakery products" href="/bakery">
        {bakeryProducts.length === 0 ? (
          <EmptyState title="No bakery products listed yet." />
        ) : (
          <ProductGrid products={bakeryProducts} signedIn={signedIn} />
        )}
      </Section>

      <Section title="Featured shops" href="/shops">
        <ShopGrid shops={featuredShops} />
      </Section>

      {kesariShops.length > 0 ? (
        <Section title="Kesari shops" href="/shops?classification=KESARI">
          <ShopGrid shops={kesariShops} />
        </Section>
      ) : null}

      {greenShops.length > 0 ? (
        <Section title="Green shops" href="/shops?classification=GREEN">
          <ShopGrid shops={greenShops} />
        </Section>
      ) : null}

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">
            Run a dairy or bakery?
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            List your shop and start taking online orders and subscriptions.
          </p>
        </div>
        <Link
          href="/shop/register"
          className="rounded-lg bg-kesari-600 px-4 py-2 text-sm font-medium text-white hover:bg-kesari-700"
        >
          Add my shop
        </Link>
      </Card>
    </>
  );
}

function DepartmentTile({
  href,
  title,
  description,
  categories,
  className,
}: {
  href: string;
  title: string;
  description: string;
  categories: string[];
  className: string;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl bg-gradient-to-br ${className} p-6 transition-shadow hover:shadow-md`}
    >
      <h2 className="text-xl font-semibold text-ink-900">{title}</h2>
      <p className="mt-1 text-sm text-ink-600">{description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {categories.slice(0, 6).map((name) => (
          <span
            key={name}
            className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-ink-600"
          >
            {name}
          </span>
        ))}
      </div>
    </Link>
  );
}

export function ProductGrid({
  products,
  signedIn,
}: {
  products: Awaited<ReturnType<typeof listStorefrontProducts>>;
  signedIn: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard
          key={p.shopProductId}
          signedIn={signedIn}
          product={{
            shopProductId: p.shopProductId,
            productName: p.productName,
            categoryName: p.categoryName,
            unit: p.unit,
            imageUrl: p.imageUrl,
            onlinePricePaise: p.onlinePricePaise,
            offlinePricePaise: p.offlinePricePaise,
            onlineSaleEnabled: p.onlineSaleEnabled,
            offlineSaleEnabled: p.offlineSaleEnabled,
            isAvailable: p.isAvailable,
            trackInventory: p.trackInventory,
            onlineStock: p.onlineStock,
            subscribable: p.subscribable,
            shopName: p.shopName,
            shopSlug: p.shopSlug,
          }}
        />
      ))}
    </div>
  );
}

export function ShopGrid({
  shops,
}: {
  shops: Awaited<ReturnType<typeof searchShops>>;
}) {
  if (shops.length === 0) {
    return <EmptyState title="No shops found." />;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  );
}
