/** Update or remove one shop offering: price, availability, stock (§11–§13). */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { notFound } from "@/lib/errors";
import { ok, parseBody, route, type RouteContext } from "@/server/api/handler";
import { requireShopAccess } from "@/server/authz/guards";
import { PERMISSIONS } from "@/server/authz/permissions";
import { db } from "@/server/db";
import { shopProducts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { removeShopProduct, updateShopProduct } from "@/server/services/catalogue";

const schema = z.object({
  description: z.string().max(500).nullish(),
  imageUrl: z.string().url().nullish(),
  onlineSaleEnabled: z.boolean().optional(),
  offlineSaleEnabled: z.boolean().optional(),
  onlinePricePaise: z.number().int().min(0).nullish(),
  offlinePricePaise: z.number().int().min(0).nullish(),
  trackInventory: z.boolean().optional(),
  onlineStock: z.number().int().min(0).optional(),
  offlineStock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

export const PATCH = route(
  async (request: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;

    // Resolve the owning shop first, then run the ownership check against it.
    const existing = await db.query.shopProducts.findFirst({
      where: eq(shopProducts.id, id),
      columns: { shopId: true },
    });
    if (!existing) throw notFound("Product");

    const { user } = await requireShopAccess(existing.shopId, {
      anyPermission: PERMISSIONS.SHOP_PRODUCT_MANAGE_ANY,
    });

    const body = await parseBody(request, schema);
    return ok(await updateShopProduct(id, body, user as never));
  },
);

/** Removes a product from the shop's catalogue (§9 "remove products"). */
export const DELETE = route(
  async (_request: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;

    const existing = await db.query.shopProducts.findFirst({
      where: eq(shopProducts.id, id),
      columns: { shopId: true },
    });
    if (!existing) throw notFound("Product");

    const { user } = await requireShopAccess(existing.shopId, {
      anyPermission: PERMISSIONS.SHOP_PRODUCT_MANAGE_ANY,
    });

    await removeShopProduct(id, user as never);
    return ok({ removed: true });
  },
);
