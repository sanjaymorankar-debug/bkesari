/**
 * Registry of published legal/policy pages (Part 58).
 *
 * A single source of truth for the nav sidebar, the footer links, and the
 * admin compliance dashboard's "is this document published" check — so
 * adding a policy page only means adding one entry here plus the route.
 */

export const CURRENT_POLICY_VERSION = "2026-08-21";

/**
 * Placeholders that MUST be replaced with real, verified details before this
 * site is used to actually transact — see the "manual configuration
 * required" list produced alongside this feature. Centralised here so a
 * search for PLACEHOLDER finds everything that still needs a human to fill
 * it in.
 */
export const LEGAL_ENTITY = {
  legalName: "[PLACEHOLDER: Registered legal/company name]",
  registeredAddress: "[PLACEHOLDER: Registered office address]",
  cinOrRegistrationNumber: "[PLACEHOLDER: CIN / business registration number, if applicable]",
  gstin: "[PLACEHOLDER: Platform GSTIN, if applicable]",
  supportEmail: "support@bkesari.com",
  grievanceOfficer: {
    name: "[PLACEHOLDER: Grievance Officer name]",
    designation: "Grievance Officer",
    email: "grievance@bkesari.com",
    phone: "[PLACEHOLDER: Grievance Officer phone number]",
    address: "[PLACEHOLDER: Grievance Officer postal address]",
  },
};

export interface LegalDocMeta {
  slug: string;
  title: string;
  shortLabel: string;
}

export const LEGAL_DOCS: readonly LegalDocMeta[] = [
  { slug: "privacy-policy", title: "Privacy Policy", shortLabel: "Privacy Policy" },
  { slug: "terms", title: "Terms & Conditions", shortLabel: "Terms & Conditions" },
  { slug: "cookie-policy", title: "Cookie Policy", shortLabel: "Cookie Policy" },
  { slug: "refund-policy", title: "Refund & Cancellation Policy", shortLabel: "Refunds & Cancellations" },
  { slug: "shipping-policy", title: "Shipping & Delivery Policy", shortLabel: "Shipping & Delivery" },
  { slug: "subscription-terms", title: "Subscription Terms", shortLabel: "Subscription Terms" },
  { slug: "wallet-terms", title: "Wallet Terms", shortLabel: "Wallet Terms" },
  { slug: "voucher-terms", title: "Voucher Terms", shortLabel: "Voucher Terms" },
  { slug: "seller-terms", title: "Marketplace Seller Terms", shortLabel: "Seller Terms" },
  { slug: "grievance-redressal", title: "Grievance Redressal", shortLabel: "Grievance Redressal" },
] as const;
