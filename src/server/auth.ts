/**
 * Authentication (requirement §5).
 *
 * Google OAuth via Auth.js with database-backed sessions. Role is resolved from
 * the database on every request and injected into the session — it is never
 * accepted from the client, so a user cannot promote themselves to
 * OPERATOR/ADMIN by tampering with a cookie or request body.
 */
import { eq } from "drizzle-orm";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { bootstrapAdminEmails, getEnv } from "@/lib/env";
import { db } from "@/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
  wallets,
  type UserRole,
} from "@/server/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: "ACTIVE" | "SUSPENDED" | "DELETED";
    } & DefaultSession["user"];
  }
}

const env = getEnv();

/**
 * Dev/test-only provider so automated tests can sign in without hitting Google.
 * Hard-disabled in production — the provider list is empty there.
 */
const testCredentialsProvider = Credentials({
  id: "test-credentials",
  name: "Test Login",
  credentials: { email: { label: "Email", type: "email" } },
  async authorize(raw) {
    if (env.NODE_ENV === "production") return null;
    const email = String(raw?.email ?? "").toLowerCase().trim();
    if (!email) return null;

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        image: existing.image,
      };
    }
    const [created] = await db.insert(users).values({ email }).returning();
    await ensureWallet(created.id);
    return { id: created.id, email: created.email, name: created.name };
  },
});

const providers = [
  ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
    ? [
        Google({
          clientId: env.AUTH_GOOGLE_ID,
          clientSecret: env.AUTH_GOOGLE_SECRET,
          allowDangerousEmailAccountLinking: false,
        }),
      ]
    : []),
  ...(env.NODE_ENV !== "production" ? [testCredentialsProvider] : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  session: {
    // JWT is required for the Credentials provider to work; the role is still
    // re-read from the database on every session callback, so a stale token
    // cannot grant stale privileges.
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const record = await db.query.users.findFirst({
        where: eq(users.email, user.email.toLowerCase()),
      });
      // Suspended or soft-deleted accounts cannot establish a session.
      if (record && record.status !== "ACTIVE") return false;
      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },

    async session({ session, token }) {
      const userId = token.sub;
      if (!userId) return session;

      // Authoritative read: role and status always come from the database.
      const record = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!record) return session;

      session.user.id = record.id;
      session.user.role = record.role;
      session.user.status = record.status;
      session.user.email = record.email;
      session.user.name = record.name ?? session.user.name;
      session.user.image = record.image ?? session.user.image;
      return session;
    },
  },
  events: {
    /**
     * A brand-new Google user automatically receives the CUSTOMER role and a
     * wallet (§5). Role assignment here is server-side only.
     */
    async createUser({ user }) {
      if (!user.id) return;
      const email = (user.email ?? "").toLowerCase();

      // Bootstrap: the operator's own account(s), listed in env, start as ADMIN
      // so the very first deployment has someone able to approve shops.
      const role: UserRole = bootstrapAdminEmails().includes(email)
        ? "ADMIN"
        : "CUSTOMER";

      await db.update(users).set({ role }).where(eq(users.id, user.id));
      await ensureWallet(user.id);
    },
  },
  trustHost: true,
  secret: env.AUTH_SECRET,
});

/** Idempotent: a user has exactly one wallet, guaranteed by a unique index. */
async function ensureWallet(userId: string): Promise<void> {
  await db.insert(wallets).values({ userId }).onConflictDoNothing();
}
