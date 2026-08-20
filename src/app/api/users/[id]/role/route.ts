/** Change a user's role (§5). ADMIN only — OPERATOR does not hold USER_SET_ROLE. */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route, type RouteContext } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { userRoleEnum } from "@/server/db/schema";
import { setUserRole } from "@/server/services/users";

const schema = z.object({ role: z.enum(userRoleEnum.enumValues) });

export const PATCH = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const actor = await requirePermission(PERMISSIONS.USER_SET_ROLE);
    const { id } = await context.params;
    const { role } = await parseBody(request, schema);
    return ok(await setUserRole(id, role, actor));
  },
);
