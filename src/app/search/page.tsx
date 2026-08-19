import { ProductGrid, ShopGrid } from "@/app/page";
import { EmptyState, PageHeader, Section } from "@/components/ui";
import { getCurrentUser } from "@/server/authz/guards";
import { listStorefrontProducts } from "@/server/services/catalogue";
import { searchShops } from "@/server/services/shops";

export const metadata = { title: "Search" };
export const dynamic = "force-dynamic";

/** Unified search across products, shops, area and PIN code (§6). */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const user = await getCurrentUser();

  if (!query) {
    return (
      <>
        <PageHeader title="Search" />
        <EmptyState
          title="What are you looking for?"
          description="Search for a product, a shop, an area or a PIN code."
        />
      </>
    );
  }

  const [products, shops] = await Promise.all([
    listStorefrontProducts({ query, limit: 40 }),
    searchShops({ query, limit: 12 }),
  ]);

  return (
    <>
      <PageHeader
        title={`Results for "${query}"`}
        description={`${products.length} product${products.length === 1 ? "" : "s"} · ${shops.length} shop${shops.length === 1 ? "" : "s"}`}
      />

      {shops.length > 0 ? (
        <Section title="Shops">
          <ShopGrid shops={shops} />
        </Section>
      ) : null}

      {products.length > 0 ? (
        <Section title="Products">
          <ProductGrid products={products} signedIn={Boolean(user)} />
        </Section>
      ) : null}

      {products.length === 0 && shops.length === 0 ? (
        <EmptyState
          title="Nothing found"
          description="Try a different product, shop name, area or PIN code."
        />
      ) : null}
    </>
  );
}
