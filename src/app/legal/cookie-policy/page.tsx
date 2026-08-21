import { CURRENT_POLICY_VERSION } from "@/lib/legal-docs";

export const metadata = { title: "Cookie Policy" };

export default function CookiePolicyPage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p>Last updated: {CURRENT_POLICY_VERSION}</p>

      <p>
        We use a small number of cookies, all of which are essential to
        operating the site. We do not currently use third-party advertising
        or cross-site tracking cookies.
      </p>

      <h2>Cookies we use</h2>
      <ul>
        <li>
          <strong>Session/authentication cookie</strong> — keeps you signed
          in between requests. Set by Auth.js when you sign in; removed when
          you sign out or the session expires.
        </li>
        <li>
          <strong>CSRF protection cookie</strong> — protects forms and
          payment actions from cross-site request forgery.
        </li>
      </ul>

      <h2>Analytics</h2>
      <p>
        This site does not currently run third-party analytics or
        advertising trackers. If that changes, this policy will be updated
        first and, where required, we will ask for your consent before any
        non-essential cookie is set.
      </p>

      <h2>Managing cookies</h2>
      <p>
        Because the cookies we use today are essential to signing in and
        checking out, disabling them will prevent you from using
        account-based features of the site. You can clear or block cookies
        at any time from your browser settings.
      </p>
    </>
  );
}
