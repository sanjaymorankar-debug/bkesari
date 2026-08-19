import { redirect } from "next/navigation";

import { ShopRegisterForm } from "@/components/shop-register-form";
import { Alert, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/server/authz/guards";

export const metadata = { title: "Add my shop" };
export const dynamic = "force-dynamic";

export default async function RegisterShopPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add my shop"
        description="Tell us about your dairy or bakery. An operator reviews every registration."
      />
      <div className="mb-4">
        <Alert tone="info">
          Your shop starts as <strong>pending approval</strong>. Kesari/Green
          classification is assigned by an operator at approval — it cannot be
          chosen here.
        </Alert>
      </div>
      <ShopRegisterForm />
    </div>
  );
}
