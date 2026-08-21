/**
 * Admin compliance dashboard (Part 58).
 *
 * This NEVER reports "COMPLIANT" — only whether a technical control is
 * ACTIVE, MISSING data/configuration, or REVIEW_REQUIRED (a human/legal
 * judgement call this code cannot make, e.g. "has a lawyer reviewed this
 * policy text"). Existence of a feature is not a legal compliance claim.
 */
import { isPaymentGatewayLive } from "@/lib/env";
import { isFoodBusinessShopType } from "@/lib/shop-types";
import { LEGAL_DOCS, LEGAL_ENTITY } from "@/lib/legal-docs";
import { db } from "@/server/db";
import { shops } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getGrievanceDashboard } from "./grievances";

export type ComplianceStatus = "ACTIVE" | "MISSING" | "REVIEW_REQUIRED";

export interface ComplianceItem {
  area: string;
  status: ComplianceStatus;
  detail: string;
}

function isPlaceholder(value: string): boolean {
  return value.startsWith("[PLACEHOLDER");
}

export async function getComplianceChecklist(): Promise<ComplianceItem[]> {
  const approvedShops = await db.query.shops.findMany({
    where: and(eq(shops.status, "APPROVED"), isNull(shops.deletedAt)),
  });

  const missingLegalName = approvedShops.filter((s) => !s.legalBusinessName).length;
  const foodShops = approvedShops.filter((s) => isFoodBusinessShopType(s.shopType));
  const missingFssai = foodShops.filter((s) => !s.fssaiLicenseNumber).length;

  const grievanceDashboard = await getGrievanceDashboard();

  const items: ComplianceItem[] = [];

  for (const doc of LEGAL_DOCS) {
    items.push({
      area: doc.title,
      status: "REVIEW_REQUIRED",
      detail: "Published and technically wired up. Content has not been reviewed by a lawyer.",
    });
  }

  items.push({
    area: "Grievance Officer details",
    status:
      isPlaceholder(LEGAL_ENTITY.grievanceOfficer.name) ||
      isPlaceholder(LEGAL_ENTITY.grievanceOfficer.phone) ||
      isPlaceholder(LEGAL_ENTITY.grievanceOfficer.address)
        ? "MISSING"
        : "ACTIVE",
    detail: isPlaceholder(LEGAL_ENTITY.grievanceOfficer.name)
      ? "Placeholder officer name/phone/address in src/lib/legal-docs.ts must be replaced with a real appointee."
      : "Grievance Officer contact details are on file.",
  });

  items.push({
    area: "Grievance response timeliness",
    status: grievanceDashboard.overdue > 0 ? "REVIEW_REQUIRED" : "ACTIVE",
    detail:
      grievanceDashboard.overdue > 0
        ? `${grievanceDashboard.overdue} complaint(s) open/in-progress beyond the 15-day Rule 3(2) guidance window.`
        : "No complaints are currently overdue against the 15-day guidance window.",
  });

  items.push({
    area: "Legal entity identity",
    status: isPlaceholder(LEGAL_ENTITY.legalName) ? "MISSING" : "ACTIVE",
    detail: isPlaceholder(LEGAL_ENTITY.legalName)
      ? "Registered legal name / address / CIN placeholders in src/lib/legal-docs.ts must be filled in."
      : "Registered legal entity details are on file.",
  });

  items.push({
    area: "Seller information (legal name)",
    status: missingLegalName > 0 ? "MISSING" : "ACTIVE",
    detail:
      missingLegalName > 0
        ? `${missingLegalName} of ${approvedShops.length} approved shop(s) have no legal business name on file.`
        : `All ${approvedShops.length} approved shop(s) have a legal business name on file.`,
  });

  items.push({
    area: "Food business licensing (FSSAI)",
    status: missingFssai > 0 ? "MISSING" : "ACTIVE",
    detail:
      foodShops.length === 0
        ? "No approved shops currently fall under a food-related shop type."
        : missingFssai > 0
          ? `${missingFssai} of ${foodShops.length} food-related shop(s) have no FSSAI licence number on file.`
          : `All ${foodShops.length} food-related shop(s) have an FSSAI licence number on file.`,
  });

  items.push({
    area: "Payment gateway configuration",
    status: isPaymentGatewayLive() ? "ACTIVE" : "MISSING",
    detail: isPaymentGatewayLive()
      ? "Live Razorpay credentials are configured."
      : "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set — payments run in mock mode.",
  });

  items.push({
    area: "Wallet / payment-instrument boundary",
    status: "ACTIVE",
    detail:
      "Wallet is a platform ledger only: no peer-to-peer transfer, no cash-out, no bank transfer endpoint exists in the codebase.",
  });

  items.push({
    area: "Location privacy",
    status: "ACTIVE",
    detail: "No device-location/GPS feature exists in the application, so there is nothing to consent-gate today.",
  });

  items.push({
    area: "Consent capture (sign-up)",
    status: "ACTIVE",
    detail: "New sign-ups must tick 'I agree to Terms & Privacy Policy' before Google sign-in proceeds; recorded per-user with a policy version.",
  });

  items.push({
    area: "Consent re-capture on policy change",
    status: "MISSING",
    detail: "Existing users are not yet re-prompted when CURRENT_POLICY_VERSION changes — only new sign-ups are gated today.",
  });

  items.push({
    area: "Data retention automation",
    status: "MISSING",
    detail: "Retention periods are documented in the Privacy Policy but not yet enforced by an automated purge/anonymisation job.",
  });

  items.push({
    area: "Audit logging",
    status: "ACTIVE",
    detail: "Payments, wallet, vouchers, refunds, prices, seller info, subscriptions, grievances, and consent are all audit-logged.",
  });

  return items;
}
