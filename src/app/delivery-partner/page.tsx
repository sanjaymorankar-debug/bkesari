import { redirect } from "next/navigation";

import { DeliveryPartnerDashboard } from "@/components/delivery-partner-dashboard";
import { Alert, Card, PageHeader, StatusBadge } from "@/components/ui";
import { vehicleTypeLabel } from "@/lib/vehicle-types";
import { getCurrentUser } from "@/server/authz/guards";
import { getMyActiveDeliveryDetail } from "@/server/services/delivery-assignment";
import { getPartnerEarningsSummary } from "@/server/services/delivery-earnings";
import { getMyDeliveryPartnerProfile } from "@/server/services/delivery-partners";

export const metadata = { title: "My Delivery Partner Application" };
export const dynamic = "force-dynamic";

const STATUS_MESSAGE: Record<string, string> = {
  REGISTERED: "Your application has been received and is waiting to be reviewed.",
  UNDER_REVIEW: "Our team is reviewing your application.",
  APPROVED: "You're approved as a delivery partner.",
  REJECTED: "Your application was not approved.",
  SUSPENDED: "Your delivery partner account is currently suspended.",
  DEACTIVATED: "Your delivery partner account has been deactivated.",
};

/**
 * Self-service status page — a minimal complement to registration (Slice B).
 * The fuller dashboard (deliveries, earnings, online toggle) is Slice C,
 * once there's an assignment/earnings system for it to show.
 */
export default async function DeliveryPartnerStatusPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const partner = await getMyDeliveryPartnerProfile(user.id);
  if (!partner) redirect("/delivery-partner/apply");

  const [activeDelivery, earnings] =
    partner.status === "APPROVED"
      ? await Promise.all([getMyActiveDeliveryDetail(user.id), getPartnerEarningsSummary(partner.id)])
      : [null, { todayPaise: 0, totalPaise: 0, deliveryCount: 0 }];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My Delivery Partner Application" />

      <Card className="mb-6 p-6">
        <div className="mb-3 flex items-center gap-2">
          <StatusBadge status={partner.status} />
        </div>
        <p className="text-sm text-ink-700">{STATUS_MESSAGE[partner.status]}</p>

        {partner.status === "REJECTED" && partner.rejectionReason ? (
          <div className="mt-3">
            <Alert tone="danger" title="Reason">
              {partner.rejectionReason}
            </Alert>
          </div>
        ) : null}
        {partner.status === "SUSPENDED" && partner.rejectionReason ? (
          <div className="mt-3">
            <Alert tone="warning" title="Reason">
              {partner.rejectionReason}
            </Alert>
          </div>
        ) : null}
        {partner.reviewNotes ? (
          <div className="mt-3">
            <Alert tone="info" title="Note from our team">
              {partner.reviewNotes}
            </Alert>
          </div>
        ) : null}
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Application details
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-ink-700">Full name</dt>
            <dd className="text-ink-500">{partner.fullName}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink-700">Mobile</dt>
            <dd className="text-ink-500">{partner.mobile}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink-700">Vehicle</dt>
            <dd className="text-ink-500">{vehicleTypeLabel(partner.vehicleType)}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink-700">Operating radius</dt>
            <dd className="text-ink-500">{partner.operatingRadiusKm} km</dd>
          </div>
        </dl>
      </Card>

      {partner.status === "APPROVED" ? (
        <div className="mt-4">
          <DeliveryPartnerDashboard
            isOnline={partner.isOnline}
            activeDelivery={activeDelivery}
            earnings={earnings}
          />
        </div>
      ) : null}
    </div>
  );
}
