"use client";

import { useState } from "react";

import { Alert, Button, Card, Field, inputClass } from "@/components/ui";

const CATEGORIES = [
  { value: "PAYMENT", label: "Payment" },
  { value: "WALLET", label: "Wallet" },
  { value: "ORDER", label: "Order" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "SELLER", label: "Seller / shop" },
  { value: "PRODUCT", label: "Product" },
  { value: "PRIVACY", label: "Privacy / data" },
  { value: "OTHER", label: "Other" },
] as const;

/** Public complaint form (Part 58) — no sign-in required. */
export function GrievanceForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("OTHER");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch("/api/grievances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone: phone || null,
        category,
        subject,
        description,
      }),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(payload?.error?.message ?? "Could not submit your complaint.");
      return;
    }
    setTicket(payload.ticketNumber);
  }

  if (ticket) {
    return (
      <Card className="p-6">
        <Alert tone="success" title="Complaint submitted">
          Your ticket number is <strong>{ticket}</strong>. Save it — you can
          look up your complaint&apos;s status any time using this ticket
          number and the email address you submitted.
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form className="grid gap-4" onSubmit={submit}>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Field label="Your name">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Phone (optional)">
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Category">
          <select
            className={inputClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subject">
          <input
            className={inputClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            minLength={3}
          />
        </Field>
        <Field label="Describe your complaint" hint="Include order/ticket references if you have them.">
          <textarea
            className={inputClass}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? "Submitting…" : "Submit complaint"}
        </Button>
      </form>
    </Card>
  );
}

/** Ticket status lookup — requires the email the complaint was filed with. */
export function GrievanceLookup() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ticketNumber: string;
    status: string;
    subject: string;
    resolutionNotes: string | null;
  } | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    const params = new URLSearchParams({ ticket: ticketNumber, email });
    const response = await fetch(`/api/grievances/lookup?${params.toString()}`);
    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(payload?.error?.message ?? "Could not find that complaint.");
      return;
    }
    setResult(payload);
  }

  return (
    <Card className="p-6">
      <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={lookup}>
        {error ? (
          <div className="sm:col-span-3">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}
        <Field label="Ticket number">
          <input
            className={inputClass}
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value)}
            placeholder="GRV-000123"
            required
          />
        </Field>
        <Field label="Email used to submit">
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? "Checking…" : "Check status"}
        </Button>
      </form>

      {result ? (
        <div className="mt-4 border-t border-cream-200 pt-4 text-sm">
          <p>
            <strong>{result.ticketNumber}</strong> — {result.subject}
          </p>
          <p className="mt-1 text-ink-500">Status: {result.status.replace("_", " ")}</p>
          {result.resolutionNotes ? (
            <p className="mt-2 text-ink-600">{result.resolutionNotes}</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
