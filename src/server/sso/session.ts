/**
 * Central login on the server: the identity behind this request's
 * bkesari.com cookie, and the local Milk & Dairy user it maps to.
 *
 * The local user is linked by email and created on first visit exactly as a
 * new Google user would be (CUSTOMER, a wallet, the consent record). Roles
 * stay Milk & Dairy's own: shop owners, operators and delivery partners are
 * granted here, not centrally. PERMANENT_ADMIN_EMAILS still applies.
 */
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

import { bootstrapAdminEmails, permanentBootstrapAdminEmails } from "@/lib/env";
import { db } from "@/server/db";
import { insertReturning, updateReturning } from "@/server/db/returning";
import { users, wallets, type UserRole } from "@/server/db/schema";
import { recordConsent } from "@/server/services/consents";

import { introspect, pickToken, ssoConfig, type SsoConfig, type SsoIdentity } from "./bkesari-sso";

export interface SsoState {
  cfg: SsoConfig | null;
  identity: SsoIdentity | null;
}

/** Once per request. */
export const currentSso = cache(async (): Promise<SsoState> => {
  const cfg = ssoConfig();
  if (!cfg) return { cfg: null, identity: null };
  const store = await cookies();
  const token = pickToken((n) => store.get(n)?.value, cfg.cookieNames);
  return { cfg, identity: await introspect(token, cfg) };
});

export type LocalUser = typeof users.$inferSelect;

/** Finds or creates the local user for a central identity. */
export async function linkLocalUser(identity: SsoIdentity): Promise<LocalUser> {
  const email = identity.user.email.toLowerCase();
  let record = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!record) {
    const role: UserRole = bootstrapAdminEmails().includes(email) ? "ADMIN" : "CUSTOMER";
    try {
      [record] = await insertReturning(db, users, {
        email,
        name: identity.user.name,
        role,
        emailVerified: identity.user.email_verified ? new Date() : null,
      });
    } catch {
      // Lost a race with a concurrent first request: the row is there now.
      record = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (!record) throw new Error("could not create the local user");
    }
    await db.insert(wallets).values({ userId: record.id }).onDuplicateKeyUpdate({ set: { userId: sql`${wallets.userId}` } });
    // Consent was given at the central sign-up (bkesari.com privacy notice).
    await recordConsent(record.id, "TERMS_AND_PRIVACY", { version: "bkesari-sso" }).catch((error) => {
      console.error("[bkesari-sso] failed to record consent", error);
    });
  }
  if (record.role !== "ADMIN" && permanentBootstrapAdminEmails().includes(email)) {
    [record] = await updateReturning(db, users, { role: "ADMIN", updatedAt: new Date() }, eq(users.id, record.id));
  }
  return record;
}
