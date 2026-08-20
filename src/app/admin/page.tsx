import Link from "next/link";
import { redirect } from "next/navigation";
import { count, eq, sql } from "drizzle-orm";

import { AuditLogView } from "@/components/audit-log-view";
import { PendingPriceApprovals } from "@/components/pending-price-approvals";
import { ProductApprovalQueue } from "@/components/product-approval-queue";
import { ReferralManager } from "@/components/referral-manager";
import { RegistrationFeeManager } from "@/components/registration-fee-manager";
import { ShopApprovalPanel } from "@/components/shop-approval-panel";
import { ShopFinanceManager } from "@/components/shop-finance-manager";
import { Card, PageHeader, Section } from "@/components/ui";
import { UserRoleManager } from "@/components/user-role-manager";
import { VoucherManager } from "@/components/voucher-manager";
import { VoucherUpload } from "@/components/voucher-upload";
import { formatPaiseCompact } from "@/lib/money";
import { shopTypeLabel } from "@/lib/shop-types";
import { getCurrentUser } from "@/server/authz/guards";
import { can, PERMISSIONS } from "@/server/authz/permissions";
import { db } from "@/server/db";
import { orders, shops, users, wallets } from "@/server/db/schema";
import { listAuditLog } from "@/server/services/audit-log-query";
import { listPendingProductApprovals } from "@/server/services/catalogue";
import { listAllPending } from "@/server/services/price-requests";
import {
  getReferralPerformance,
  listReferralCodes,
} from "@/server/services/referrals";
import {
  getActiveFee,
  listFeeHistory,
} from "@/server/services/registration-fees";
import { getRegistrationFeeReport } from "@/server/services/shop-payments";
import {
  countShopsByStatus,
  listShopsByStatus,
  searchShops,
  searchShopsAdmin,
} from "@/server/services/shops";
import { countSubscriptionsByStatus } from "@/server/services/subscriptions";
import { listUsers } from "@/server/services/users";
import { getVoucherDashboard, listVouchers } from "@/server/services/vouchers";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

