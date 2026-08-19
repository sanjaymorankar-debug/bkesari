import type { Metadata, Viewport } from "next";

import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/server/authz/guards";
import { getCart } from "@/server/services/cart";
import { unreadCount } from "@/server/services/notifications";
import { getWalletByUserId } from "@/server/services/wallet";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dairy & Bakery Marketplace",
    template: "%s · Dairy & Bakery",
  },
  description:
    "Fresh dairy and bakery from local shops. Wallet payments and flexible daily subscriptions.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f97316",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Header state is resolved server-side so the cart count and balance are
  // always authoritative rather than optimistic client state.
  const user = await getCurrentUser();
  const [cart, wallet, unread] = user
    ? await Promise.all([
        getCart(user.id).catch(() => null),
        getWalletByUserId(user.id).catch(() => null),
        unreadCount(user.id).catch(() => 0),
      ])
    : [null, null, 0];

  return (
    <html lang="en">
      <body className="min-h-screen bg-cream-50">
        <SiteHeader
          user={user}
          cartCount={cart?.itemCount ?? 0}
          balancePaise={wallet?.balancePaise ?? null}
          unreadCount={unread}
        />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-cream-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-ink-500 sm:px-6">
            Dairy &amp; Bakery Marketplace — fresh from shops near you.
          </div>
        </footer>
      </body>
    </html>
  );
}
