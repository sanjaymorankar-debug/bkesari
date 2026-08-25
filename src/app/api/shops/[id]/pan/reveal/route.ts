/** Admin-only: decrypts and returns the full PAN. Every call is audited — see revealPanForAdmin(). */
import type { NextRequest } from "next/server";

import { ok, route, type RouteContext } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { revealPanForAdmin } from "@/server/services/gst-pan-verification";

export const POST = route(
  async (_request: NextRequest, context: RouteContext<{ id: string }>) => {
    const user = await requirePermission(PERMISSIONS.SHOP_PAN_REVEAL);
    const { id } = await context.params;
    const panNumber = await revealPanForAdmin(id, user);
    return ok({ panNumber });
  },
);
