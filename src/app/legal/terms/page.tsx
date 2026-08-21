import { CURRENT_POLICY_VERSION, LEGAL_ENTITY } from "@/lib/legal-docs";

export const metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms &amp; Conditions</h1>
      <p>Last updated: {CURRENT_POLICY_VERSION}</p>

      <p>
        These Terms govern your use of this website, operated by{" "}
        {LEGAL_ENTITY.legalName}, {LEGAL_ENTITY.registeredAddress} (&quot;the
        Platform&quot;). By creating an account or placing an order you agree
        to these Terms and to our{" "}
        <a href="/legal/privacy-policy">Privacy Policy</a>.
      </p>

      <h2>1. What this platform is</h2>
      <p>
        This is a marketplace connecting customers with independent local
        shops (&quot;Sellers&quot;). Each shop listed on the platform is
        independently owned and operated. The Platform facilitates
        discovery, ordering, payment, and delivery coordination between you
        and the Seller — it is not itself the seller of the products listed,
        except where explicitly stated on a product or shop page.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide accurate information when creating an account and
        keep your contact details up to date. You are responsible for
        activity on your account. Accounts may be suspended for fraud, abuse,
        or violation of these Terms.
      </p>

      <h2>3. Orders and pricing</h2>
      <p>
        Product prices, applicable taxes, delivery charges, and the final
        payable amount are shown to you before you confirm an order. Prices
        are set by the Seller (subject to Platform review) and may change
        without notice; the price shown at checkout is the price charged.
      </p>

      <h2>4. Payments</h2>
      <p>
        Payments are processed via Razorpay. See our{" "}
        <a href="/legal/wallet-terms">Wallet Terms</a> for how the in-app
        wallet works and our{" "}
        <a href="/legal/refund-policy">Refund &amp; Cancellation Policy</a>{" "}
        for how refunds are handled.
      </p>

      <h2>5. Subscriptions</h2>
      <p>
        Recurring/subscription orders are governed by our{" "}
        <a href="/legal/subscription-terms">Subscription Terms</a>, which set
        out how deliveries, pricing changes, pausing, and cancellation work.
      </p>

      <h2>6. Sellers</h2>
      <p>
        Shops that list products on the Platform are bound by our{" "}
        <a href="/legal/seller-terms">Marketplace Seller Terms</a>, which
        require accurate product, pricing, and business information, and
        compliance with applicable law (including food-safety licensing
        where relevant).
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        The Platform facilitates transactions between you and Sellers but is
        not responsible for the quality, safety, or legality of products
        listed by Sellers, except to the extent required by applicable
        consumer-protection law. Nothing in these Terms limits any right or
        remedy you have under the Consumer Protection Act, 2019 that cannot
        lawfully be excluded.
      </p>

      <h2>8. Grievances and disputes</h2>
      <p>
        Complaints about an order, payment, or any part of the Platform can
        be raised through our{" "}
        <a href="/legal/grievance-redressal">Grievance Redressal</a> process.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Courts at{" "}
        {LEGAL_ENTITY.registeredAddress} shall have exclusive jurisdiction,
        subject to any mandatory consumer-forum rights you have under the
        Consumer Protection Act, 2019 to bring a claim at your own location.
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be
        reflected in the &quot;Last updated&quot; date above, and where
        required by law we will seek your renewed consent.
      </p>
    </>
  );
}
