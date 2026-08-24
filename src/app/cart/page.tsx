import { redirect } from "next/navigation";

import { CartView } from "@/components/cart-view";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/server/authz/guards";
import { listAddresses } from "@/server/services/addresses";
import { getCart } from "@/server/services/cart";
import { getWalletByUserId } from "@/server/services/wallet";

export const metadata = { title: "Cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const [cart, wallet, addresses] = await Promise.all([
    getCart(user.id),
    getWalletByUserId(user.id),
    listAddresses(user.id),
  ]);

  return (
    <>
      <PageHeader
        title="Your cart"
        description="Items are grouped by shop — each shop becomes its own order."
      />
      <CartView
        cart={cart}
        walletBalancePaise={wallet?.balancePaise ?? 0}
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          line1: a.line1,
          area: a.area,
          city: a.city,
          pincode: a.pincode,
          isDefault: a.isDefault,
        }))}
      />
    </>
  );
}
