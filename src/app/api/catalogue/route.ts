/** Categories and master products, by department (§7). */
import type { NextRequest } from "next/server";

import { ok, route } from "@/server/api/handler";
import { listCategories, listProducts } from "@/server/services/catalogue";
import type { Department } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export const GET = route(async (request: NextRequest) => {
  const p = new URL(request.url).searchParams;
  const department = (p.get("department") as Department | null) ?? undefined;

  const [categories, catalogue] = await Promise.all([
    listCategories(department),
    listProducts({
      department,
      categoryId: p.get("categoryId") ?? undefined,
      subscribableOnly: p.get("subscribable") === "true",
    }),
  ]);
  return ok({ categories, products: catalogue });
});
