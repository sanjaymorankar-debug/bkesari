/**
 * Wallet overview (requirement §19).
 * Returns balance, today's deductions, upcoming subscription cost and the
 * low-balance state — everything the wallet screen needs in one call.
 */
import { PERMISSIONS } from "@/server/authz/permissions";
import { requirePermission } from "@/server/authz/guards";
import { ok, route } from "@/server/api/handler";
import {
  getOrCreateWallet,
  listTransactions,
  todaysDeductionPaise,
} from "@/server/services/wallet";
import { getWalletForecast } from "@/server/services/subscriptions";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requirePermission(PERMISSIONS.WALLET_VIEW_OWN);

  const [wallet, todaysDeduction, forecast, transactions] = await Promise.all([
    getOrCreateWallet(user.id),
    todaysDeductionPaise(user.id),
    getWalletForecast(user.id, 15),
    listTransactions(user.id, { limit: 25 }),
  ]);

  return ok({
    wallet: {
      id: wallet.id,
      balancePaise: wallet.balancePaise,
      currency: wallet.currency,
      lowBalanceThresholdPaise: wallet.lowBalanceThresholdPaise,
      autoRechargeEnabled: wallet.autoRechargeEnabled,
      autoRechargeTriggerPaise: wallet.autoRechargeTriggerPaise,
      autoRechargeAmountPaise: wallet.autoRechargeAmountPaise,
      status: wallet.status,
    },
    todaysDeductionPaise: todaysDeduction,
    isLowBalance: wallet.balancePaise < wallet.lowBalanceThresholdPaise,
    forecast,
    transactions,
  });
});
