"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, Card, Field, inputClass } from "@/components/ui";
import { rupeesToPaise } from "@/lib/money";
import { SHOP_TYPES } from "@/lib/shop-types";

/**
 * Shop registration (§8).
 *
 * Note what is NOT on this form: status and Kesari/Green classification. Both
 * are assigned server-side by an operator, so a shop cannot self-approve or
 * self-classify.
 */
export function ShopRegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const get = (key: string) => String(formData.get(key) ?? "").trim();
    const deliveryFee = get("deliveryFee");

    const response = await fetch("/api/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: get("name"),
        ownerName: get("ownerName"),
        phone: get("phone"),
        email: get("email") || null,
        addressLine1: get("addressLine1"),
        addressLine2: get("addressLine2") || null,
        area: get("area") || null,
        city: get("city"),
        state: get("state") || null,
        pincode: get("pincode"),
        shopType: get("shopType"),
        description: get("description") || null,
        deliveryAvailable,
        deliveryFeePaise:
          deliveryAvailable && deliveryFee ? rupeesToPaise(Number(deliveryFee)) : 0,
        // Sensible default hours; the owner can refine them later.
        openingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
          day,
          open: "06:00",
          close: "22:00",
        })),
      }),
    });

    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      const fields = payload?.error?.details?.fields;
      if (fields && typeof fields === "object") setFieldErrors(fields);
      setError(payload?.error?.message ?? "Could not register the shop.");
      return;
    }
    router.push("/shop");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <form action={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Shop name" error={fieldErrors.name}>
            <input name="name" required className={inputClass} />
          </Field>
        </div>

        <Field label="Owner name" error={fieldErrors.ownerName}>
          <input name="ownerName" required className={inputClass} />
        </Field>

        <Field
          label="Phone"
          hint="10-digit Indian mobile number"
          error={fieldErrors.phone}
        >
          <input
            name="phone"
            required
            inputMode="numeric"
            pattern="[6-9][0-9]{9}"
            className={inputClass}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Email (optional)" error={fieldErrors.email}>
            <input name="email" type="email" className={inputClass} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Address" error={fieldErrors.addressLine1}>
            <input name="addressLine1" required className={inputClass} />
          </Field>
        </div>

        <Field label="Area / locality">
          <input name="area" className={inputClass} />
        </Field>

        <Field label="City" error={fieldErrors.city}>
          <input name="city" required defaultValue="Pune" className={inputClass} />
        </Field>

        <Field label="State">
          <input name="state" defaultValue="Maharashtra" className={inputClass} />
        </Field>

        <Field label="PIN code" hint="6 digits" error={fieldErrors.pincode}>
          <input
            name="pincode"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            className={inputClass}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="Shop type"
            hint="We'll suggest the right products to list based on this."
            error={fieldErrors.shopType}
          >
            <select name="shopType" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Select a shop type
              </option>
              {SHOP_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="About your shop (optional)">
            <textarea name="description" rows={3} className={inputClass} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={deliveryAvailable}
              onChange={(e) => setDeliveryAvailable(e.target.checked)}
            />
            We deliver to customers
          </label>
        </div>

        {deliveryAvailable ? (
          <Field label="Delivery fee (₹)">
            <input
              name="deliveryFee"
              type="number"
              min={0}
              defaultValue={20}
              className={inputClass}
            />
          </Field>
        ) : null}

        {error ? (
          <div className="sm:col-span-2">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "Submitting…" : "Submit for approval"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
