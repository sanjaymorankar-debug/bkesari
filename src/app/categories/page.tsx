import Link from "next/link";

import { Card, PageHeader } from "@/components/ui";
import { SHOP_TYPES } from "@/lib/shop-types";

export const metadata = { title: "Categories" };

/** Directory of all supported shop types (requirement §6, §7). */
export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        title="Shop categories"
        description={`${SHOP_TYPES.length} shop types you can find and shop from.`}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHOP_TYPES.map((t) => (
          <Link key={t.key} href={`/category/${t.key}`}>
            <Card className="p-4 transition-shadow hover:shadow-md">
              <h2 className="text-base font-semibold text-ink-900">{t.label}</h2>
              <p className="mt-1 text-xs text-ink-500">
                {t.standardGoods.slice(0, 6).join(", ")}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
