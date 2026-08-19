import { redirect } from "next/navigation";

import { WalletView } from "@/components/wallet-view";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/server/authz/guards";
import { getWalletForecast } from "@/server/services/subscriptions";
import {
  getOrCreateWallet,
  listTransactions,
  todaysDeductionPaise,
} from "@/server/services/wallet";

export const metadata = { title: "My Wallet" };
export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const [wallet, todaysDeduction, forecast, transactions] = await Promise.all([
    getOrCreateWallet(user.id),
    todaysDeductionPaise(user.id),
    getWalletForecast(user.id, 15),
    listTransactions(user.id, { limit: 30 }),
  ]);

  return (
    <>
      <PageHeader
        title="My Wallet"
        description="Top up once, then orders and subscriptions are paid automatically."
      />
      <WalletView
        balancePaise={wallet.balancePaise}
        lowBalanceThresholdPaise={wallet.lowBalanceThresholdPaise}
        todaysDeductionPaise={todaysDeduction}
        forecast={forecast}
        transactions={transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amountPaise: t.amountPaise,
          newBalancePaise: t.newBalancePaise,
          description: t.description,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
