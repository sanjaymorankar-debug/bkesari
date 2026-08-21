import { CURRENT_POLICY_VERSION } from "@/lib/legal-docs";

export const metadata = { title: "Shipping & Delivery Policy" };

export default function ShippingPolicyPage() {
  return (
    <>
      <h1>Shipping &amp; Delivery Policy</h1>
      <p>Last updated: {CURRENT_POLICY_VERSION}</p>

      <p>
        Delivery is fulfilled by the individual shop you order from, not by a
        centralised platform courier network. Delivery availability, delivery
        fees, and free-delivery thresholds are set per shop and shown on the
        shop&apos;s page and again at checkout before you pay.
      </p>

      <h2>Delivery areas and fees</h2>
      <p>
        Each shop defines whether it delivers, its delivery fee, and any
        order value above which delivery is free. If a shop does not offer
        delivery, only pickup is available for orders from that shop.
      </p>

      <h2>Delivery timing</h2>
      <p>
        Delivery times depend on the shop&apos;s opening hours and order
        volume and are not centrally guaranteed by the platform. Subscription
        deliveries follow the schedule you configure when subscribing — see
        our <a href="/legal/subscription-terms">Subscription Terms</a>.
      </p>

      <h2>Delivery issues</h2>
      <p>
        If an order does not arrive, arrives incomplete, or arrives damaged,
        report it from the order page or raise a{" "}
        <a href="/legal/grievance-redressal">grievance</a> and we will help
        coordinate a resolution with the shop.
      </p>
    </>
  );
}
