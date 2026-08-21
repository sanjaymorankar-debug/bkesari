/**
 * User consent record (Part 58 — Digital Personal Data Protection Act 2023
 * §6: consent must be free, specific, informed, unconditional and
 * unambiguous, with clear affirmative action, and the Data Fiduciary must be
 * able to demonstrate it was given).
 *
 * "Demonstrate" is the operative word this file exists for — a consent that
 * only lives in the fact that someone clicked a checkbox once, with no
 * record of when or against which policy version, is not demonstrable after
 * the fact. Append-only by design: a later consent SUPERSEDES an earlier one
 * (queried by taking the most recent row), it never overwrites it — the
 * history itself is part of what "demonstrable" requires.
 */
import { and, desc, eq } from "drizzle-orm";

import { CURRENT_POLICY_VERSION } from "@/lib/legal-docs";
import { db } from "@/server/db";
import { userConsents, type ConsentType, type UserConsent } from "@/server/db/schema";

export { CURRENT_POLICY_VERSION };

export async function recordConsent(
  userId: string,
  consentType: ConsentType,
  options: { version?: string; ipAddress?: string | null } = {},
): Promise<UserConsent> {
  const [consent] = await db
    .insert(userConsents)
    .values({
      userId,
      consentType,
      version: options.version ?? CURRENT_POLICY_VERSION,
      ipAddress: options.ipAddress ?? null,
    })
    .returning();
  return consent;
}

export async function getLatestConsent(
  userId: string,
  consentType: ConsentType,
): Promise<UserConsent | undefined> {
  return db.query.userConsents.findFirst({
    where: and(eq(userConsents.userId, userId), eq(userConsents.consentType, consentType)),
    orderBy: desc(userConsents.createdAt),
  });
}

/** Whether the user's most recent consent is for the CURRENT policy version, not a stale one. */
export async function hasCurrentConsent(
  userId: string,
  consentType: ConsentType,
): Promise<boolean> {
  const latest = await getLatestConsent(userId, consentType);
  return latest?.version === CURRENT_POLICY_VERSION;
}

export async function listConsentHistory(userId: string): Promise<UserConsent[]> {
  return db
    .select()
    .from(userConsents)
    .where(eq(userConsents.userId, userId))
    .orderBy(desc(userConsents.createdAt));
}