/**
 * Admin and operator console (§42, §43).
 *
 * One page serving both roles, with capability checks deciding what renders —
 * an operator simply does not receive the admin-only tiles.
 */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (user.role !== "ADMIN" && user.role !== "OPERATOR") redirect("/");

  const showFinancials = can(user.role, PERMISSIONS.REPORT_VIEW_ALL);
  const canViewUsers = can(user.role, PERMISSIONS.USER_VIEW_ANY);
  const canSetRole = can(user.role, PERMISSIONS.USER_SET_ROLE);
  const canManageFee = can(user.role, PERMISSIONS.REGISTRATION_FEE_MANAGE);
  const canRecordPayment = can(user.role, PERMISSIONS.PAYMENT_RECORD);
  const canManageReferrals = can(user.role, PERMISSIONS.REFERRAL_MANAGE);
  const canDecideAny = can(user.role, PERMISSIONS.PRICE_REQUEST_DECIDE_ANY);
  const canApproveProducts = can(user.role, PERMISSIONS.PRODUCT_APPROVE);
  const canViewVouchers = can(user.role, PERMISSIONS.VOUCHER_VIEW);
  const canManageVouchers = can(user.role, PERMISSIONS.VOUCHER_MANAGE);
  const canUploadVouchers = can(user.role, PERMISSIONS.VOUCHER_UPLOAD);
  const canViewAudit =
    can(user.role, PERMISSIONS.AUDIT_LOG_VIEW) ||
    can(user.role, PERMISSIONS.AUDIT_LOG_VIEW_LIMITED);

  const [
    pending,
    approved,
    shopCounts,
    subscriptionCounts,
    userCount,
    orderStats,
    walletTotal,
    userList,
  ] = await Promise.all([
    listShopsByStatus("PENDING_APPROVAL"),
    searchShops({ limit: 100 }),
    countShopsByStatus(),
    countSubscriptionsByStatus(),
    db.select({ value: count() }).from(users),
    db
      .select({
        value: count(),
        revenue: sql<number>`COALESCE(SUM(${orders.totalPaise}), 0)::bigint`,
      })
      .from(orders)
      .where(eq(orders.status, "DELIVERED")),
    showFinancials
      ? db
          .select({
            total: sql<number>`COALESCE(SUM(${wallets.balancePaise}), 0)::bigint`,
          })
          .from(wallets)
      : Promise.resolve([{ total: 0 }]),
    canViewUsers ? listUsers({ limit: 100 }) : Promise.resolve([]),
  ]);

  const [
    financeShops,
    feeReport,
    pendingPrices,
    referralCodes,
    referralPerformance,
    feeConfig,
    auditRows,
    pendingProducts,
    voucherList,
    voucherDashboard,
  ] = await Promise.all([
    searchShopsAdmin({ limit: 500 }),
    getRegistrationFeeReport(),
    canDecideAny ? listAllPending() : Promise.resolve([]),
    canManageReferrals ? listReferralCodes() : Promise.resolve([]),
    canManageReferrals ? getReferralPerformance() : Promise.resolve([]),
    canManageFee
      ? Promise.all([getActiveFee(), listFeeHistory()])
      : Promise.resolve([undefined, []] as const),
    canViewAudit ? listAuditLog(user.role, { limit: 100 }) : Promise.resolve([]),
    canApproveProducts ? listPendingProductApprovals() : Promise.resolve([]),
    canViewVouchers ? listVouchers() : Promise.resolve([]),
    canViewVouchers
      ? getVoucherDashboard()
      : Promise.resolve({
          totalVouchers: 0,
          activeVouchers: 0,
          expiredVouchers: 0,
          scheduledVouchers: 0,
          totalRedemptions: 0,
          totalPromotionalIssuedPaise: 0,
          totalPromotionalUsedPaise: 0,
          remainingLiabilityPaise: 0,
        }),
  ]);

  const [activeFee, feeHistory] = feeConfig as [
    Awaited<ReturnType<typeof getActiveFee>>,
    Awaited<ReturnType<typeof listFeeHistory>>,
  ];

  const kesari = approved.filter((s) => s.classification === "KESARI").length;
  const green = approved.filter((s) => s.classification === "GREEN").length;

  const byType = new Map<string, number>();
  for (const shop of approved) {
    byType.set(shop.shopType, (byType.get(shop.shopType) ?? 0) + 1);
  }
  const topTypes = Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <>
      <PageHeader
        title={user.role === "ADMIN" ? "Admin dashboard" : "Operator dashboard"}
        description={
          user.role === "ADMIN"
            ? "Full system overview and controls."
            : "Operational controls for shops, products and orders."
        }
        action={
          <Link
            href="/admin/shops"
            className="text-sm font-medium text-kesari-600 hover:underline"
          >
            Shop Product Management →
          </Link>
        }
      />

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total users" value={userCount[0].value} />
        <Stat label="Approved shops" value={approved.length} />
        <Stat
          label="Pending approvals"
          value={shopCounts.PENDING_APPROVAL ?? 0}
          tone={pending.length > 0 ? "warning" : "neutral"}
        />
        <Stat
          label="Active subscriptions"
          value={subscriptionCounts.ACTIVE ?? 0}
        />
        <Stat label="Kesari shops" value={kesari} />
        <Stat label="Green shops" value={green} />
        {topTypes.map(([type, n]) => (
          <Stat key={type} label={`${shopTypeLabel(type)} shops`} value={n} />
        ))}
        <Stat label="Delivered orders" value={orderStats[0].value} />
        <Stat
          label="Delivered revenue"
          value={formatPaiseCompact(Number(orderStats[0].revenue))}
        />
        {showFinancials ? (
          <Stat
            label="Wallet float"
            value={formatPaiseCompact(Number(walletTotal[0].total))}
          />
        ) : null}
        <Stat
          label="Failed subscription payments"
          value={subscriptionCounts.PAYMENT_PENDING ?? 0}
          tone={
            (subscriptionCounts.PAYMENT_PENDING ?? 0) > 0 ? "warning" : "neutral"
          }
        />
      </section>

      <ShopApprovalPanel
        pending={pending.map(serialiseShop)}
        approved={approved.map(serialiseShop)}
        canApprove={can(user.role, PERMISSIONS.SHOP_APPROVE)}
        canClassify={can(user.role, PERMISSIONS.SHOP_SET_CLASSIFICATION)}
      />

      {/* Approvals first: a pending price change is the most time-sensitive
          thing on this page (§11). */}
      {canDecideAny ? (
        <Section title={`Price approvals (${pendingPrices.length})`}>
          <PendingPriceApprovals
            rows={pendingPrices.map((r) => ({
              id: r.id,
              productName: r.productName,
              productCode: r.productCode,
              unit: r.unit,
              priceType: r.priceType,
              previousPricePaise: r.previousPricePaise,
              proposedPricePaise: r.proposedPricePaise,
              source: r.source,
              shopName: r.shopName,
              createdAt: r.createdAt.toISOString(),
            }))}
            showShop
            canOverride
          />
        </Section>
      ) : null}

      {canApproveProducts ? (
        <Section title={`Products awaiting publication (${pendingProducts.length})`}>
          <ProductApprovalQueue
            rows={pendingProducts.map((p) => ({
              id: p.id,
              name: p.name,
              categoryName: p.category.name,
              unit: p.unit,
              description: p.description,
              createdByName: p.createdByName,
              createdAt: p.createdAt.toISOString(),
            }))}
          />
        </Section>
      ) : null}

      <Section title="Registration fees & payments">
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Fees expected"
            value={formatPaiseCompact(feeReport.expectedPaise)}
          />
          <Stat
            label="Fees collected"
            value={formatPaiseCompact(feeReport.collectedPaise)}
          />
          <Stat
            label="Fees pending"
            value={formatPaiseCompact(feeReport.pendingPaise)}
            tone={feeReport.pendingPaise > 0 ? "warning" : "neutral"}
          />
          <Stat label="Fully paid shops" value={feeReport.fullyPaid} />
          <Stat label="Partially paid" value={feeReport.partiallyPaid} />
          <Stat label="Unpaid" value={feeReport.unpaid} />
          <Stat
            label="Refunded"
            value={formatPaiseCompact(feeReport.refundedPaise)}
          />
          <Stat label="Total shops" value={feeReport.totalShops} />
        </div>

        <ShopFinanceManager
          shops={financeShops.map((s) => ({
            id: s.id,
            name: s.name,
            registrationNumber: s.registrationNumber,
            ownerName: s.ownerName,
            phone: s.phone,
            city: s.city,
            registrationDate: s.registrationDate,
            registrationFeePaise: s.registrationFeePaise,
            amountPaidPaise: s.amountPaidPaise,
            feePaymentStatus: s.feePaymentStatus,
            referralCode: s.referralCode,
            status: s.status,
          }))}
          canRecordPayment={canRecordPayment}
        />
      </Section>

      {canManageFee ? (
        <Section title="Registration fee configuration">
          <RegistrationFeeManager
            active={
              activeFee
                ? {
                    id: activeFee.id,
                    amountPaise: activeFee.amountPaise,
                    effectiveFrom: activeFee.effectiveFrom,
                    isActive: activeFee.isActive,
                  }
                : null
            }
            history={feeHistory.map((h) => ({
              id: h.id,
              previousAmountPaise: h.previousAmountPaise,
              newAmountPaise: h.newAmountPaise,
              effectiveFrom: h.effectiveFrom,
              reason: h.reason,
              createdAt: h.createdAt.toISOString(),
            }))}
          />
        </Section>
      ) : null}

      {canManageReferrals ? (
        <Section title="Referral codes">
          <ReferralManager
            codes={referralCodes.map((c) => ({
              id: c.id,
              code: c.code,
              label: c.label,
              referrerName: c.referrerName,
              status: c.status,
              expiresAt: c.expiresAt,
              shopCount: c.shopCount,
            }))}
            performance={referralPerformance.map((p) => ({
              id: p.id,
              code: p.code,
              referrerName: p.referrerName,
              shopCount: p.shopCount,
              feesAttributedPaise: Number(p.feesAttributedPaise),
            }))}
          />
        </Section>
      ) : null}

      {canViewUsers ? (
        <Section title={`Users (${userList.length})`}>
          <UserRoleManager
            users={userList.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              status: u.status,
            }))}
            currentUserId={user.id}
            canSetRole={canSetRole}
          />
        </Section>
      ) : null}

      {canViewVouchers ? (
        <Section title="Vouchers">
          <VoucherManager
            vouchers={voucherList.map((v) => ({
              id: v.id,
              name: v.name,
              code: v.code,
              applyMode: v.applyMode,
              bonusPercent: v.bonusPercent,
              minimumTopupPaise: v.minimumTopupPaise,
              maximumBonusPaise: v.maximumBonusPaise,
              startDate: v.startDate,
              endDate: v.endDate,
              usageLimit: v.usageLimit,
              perCustomerLimit: v.perCustomerLimit,
              totalBudgetPaise: v.totalBudgetPaise,
              budgetUsedPaise: v.budgetUsedPaise,
              redemptionCount: v.redemptionCount,
              status: v.status,
            }))}
            dashboard={voucherDashboard}
            canManage={canManageVouchers}
          />
          {canUploadVouchers ? (
            <div className="mt-4">
              <VoucherUpload />
            </div>
          ) : null}
        </Section>
      ) : null}

      {canViewAudit ? (
        <Section title="Audit log">
          <AuditLogView
            rows={auditRows.map((r) => ({
              id: r.id,
              action: r.action,
              entityType: r.entityType,
              entityId: r.entityId,
              actorName: r.actorName,
              actorEmail: r.actorEmail,
              actorRole: r.actorRole,
              previousValue: r.previousValue,
              newValue: r.newValue,
              createdAt: r.createdAt.toISOString(),
            }))}
            limited={user.role !== "ADMIN"}
          />
        </Section>
      ) : null}
    </>
  );
}

function serialiseShop(shop: typeof shops.$inferSelect) {
  return {
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    ownerName: shop.ownerName,
    phone: shop.phone,
    city: shop.city,
    area: shop.area,
    pincode: shop.pincode,
    shopType: shop.shopType,
    status: shop.status,
    classification: shop.classification,
    createdAt: shop.createdAt.toISOString(),
  };
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "warning";
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          tone === "warning" ? "text-kesari-600" : "text-ink-900"
        }`}
      >
        {value}
      </p>
    </Card>
  );
}
