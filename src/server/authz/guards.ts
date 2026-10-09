/**
 * Server-side authorization guards.
 *
 * Every mutating route handler and server action begins with one of these.
 * They answer capability ("may this role?") and ownership ("is this row mine?")
 * as separate checks, both of which must pass.
 */
import { and, eq, isNull } from "drizzle-orm";

import { forbidden, notFound, unauthenticated } from "@/lib/errors";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { shops, subscriptions, type UserRole } from "@/server/db/schema";
import { entitled } from "@/server/sso/bkesari-sso";
import { currentSso, linkLocalUser } from "@/server/sso/session";
import { can, type Permission } from "./permissions";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
}

/**
 * Returns the signed-in user, or null. Never throws.
 *
 * With central login configured (src/server/sso), a bkesari.com session that
 * includes MILK_DAIRY is the signed-in user. A central session without it
 * signs nobody in here, and BKESARI_SSO_ENFORCE ignores this app's own
 * Auth.js session altogether. Unconfigured, it is Auth.js as before.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const sso = await currentSso().catch(() => ({ cfg: null, identity: null }));
  if (sso.cfg) {
    if (sso.identity && entitled(sso.identity)) {
      const record = await linkLocalUser(sso.identity).catch((error) => {
        console.error("[bkesari-sso] could not link the local user", error);
        return null;
      });
      if (!record || record.status !== "ACTIVE") return null;
      return { id: record.id, email: record.email, name: record.name ?? null, image: record.image ?? null, role: record.role };
    }
    if (sso.identity || sso.cfg.enforce) return null;
  }
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.status !== "ACTIVE") return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
  };
}

/**
 * Throws UNAUTHENTICATED if there is no active session, and FORBIDDEN when the
 * visitor is signed in at bkesari.com but not subscribed to Milk & Dairy.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (user) return user;
  const sso = await currentSso().catch(() => ({ cfg: null, identity: null }));
  if (sso.identity && !entitled(sso.identity)) {
    throw forbidden("Your bkesari account does not include Milk & Dairy yet. Request access at bkesari.com.");
  }
  throw unauthenticated();
}

/** Throws FORBIDDEN if the signed-in user's role lacks the capability. */
export async function requirePermission(
  permission: Permission,
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    throw forbidden("You do not have permission to perform this action.");
  }
  return user;
}

export async function requireAnyPermission(
  permissions: readonly Permission[],
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!permissions.some((p) => can(user.role, p))) {
    throw forbidden("You do not have permission to perform this action.");
  }
  return user;
}

export async function requireRole(
  ...roles: readonly UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw forbidden("You do not have access to this area.");
  }
  return user;
}

/**
 * Ownership check for shop-scoped operations.
 *
 * A SHOP_OWNER passes only for their own shop. OPERATOR/ADMIN pass for any shop
 * when they hold the corresponding `:any` capability — this is what stops one
 * shop owner from editing another's catalogue (§4).
 */
export async function requireShopAccess(
  shopId: string,
  options: { anyPermission: Permission },
): Promise<{ user: AuthenticatedUser; isPrivileged: boolean }> {
  const user = await requireUser();

  const shop = await db.query.shops.findFirst({
    where: and(eq(shops.id, shopId), isNull(shops.deletedAt)),
    columns: { id: true, ownerId: true },
  });
  if (!shop) throw notFound("Shop");

  if (shop.ownerId === user.id) return { user, isPrivileged: false };

  if (can(user.role, options.anyPermission)) {
    return { user, isPrivileged: true };
  }
  throw forbidden("This shop does not belong to you.");
}

/** Ownership check for subscription-scoped operations. */
export async function requireSubscriptionAccess(
  subscriptionId: string,
  options: { anyPermission: Permission },
): Promise<{ user: AuthenticatedUser; isPrivileged: boolean }> {
  const user = await requireUser();

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
    columns: { id: true, userId: true },
  });
  if (!subscription) throw notFound("Subscription");

  if (subscription.userId === user.id) return { user, isPrivileged: false };

  if (can(user.role, options.anyPermission)) {
    return { user, isPrivileged: true };
  }
  throw forbidden("This subscription does not belong to you.");
}
