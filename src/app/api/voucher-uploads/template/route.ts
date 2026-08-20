/** Downloadable voucher-list template (§16). */
import { NextResponse } from "next/server";

import { route } from "@/server/api/handler";
import { requirePermission } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { buildVoucherTemplate } from "@/server/services/vouchers";

export const GET = route(async () => {
  await requirePermission(PERMISSIONS.VOUCHER_UPLOAD);
  const buffer = await buildVoucherTemplate();

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="voucher-list-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
});
