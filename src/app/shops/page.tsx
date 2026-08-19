import { ShopGrid } from "@/app/page";
import { Card, PageHeader } from "@/components/ui";
import { searchShops } from "@/server/services/shops";

export const metadata = { title: "Shops" };
export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  city?: string;
  area?: string;
  pincode?: string;
  type?: string;
  classification?: string;
  delivery?: string;
};

/** Shop search with the §15 filter set. Filters live in the URL, so results are shareable. */
export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;

  const shops = await searchShops({
    query: params.q || undefined,
    city: params.city || undefined,
    area: params.area || undefined,
    pincode: params.pincode || undefined,
    shopType: (params.type as "DAIRY" | "BAKERY" | "BOTH") || undefined,
    classification: (params.classification as "KESARI" | "GREEN") || undefined,
    deliveryOnly: params.delivery === "true",
    limit: 48,
  });

  return (
    <>
      <PageHeader
        title="Shops"
        description={`${shops.length} approved shop${shops.length === 1 ? "" : "s"} found`}
      />

      <Card className="mb-6 p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Shop name or area"
            aria-label="Shop name or area"
            className="rounded-lg border border-cream-200 px-3 py-2 text-sm focus:border-kesari-500 focus:outline-none"
          />
          <input
            name="pincode"
            defaultValue={params.pincode ?? ""}
            placeholder="PIN code"
            aria-label="PIN code"
            inputMode="numeric"
            className="rounded-lg border border-cream-200 px-3 py-2 text-sm focus:border-kesari-500 focus:outline-none"
          />
          <select
            name="type"
            defaultValue={params.type ?? ""}
            aria-label="Shop type"
            className="rounded-lg border border-cream-200 px-3 py-2 text-sm focus:border-kesari-500 focus:outline-none"
          >
            <option value="">All shop types</option>
            <option value="DAIRY">Dairy</option>
            <option value="BAKERY">Bakery</option>
            <option value="BOTH">Dairy &amp; Bakery</option>
          </select>
          <select
            name="classification"
            defaultValue={params.classification ?? ""}
            aria-label="Classification"
            className="rounded-lg border border-cream-200 px-3 py-2 text-sm focus:border-kesari-500 focus:outline-none"
          >
            <option value="">Kesari &amp; Green</option>
            <option value="KESARI">Kesari only</option>
            <option value="GREEN">Green only</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              name="delivery"
              value="true"
              defaultChecked={params.delivery === "true"}
              className="rounded border-cream-200"
            />
            Delivery available
          </label>

          <button
            type="submit"
            className="rounded-lg bg-kesari-600 px-4 py-2 text-sm font-medium text-white hover:bg-kesari-700 sm:col-span-1"
          >
            Apply filters
          </button>
        </form>
      </Card>

      <ShopGrid shops={shops} />
    </>
  );
}
