/**
 * Central login (bkesari.com) before any page renders. Inert unless
 * BKESARI_SSO_INTROSPECT_URL is set; see src/server/sso/bkesari-sso.ts.
 *
 * Pages: a central session without MILK_DAIRY goes to the subscribe page,
 * and with BKESARI_SSO_ENFORCE a visitor with no central session goes to the
 * central sign-in. API routes are refused here too, and enforce on their own
 * through the guards (requireUser), so this is not the only line.
 */
import { NextResponse, type NextRequest } from "next/server";

import { decideProxy, introspect, pickToken, ssoConfig } from "@/server/sso/bkesari-sso";

export async function proxy(request: NextRequest) {
  const cfg = ssoConfig();
  if (!cfg) return NextResponse.next();
  const { pathname, search, basePath } = request.nextUrl;
  const token = pickToken((n) => request.cookies.get(n)?.value, cfg.cookieNames);
  const decision = decideProxy({
    path: pathname,
    publicPath: `${basePath}${pathname}${search}`,
    identity: await introspect(token, cfg),
    cfg,
  });
  if (decision.action === "json") return NextResponse.json(decision.body, { status: decision.status });
  if (decision.action === "redirect") return NextResponse.redirect(decision.to);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)"],
};
