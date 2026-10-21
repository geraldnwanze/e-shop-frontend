"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageBanner, Panel } from "@/components/store/PageBanner";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/money";
import { fieldErrors, trackOrderSchema } from "@/lib/schemas";
import type { TrackedOrder } from "@/lib/types";

import { FormField } from "./FormField";
import { OrderTimeline } from "./OrderTimeline";

export function TrackOrderForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TrackedOrder | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = trackOrderSchema.safeParse({ orderNumber });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));

    setErrors({});
    setMessage(null);
    setResult(null);
    setLoading(true);
    try {
      setResult(await api.post<TrackedOrder>("orders/track", { order_number: parsed.data.orderNumber }));
    } catch (e) {
      setMessage(e instanceof ApiError && e.status === 404 ? "We couldn't find an order with that number." : e instanceof ApiError && e.status === 429 ? "Too many attempts. Please wait a minute." : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <PageBanner title="Track your order" crumbs={[{ label: "Home", href: "/" }, { label: "Track order" }]}>Enter the order number from your confirmation email.</PageBanner>
    <Container className="max-w-xl py-10">
      <Panel>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormField label="Order number" name="orderNumber" placeholder="ORD-2026-000001" autoCapitalize="characters" autoComplete="off" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} error={errors.orderNumber} />
        <Button type="submit" disabled={loading}>{loading ? "Looking up…" : "Track order"}</Button>
      </form>
      </Panel>

      <div aria-live="polite" className="mt-8">
        {message ? <p role="alert" className="text-red-700">{message}</p> : null}
        {result ? (
          <section className="rounded-[var(--sf-radius)] bg-surface p-6 shadow-sm ring-1 ring-black/10">
            <p className="text-sm opacity-60">Order {result.orderNumber}</p>
            <p className="mt-1 text-sm">Payment: {result.paymentStatus.replace(/_/g, " ").toLowerCase()}</p>
            <OrderTimeline status={result.status} placedAt={result.placedAt} />
            <ul className="mt-6 space-y-1 border-t border-black/10 pt-4 text-sm">
              {result.items.map((item, i) => <li key={i}>{item.quantity} × {item.name}{item.variantName ? ` (${item.variantName})` : ""}</li>)}
            </ul>
            <p className="mt-4 font-semibold">Total {formatMoney(result.total, result.currency)}</p>
          </section>
        ) : null}
      </div>
    </Container>
    </>
  );
}
