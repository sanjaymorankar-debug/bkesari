import { GrievanceForm, GrievanceLookup } from "@/components/grievance-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Grievance Redressal" };

export default function GrievancePage() {
  return (
    <>
      <PageHeader
        title="File a complaint"
        description="No account needed. You'll get a ticket number to track your complaint. See our full Grievance Redressal policy for response timelines and the Grievance Officer's contact details."
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
            Submit a complaint
          </h2>
          <GrievanceForm />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
            Check a complaint&apos;s status
          </h2>
          <GrievanceLookup />
        </section>
      </div>
    </>
  );
}
