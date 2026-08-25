"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Badge, Button, Card, EmptyState, inputClass } from "@/components/ui";

export interface PendingGstPanShop {
  id: string;
  name: string;
  city: string;
  gstStatus: string;
  gstin: string | null;
  panStatus: string;
  panMasked: string | null;
  panHolderName: string | null;
}

/**
 * GST/PAN verification queue (marketplace GST-readiness follow-up). No
 * automated provider is configured, so this is a manual confirm/reject —
 * the admin checks the GSTIN/PAN on the government portal themselves
 * before approving. Mirrors ShopApprovalPanel's review pattern.
 */
export function GstPanVerificationQueue({ shops }: { shops: PendingGstPanShop[] }) {
  if (shops.length === 0) {
    return <EmptyState title="No GST or PAN submissions waiting for review." />;
  }
  return (
    <div className="space-y-3">
      {shops.map((shop) => (
        <ShopRow key={shop.id} shop={shop} />
      ))}
    </div>
  );
}

function ShopRow({ shop }: { shop: PendingGstPanShop }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<"gst" | "pan" | null>(null);
  const [reason, setReason] = useState("");

  async function act(path: string, body: unknown = {}) {
    setBusy(path);
    setError(null);
    const response = await fetch(`/api/shops/${shop.id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "Action failed.");
      return;
    }
    setRejecting(null);
    setReason("");
    router.refresh();
  }

  return (
    <Card className="p-4">
      <p className="font-semibold text-ink-900">
        {shop.name} <span className="font-normal text-ink-500">— {shop.city}</span>
      </p>

      {shop.gstStatus === "PENDING_VERIFICATION" ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-cream-200 pt-2">
          <div>
            <Badge tone="warning">GST pending</Badge>
            <span className="ml-2 text-sm text-ink-700">{shop.gstin}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy === "gst/verify"} onClick={() => act("gst/verify")}>
              Confirm GST
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy === "gst/reject"}
              onClick={() => setRejecting(rejecting === "gst" ? null : "gst")}
            >
              Reject
            </Button>
          </div>
        </div>
      ) : null}
      {rejecting === "gst" ? (
        <div className="mt-2 flex gap-2">
          <input
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (e.g. GSTIN not found on portal)"
          />
          <Button
            size="sm"
            variant="danger"
            disabled={busy === "gst/reject" || reason.trim().length < 3}
            onClick={() => act("gst/reject", { reason })}
          >
            Confirm reject
          </Button>
        </div>
      ) : null}

      {shop.panStatus === "PENDING_VERIFICATION" ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-cream-200 pt-2">
          <div>
            <Badge tone="warning">PAN pending</Badge>
            <span className="ml-2 text-sm text-ink-700">
              {shop.panMasked} · {shop.panHolderName}
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy === "pan/verify"} onClick={() => act("pan/verify")}>
              Confirm PAN
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy === "pan/reject"}
              onClick={() => setRejecting(rejecting === "pan" ? null : "pan")}
            >
              Reject
            </Button>
          </div>
        </div>
      ) : null}
      {rejecting === "pan" ? (
        <div className="mt-2 flex gap-2">
          <input
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (e.g. name doesn't match)"
          />
          <Button
            size="sm"
            variant="danger"
            disabled={busy === "pan/reject" || reason.trim().length < 3}
            onClick={() => act("pan/reject", { reason })}
          >
            Confirm reject
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-2">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}
    </Card>
  );
}
