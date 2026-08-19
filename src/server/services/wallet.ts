/**
 * Wallet service — the financial core (requirements §19–§24, §48).
 *
 * Three mechanisms together make double-spending and lost updates impossible:
 *
 *  1. **Row lock.** Every mutation opens with `SELECT … FOR UPDATE` on the wallet
 *     row, so concurrent deductions for the same wallet serialise instead of
 *     interleaving. Read-modify-write of the balance is therefore atomic.
 *  2. **Idempotency key.** Every ledger row carries a UNIQUE key. A retried
 *     request (network retry, double-clicked button, replayed webhook, re-run
 *     cron) finds the existing transaction and returns it unchanged instead of
 *     applying the amount twice.
 *  3. **CHECK constraint.** `balance_paise >= 0` is enforced by PostgreSQL, so
 *     even a logic bug cannot persist a negative balance.
 *
 * READ COMMITTED is deliberate: `FOR UPDATE` already provides the needed
 * serialisation, and it avoids the spurious serialisation failures (and retry
 * loops) that REPEATABLE READ would introduce under load.
 */
import { and, desc, eq, sql } from "drizzle-orm";

import { isUniqueViolation } from "@/lib/errors";
import { insufficientBalance, notFound, validationFailed } from "@/lib/errors";
import { db, type DbClient } from "@/server/db";
import {
  walletTransactions,
  wallets,
  type Wallet,
  type WalletTransaction,
} from "@/server/db/schema";

export type WalletTxnType =
  | "TOP_UP"
  | "PRODUCT_PURCHASE"
  | "SUBSCRIPTION_DEDUCTION"
  | "REFUND"
  | "PROMOTIONAL_CREDIT"
  | "MANUAL_CREDIT"
  | "MANUAL_DEBIT"
  | "REVERSAL";

const CREDIT_TYPES: ReadonlySet<WalletTxnType> = new Set([
  "TOP_UP",
  "REFUND",
  "PROMOTIONAL_CREDIT",
  "MANUAL_CREDIT",
]);

export interface WalletMutation {
  userId: string;
  /** Always a positive magnitude; direction is derived from `type`. */
  amountPaise: number;
  type: WalletTxnType;
  /**
   * Stable key identifying this logical operation. Reusing it is safe and is
   * the intended way to retry.
   */
  idempotencyKey: string;
  description: string;
  orderId?: string | null;
  subscriptionId?: string | null;
  paymentId?: string | null;
  createdBy?: string | null;
}

export interface WalletMutationResult {
  transaction: WalletTransaction;
  balancePaise: number;
  /** True when the key had already been used and no new money moved. */
  deduplicated: boolean;
}

/* ------------------------------------------------------------- read APIs */

export async function getOrCreateWallet(
  userId: string,
  client: DbClient = db,
): Promise<Wallet> {
  const existing = await client.query.wallets.findFirst({
    where: eq(wallets.userId, userId),
  });
  if (existing) return existing;

  await client.insert(wallets).values({ userId }).onConflictDoNothing();

  const created = await client.query.wallets.findFirst({
    where: eq(wallets.userId, userId),
  });
  if (!created) throw notFound("Wallet");
  return created;
}

export async function getWalletByUserId(
  userId: string,
): Promise<Wallet | undefined> {
  return db.query.wallets.findFirst({ where: eq(wallets.userId, userId) });
}

export async function listTransactions(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<WalletTransaction[]> {
  const limit = Math.min(options.limit ?? 50, 200);
  return db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit)
    .offset(options.offset ?? 0);
}

/** Sum of debits applied today — powers the "Today's deduction" tile (§19). */
export async function todaysDeductionPaise(userId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`COALESCE(-SUM(${walletTransactions.amountPaise}), 0)::bigint`,
    })
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.userId, userId),
        sql`${walletTransactions.amountPaise} < 0`,
        sql`${walletTransactions.createdAt} >= date_trunc('day', now())`,
      ),
    );
  return Number(row?.total ?? 0);
}

/* ------------------------------------------------------- mutation engine */

/**
 * Applies a signed balance change atomically and writes the immutable ledger row.
 *
 * Safe to call inside a caller-supplied transaction (`client`) so that a wallet
 * deduction and the order it pays for commit together — if either fails, both
 * roll back and no money moves.
 */
