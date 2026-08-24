import { redirect } from "next/navigation";

import { AddressManager } from "@/components/address-manager";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/server/authz/guards";
import { listAddresses } from "@/server/services/addresses";

export const metadata = { title: "My Addresses" };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const addresses = await listAddresses(user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="My Addresses"
        description="Saved delivery addresses, used at checkout."
      />
      <AddressManager
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          line1: a.line1,
          line2: a.line2,
          area: a.area,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          landmark: a.landmark,
          deliveryInstructions: a.deliveryInstructions,
          latitude: a.latitude,
          longitude: a.longitude,
          locationVerified: a.locationVerified,
          isDefault: a.isDefault,
        }))}
      />
    </div>
  );
}
