/** Admin/operator grievance management — assign, resolve, or change status. */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseBody, route, type RouteContext } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { assignGrievance, resolveGrievance, setGrievanceStatus } from "@/server/services/grievances";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign"), assignedToUserId: z.string().uuid() }),
  z.object({ action: z.literal("resolve"), resolutionNotes: z.string().min(5).max(4000) }),
  z.object({
    action: z.literal("status"),
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  }),
]);

export const PATCH = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const user = await requirePermission(PERMISSIONS.GRIEVANCE_MANAGE);
    const { id } = await context.params;
    const body = await parseBody(request, schema);

    if (body.action === "assign") {
      return ok(await assignGrievance(id, body.assignedToUserId, user));
    }
    if (body.action === "resolve") {
      return ok(await resolveGrievance(id, body.resolutionNotes, user));
    }
    return ok(await setGrievanceStatus(id, body.status, user));
  },
);
