import { CURRENT_POLICY_VERSION, LEGAL_ENTITY } from "@/lib/legal-docs";

export const metadata = { title: "Grievance Redressal" };

export default function GrievanceRedressalPage() {
  const officer = LEGAL_ENTITY.grievanceOfficer;
  return (
    <>
      <h1>Grievance Redressal</h1>
      <p>Last updated: {CURRENT_POLICY_VERSION}</p>

      <p>
        In accordance with the Information Technology Rules, 2021 and the
        Consumer Protection Act, 2019, we maintain a Grievance Officer and a
        complaint mechanism for any concern related to your account, an
        order, a payment, or the platform generally.
      </p>

      <h2>Grievance Officer</h2>
      <ul>
        <li>
          <strong>Name:</strong> {officer.name}
        </li>
        <li>
          <strong>Designation:</strong> {officer.designation}
        </li>
        <li>
          <strong>Email:</strong> {officer.email}
        </li>
        <li>
          <strong>Phone:</strong> {officer.phone}
        </li>
        <li>
          <strong>Address:</strong> {officer.address}
        </li>
      </ul>

      <h2>How to file a complaint</h2>
      <p>
        Use our <a href="/grievance">complaint form</a> — no account is
        required. You will receive a ticket number to track your
        complaint&apos;s status. You can look up a ticket&apos;s status at any
        time using the ticket number and the email address you submitted it
        with.
      </p>

      <h2>Response timelines</h2>
      <p>
        We aim to acknowledge every complaint within 24 hours and to resolve
        it within 15 days of receipt, in line with Rule 3(2) of the IT Rules,
        2021. Some complaints — particularly those requiring coordination
        with a third-party payment provider or a shop — may take longer; you
        will be kept informed.
      </p>

      <h2>Privacy of your complaint</h2>
      <p>
        Complaint details are only visible to you (via the ticket + email
        lookup) and to authorised platform staff handling grievances. We do
        not publish complaint details.
      </p>
    </>
  );
}
