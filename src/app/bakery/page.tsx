import { ProductGrid } from "@/app/page";
import { PageHeader, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/server/authz/guards";
import { listStorefrontProducts } from "@/server/services/catalogue";

export const metadata = { title: "Bakery" };
export const dynamic = "force-dynamic";

export default async function BakeryPage() {
  const user = await getCurrentUser();
  const products = await listStorefrontProducts({
    department: "BAKERY",
    limit: 60,
  });

  return (
    <>
      <PageHeader
        title="Bakery"
        description="Bread, buns, cakes, pastries, cookies, khari, puffs and more."
      />
      {products.length === 0 ? (
        <EmptyState title="No bakery products listed yet." />
      ) : (
        <ProductGrid products={products} signedIn={Boolean(user)} />
      )}
    </>
  );
}
