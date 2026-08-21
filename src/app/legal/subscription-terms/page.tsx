import { CURRENT_POLICY_VERSION } from "@/lib/legal-docs";

export const metadata = { title: "Subscription Terms" };

export default function SubscriptionTermsPage() {
  return (
    <>
      <h1>Subscription Terms</h1>
      <p>Last updated: {CURRENT_POLICY_VERSION}</p>

      <p>
        A subscription is a recurring, self-managed order you set up for a
        specific product from a specific shop. Nothing about a subscription
        renews or changes silently — every subscription is controlled by you
        from your account.
      </p>

      <h2>What you see before subscribing</h2>
      <p>
        Before you confirm a subscription you are shown the product,
        quantity, delivery frequency, price per delivery, and an estimated
        cost for the next 7 and 30 days, along with whether your current
        wallet balance is sufficient to cover it.
      </p>

      <h2>How deliveries are paid for</h2>
      <p>
        Each scheduled delivery is paid for from your platform wallet at the
        time the order is generated. There is no separate recurring card
        charge — see our <a href="/legal/wallet-terms">Wallet Terms</a> for
        how the wallet works.
      </p>

      <h2>Low wallet balance</h2>
      <p>
        If your wallet balance is insufficient when a scheduled delivery is
        due, that delivery is skipped (not delivered and not charged) and you
        are notified so you can recharge your wallet. A subscription is never
        silently cancelled or modified because of a missed payment — it
        simply pauses delivery until you top up or take action.
      </p>

      <h2>Pausing, modifying, and cancelling</h2>
      <ul>
        <li>
          <strong>Pause</strong> — stop upcoming deliveries without losing
          your subscription configuration; resume whenever you choose.
        </li>
        <li>
          <strong>Modify</strong> — change quantity, frequency, or skip
          individual dates at any time from your subscription page.
        </li>
        <li>
          <strong>Cancel</strong> — end the subscription entirely. Cancelling
          only affects future deliveries; it does not retroactively affect
          deliveries already made.
        </li>
      </ul>
      <p>
        None of these actions require contacting support — they are
        available directly on your subscription page.
      </p>
    </>
  );
}
