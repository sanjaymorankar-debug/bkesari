import { CURRENT_POLICY_VERSION } from "@/lib/legal-docs";

export const metadata = { title: "Voucher Terms" };

export default function VoucherTermsPage() {
  return (
    <>
      <h1>Voucher Terms</h1>
      <p>Last updated: {CURRENT_POLICY_VERSION}</p>

      <p>
        Vouchers are promotional offers that credit bonus amounts to your
        platform wallet, either automatically or when you apply a code — each
        voucher states which on its listing. Voucher credit is promotional
        credit under our <a href="/legal/wallet-terms">Wallet Terms</a>: it
        is spendable on the platform only, is never cash, and cannot be
        withdrawn or transferred to another customer.
      </p>

      <h2>Eligibility and limits</h2>
      <p>
        Each voucher shows, before you use it, its validity dates, any
        minimum top-up or order value required, its maximum bonus amount, and
        any per-customer usage limit. Vouchers stop being usable once their
        validity period ends, their total budget is exhausted, or your
        per-customer limit is reached — whichever happens first.
      </p>

      <h2>Redemption record</h2>
      <p>
        Every voucher redemption is recorded against your account, including
        the amount credited and the voucher used, so it can be reviewed if
        there is ever a dispute.
      </p>

      <h2>Misuse</h2>
      <p>
        Vouchers may be withdrawn or a redemption reversed if we determine a
        voucher was obtained or used fraudulently (for example, through
        duplicate accounts created to bypass a per-customer limit).
      </p>
    </>
  );
}
