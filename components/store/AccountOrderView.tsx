"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { PageBanner, Panel } from "@/components/store/PageBanner";
import { Container } from "@/components/ui/Container";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useCustomer } from "@/lib/hooks/use-customer";
import { hasInvoice } from "@/lib/invoice";
import { formatMoney } from "@/lib/money";
import { reorder, type ReorderResult } from "@/lib/reorder";
import type { Order } from "@/lib/types";

import { OrderTimeline } from "./OrderTimeline";

export function AccountOrderView({ id }: { id: string }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { data: customer, isLoading: loadingCustomer } = useCustomer();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReorderResult | null>(null);

  useEffect(() => {
    if (!loadingCustomer && customer === null) router.replace("/account/login");
  }, [loadingCustomer, customer, router]);

  const order = useQuery({ queryKey: ["account", "order", id], queryFn: () => api.get<Order>(`account/orders/${id}`), enabled: !!customer, retry: false });

  async function orderAgain(current: Order) {
    setBusy(true);
    setResult(null);
    try {
      setResult(await reorder(current.items, addItem));
    } finally {
      setBusy(false);
    }
  }

  if (loadingCustomer || !customer || order.isLoading) return <Container className="py-16"><p role="status">Loading your order…</p></Container>;

  if (order.error || !order.data) {
    const missing = order.error instanceof ApiError && order.error.status === 404;

    return (
      <Container className="py-16">
        <p role="alert">{missing ? "We couldn't find that order." : "We couldn't load this order. Please try again."}</p>
        <Link href="/account" className="mt-4 inline-block underline underline-offset-4">Back to my account</Link>
      </Container>
    );
  }

  const o = order.data;

  return (
    <>
    <PageBanner title={`Order ${o.orderNumber}`} crumbs={[{ label: "Home", href: "/" }, { label: "My account", href: "/account" }, { label: o.orderNumber }]}>
      Placed {new Date(o.placedAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · payment {o.paymentStatus.toLowerCase().replace(/_/g, " ")}
    </PageBanner>
    <Container className="max-w-3xl space-y-6 py-10">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {hasInvoice(o.paymentStatus) ? <a href={`/api/shop/account/orders/${o.id}/invoice`} download className="rounded-[var(--sf-pill,9999px)] border border-black/25 px-5 py-2 text-sm font-medium transition hover:bg-black/5">Download invoice</a> : null}
        <Button type="button" onClick={() => orderAgain(o)} disabled={busy} className="!rounded-[var(--sf-pill,9999px)]">{busy ? "Adding…" : "Order again"}</Button>
      </div>

      <div aria-live="polite">
        {result ? (
          <div role="status" className="mt-6 rounded-[var(--sf-radius)] border border-black/15 p-4 text-sm">
            {result.added > 0 ? <p>Added {result.added} item{result.added === 1 ? "" : "s"} to your cart. <Link href="/cart" className="font-medium underline underline-offset-4">View cart</Link></p> : <p>Nothing could be added to your cart.</p>}
            {result.skipped.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 opacity-80">
                {result.skipped.map((s) => <li key={s.name}>{s.name}: {s.reason}</li>)}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <Panel id="progress-h" title="Progress"><OrderTimeline status={o.status} placedAt={o.placedAt} /></Panel>

      <Panel id="items-h" title="Items">
        <ul className="divide-y divide-black/10 rounded-[var(--sf-radius)] border border-black/10">
          {o.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-4 p-4 text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                {item.variantName ? <p className="opacity-60">{item.variantName}</p> : null}
                <p className="opacity-60">{item.quantity} × {formatMoney(item.unitPrice, o.currency)}</p>
              </div>
              <p className="font-semibold">{formatMoney(item.total, o.currency)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(o.subtotal, o.currency)}</dd></div>
          {o.discountTotal > 0 ? <div className="flex justify-between"><dt>Discount{o.discountCode ? ` (${o.discountCode})` : ""}</dt><dd>−{formatMoney(o.discountTotal, o.currency)}</dd></div> : null}
          <div className="flex justify-between"><dt>Shipping{o.shippingMethod ? ` (${o.shippingMethod})` : ""}</dt><dd>{formatMoney(o.shippingTotal, o.currency)}</dd></div>
          {o.taxTotal > 0 ? <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(o.taxTotal, o.currency)}</dd></div> : null}
          <div className="flex justify-between border-t border-black/10 pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(o.total, o.currency)}</dd></div>
        </dl>
      </Panel>
    </Container>
    </>
  );
}
