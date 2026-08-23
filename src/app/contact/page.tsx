import { Card, PageHeader } from "@/components/ui";
import { LEGAL_ENTITY } from "@/lib/legal-docs";

export const metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Contact Us" />
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
            Customer care
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-ink-700">Email</dt>
              <dd className="text-ink-600">
                <a href={`mailto:${LEGAL_ENTITY.supportEmail}`} className="underline">
                  {LEGAL_ENTITY.supportEmail}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink-700">Registered address</dt>
              <dd className="text-ink-600">{LEGAL_ENTITY.registeredAddress}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-ink-500">
            For an order, payment, or delivery issue, it&apos;s usually fastest to
            use the order&apos;s &quot;Report an issue&quot; option from your{" "}
            <a href="/orders" className="underline">
              Orders
            </a>{" "}
            page. For anything else, email us or file a formal complaint
            below.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
            Grievance Officer
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-ink-700">Name</dt>
              <dd className="text-ink-600">{LEGAL_ENTITY.grievanceOfficer.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink-700">Email</dt>
              <dd className="text-ink-600">
                <a href={`mailto:${LEGAL_ENTITY.grievanceOfficer.email}`} className="underline">
                  {LEGAL_ENTITY.grievanceOfficer.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink-700">Phone</dt>
              <dd className="text-ink-600">{LEGAL_ENTITY.grievanceOfficer.phone}</dd>
            </div>
          </dl>
          <a
            href="/grievance"
            className="mt-4 inline-block text-sm font-medium text-kesari-600 hover:underline"
          >
            File a formal complaint →
          </a>
        </Card>
      </div>
    </>
  );
}
