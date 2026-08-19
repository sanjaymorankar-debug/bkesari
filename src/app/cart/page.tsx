import { redirect } from "next/navigation";

import { CartView } from "@/components/cart-view";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/server/authz/guards";
import { getCart } from "@/server/services/cart";
import { getWalletByUserId } from "@/server/services/wallet";

export const metadata = { title: "Cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const [cart, wallet] = await Promise.all([
    getCart(user.id),
    getWalletByUserId(user.id),
  ]);

  return (
    <>
      <PageHeader
        title="Your cart"
        description="Items are grouped by shop — each shop becomes its own order."
      />
      <CartView cart={cart} walletBalancePaise={wallet?.balancePaise ?? 0} />
    </>
  );
}