export async function applyWalletMutation(
  mutation: WalletMutation,
  client?: DbClient,
): Promise<WalletMutationResult> {
  if (!Number.isInteger(mutation.amountPaise) || mutation.amountPaise <= 0) {
    throw validationFailed("Amount must be a positive whole number of paise.");
  }
  if (!mutation.idempotencyKey.trim()) {
    throw validationFailed("An idempotency key is required.");
  }

  const run = async (tx: DbClient): Promise<WalletMutationResult> => {
    // 1. Lock the wallet row. Concurrent mutations queue here.
    const [locked] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, mutation.userId))
      .for("update");

    if (!locked) throw notFound("Wallet");

    // 2. Inside the lock, check whether this operation already happened.
    const prior = await tx.query.walletTransactions.findFirst({
      where: eq(walletTransactions.idempotencyKey, mutation.idempotencyKey),
    });
    if (prior) {
      return {
        transaction: prior,
        balancePaise: locked.balancePaise,
        deduplicated: true,
      };
    }

    const isCredit = CREDIT_TYPES.has(mutation.type);
    const signedAmount = isCredit ? mutation.amountPaise : -mutation.amountPaise;
    const previousBalance = locked.balancePaise;
    const newBalance = previousBalance + signedAmount;

    // 3. Refuse debits that would overdraw. Checked before any write.
    if (newBalance < 0) {
      throw insufficientBalance(mutation.amountPaise, previousBalance);
    }

    // 4. Move the money and record it. Both statements share this transaction.
    await tx
      .update(wallets)
      .set({ balancePaise: newBalance, updatedAt: new Date() })
      .where(eq(wallets.id, locked.id));

    const [transaction] = await tx
      .insert(walletTransactions)
      .values({
        walletId: locked.id,
        userId: mutation.userId,
        type: mutation.type,
        amountPaise: signedAmount,
        previousBalancePaise: previousBalance,
        newBalancePaise: newBalance,
        orderId: mutation.orderId ?? null,
        subscriptionId: mutation.subscriptionId ?? null,
        paymentId: mutation.paymentId ?? null,
        idempotencyKey: mutation.idempotencyKey,
        description: mutation.description,
        createdBy: mutation.createdBy ?? null,
      })
      .returning();

    return { transaction, balancePaise: newBalance, deduplicated: false };
  };

  try {
    // Reuse the caller's transaction when given one, so callers can compose
    // wallet movement with order creation atomically.
    return client ? await run(client) : await db.transaction(run);
  } catch (error) {
    // Belt and braces: if two transactions somehow raced past the in-lock
    // check, the unique index still stops the double-charge. Return the
    // winner's row rather than surfacing a database error.
    if (isUniqueViolation(error)) {
      const existing = await db.query.walletTransactions.findFirst({
        where: eq(walletTransactions.idempotencyKey, mutation.idempotencyKey),
      });
      if (existing) {
        const wallet = await getWalletByUserId(mutation.userId);
        return {
          transaction: existing,
          balancePaise: wallet?.balancePaise ?? existing.newBalancePaise,
          deduplicated: true,
        };
      }
    }
    throw error;
  }
}

export function credit(
  mutation: Omit<WalletMutation, "type"> & { type?: WalletTxnType },
  client?: DbClient,
): Promise<WalletMutationResult> {
  return applyWalletMutation(
    { ...mutation, type: mutation.type ?? "TOP_UP" },
    client,
  );
}

export function debit(
  mutation: Omit<WalletMutation, "type"> & { type?: WalletTxnType },
  client?: DbClient,
): Promise<WalletMutationResult> {
  return applyWalletMutation(
    { ...mutation, type: mutation.type ?? "PRODUCT_PURCHASE" },
    client,
  );
}

/**
 * Non-authoritative affordability check for UI hints only.
 *
 * Never gate a purchase on this — by the time the answer is read the balance may
 * have changed. The authoritative check happens under the row lock inside
 * `applyWalletMutation`.
 */
export async function canAfford(
  userId: string,
  amountPaise: number,
): Promise<boolean> {
  const wallet = await getWalletByUserId(userId);
  return (wallet?.balancePaise ?? 0) >= amountPaise;
}

export async function updateWalletSettings(
  userId: string,
  settings: {
    lowBalanceThresholdPaise?: number;
    autoRechargeEnabled?: boolean;
    autoRechargeTriggerPaise?: number | null;
    autoRechargeAmountPaise?: number | null;
  },
): Promise<Wallet> {
  if (
    settings.lowBalanceThresholdPaise !== undefined &&
    settings.lowBalanceThresholdPaise < 0
  ) {
    throw validationFailed("Low balance threshold cannot be negative.");
  }
  // Auto-recharge requires explicit customer authorisation (§38): both the
  // trigger and the amount must be supplied when enabling it.
  if (settings.autoRechargeEnabled) {
    if (!settings.autoRechargeTriggerPaise || !settings.autoRechargeAmountPaise) {
      throw validationFailed(
        "Auto recharge needs both a trigger balance and a recharge amount.",
      );
    }
  }

  const [updated] = await db
    .update(wallets)
    .set({ ...settings, updatedAt: new Date() })
    .where(eq(wallets.userId, userId))
    .returning();

  if (!updated) throw notFound("Wallet");
  return updated;
}
