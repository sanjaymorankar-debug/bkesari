"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  ClassificationBadge,
  EmptyState,
  Field,
  LinkButton,
  Money,
  inputClass,
} from "@/components/ui";
import { formatQuantity } from "@/lib/money";
import type { CartSummary } from "@/server/services/cart";

export interface CheckoutAddress {
  id: string;
  label: string | null;
  line1: string;
  area: string | null;
  city: string;
  pincode: string;
  isDefault: boolean;
}

/**
 * Cart and checkout (§17, §22, §23).
 *
 * The checkout request id is generated once per mount, so a double-click or a
 * retry after a network blip reuses the same id and cannot place two orders.
 */
export function CartView({
  cart,
  walletBalancePaise,
  addresses,
}: {
  cart: CartSummary;
  walletBalancePaise: number;
  addresses: CheckoutAddress[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  const [addressId, setAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null,
  );

  const affordable = walletBalancePaise >= cart.grandTotalPaise;
  const shortfall = Math.max(0, cart.grandTotalPaise - walletBalancePaise);

  async function updateQuantity(cartItemId: string, quantity: number) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/cart/items/${cartItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "Could not update the cart.");
    }
    setBusy(false);
    router.refresh();
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, addressId }),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(payload?.error?.message ?? "Checkout failed. Please try again.");
      return;
    }
    router.push("/orders?placed=1");
    router.refresh();
  }

  if (cart.groups.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Browse dairy and bakery products from shops near you."
        action={<LinkButton href="/">Start shopping</LinkButton>}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        {cart.groups.map((group) => (
          <Card key={group.shop.id} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-200 bg-cream-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Link
                  href={`/shops/${group.shop.slug}`}
                  className="font-medium text-ink-900 hover:underline"
                >
                  {group.shop.name}
                </Link>
                <ClassificationBadge value={group.shop.classification} />
              </div>
              <span className="text-sm text-ink-500">
                <Money paise={group.totalPaise} />
              </span>
            </div>

            <ul className="divide-y divide-cream-200">
              {group.lines.map((line) => (
                <li key={line.cartItemId} className="flex gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-900">
                      {line.productName}
                    </p>
                    <p className="text-xs text-ink-500">
                      {line.categoryName} ·{" "}
                      {formatQuantity(line.unitSizeMilli, line.unit)} per unit
                    </p>

                    {line.purchasable ? (
                      <p className="mt-1 text-sm text-ink-600">
                        <Money paise={line.unitPricePaise} /> × {line.quantity}
                      </p>
                    ) : (
                      <p className="mt-1">
                        <Badge tone="danger">{line.unavailableReason}</Badge>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end justify-between gap-2">
                    <span className="font-medium text-ink-900">
                      {line.purchasable ? (
                        <Money paise={line.lineTotalPaise} />
                      ) : (
                        <span className="text-sm text-ink-400">—</span>
                      )}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        aria-label={`Decrease ${line.productName}`}
                        onClick={() =>
                          updateQuantity(line.cartItemId, line.quantity - 1)
                        }
                      >
                        −
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">
                        {line.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        aria-label={`Increase ${line.productName}`}
                        onClick={() =>
                          updateQuantity(line.cartItemId, line.quantity + 1)
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-1 border-t border-cream-200 px-4 py-3 text-sm">
              <Row label="Subtotal" paise={group.subtotalPaise} />
              <Row label="Delivery" paise={group.deliveryFeePaise} />
              {group.taxPaise > 0 ? (
                <Row label="Taxes" paise={group.taxPaise} />
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-4">
          <h2 className="text-base font-semibold text-ink-900">Order summary</h2>

          <div className="mt-3 space-y-1 text-sm">
            <Row label="Subtotal" paise={cart.subtotalPaise} />
            <Row label="Delivery" paise={cart.deliveryFeePaise} />
            {cart.taxPaise > 0 ? <Row label="Taxes" paise={cart.taxPaise} /> : null}
            <div className="mt-2 flex justify-between border-t border-cream-200 pt-2 text-base font-semibold text-ink-900">
              <span>Grand total</span>
              <Money paise={cart.grandTotalPaise} />
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-cream-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-600">Wallet balance</span>
              <Money paise={walletBalancePaise} className="font-medium" />
            </div>
          </div>

          <div className="mt-4">
            {addresses.length === 0 ? (
              <Alert tone="info">
                No saved delivery address.{" "}
                <a href="/profile/addresses" className="underline">
                  Add one
                </a>{" "}
                before checking out.
              </Alert>
            ) : (
              <Field label="Deliver to">
                <select
                  className={inputClass}
                  value={addressId ?? ""}
                  onChange={(e) => setAddressId(e.target.value || null)}
                >
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label ? `${a.label} — ` : ""}
                      {a.line1}, {[a.area, a.city].filter(Boolean).join(", ")} — {a.pincode}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {cart.hasUnavailableItems ? (
            <div className="mt-3">
              <Alert tone="warning">
                Some items cannot be ordered online and will not be charged.
              </Alert>
            </div>
          ) : null}

          {!affordable ? (
            <div className="mt-3">
              <Alert tone="danger" title="Insufficient wallet balance">
                Add at least <Money paise={shortfall} /> to place this order.
              </Alert>
            </div>
          ) : null}

          {error ? (
            <div className="mt-3">
              <Alert tone="danger">{error}</Alert>
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            {affordable ? (
              <Button
                className="w-full"
                size="lg"
                disabled={busy || cart.grandTotalPaise === 0}
                onClick={checkout}
              >
                {busy ? "Placing order…" : "Pay from wallet"}
              </Button>
            ) : (
              <LinkButton href="/wallet" className="w-full justify-center">
                Add money to wallet
              </LinkButton>
            )}
            <LinkButton
              href="/"
              variant="secondary"
              className="w-full justify-center"
            >
              Continue shopping
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, paise }: { label: string; paise: number }) {
  return (
    <div className="flex justify-between text-ink-600">
      <span>{label}</span>
      {paise === 0 ? <span>Free</span> : <Money paise={paise} />}
    </div>
  );
}
