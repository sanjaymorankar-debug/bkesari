/** List user accounts (§5, §42). Operator and admin both hold USER_VIEW_ANY. */
import type { NextRequest } from "next/server";

import { ok, route } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { listUsers } from "@/server/services/users";

export const dynamic = "force-dynamic";

export const GET = route(async (request: NextRequest) => {
  await requirePermission(PERMISSIONS.USER_VIEW_ANY);
  const p = new URL(request.url).searchParams;
  return ok(
    await listUsers({
      query: p.get("q") ?? undefined,
      limit: Number(p.get("limit") ?? 50),
      offset: Number(p.get("offset") ?? 0),
    }),
  );
});
