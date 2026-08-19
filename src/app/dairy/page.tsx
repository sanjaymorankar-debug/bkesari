import { ProductGrid } from "@/app/page";
import { PageHeader, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/server/authz/guards";
import { listStorefrontProducts } from "@/server/services/catalogue";

export const metadata = { title: "Dairy" };
export const dynamic = "force-dynamic";

export default async function DairyPage() {
  const user = await getCurrentUser();
  const products = await listStorefrontProducts({
    department: "DAIRY",
    limit: 60,
  });

  return (
    <>
      <PageHeader
        title="Dairy"
        description="Milk, curd, buttermilk, paneer, cheese, butter, ghee and more."
      />
      {products.length === 0 ? (
        <EmptyState title="No dairy products listed yet." />
      ) : (
        <ProductGrid products={products} signedIn={Boolean(user)} />
      )}
    </>
  );
}
