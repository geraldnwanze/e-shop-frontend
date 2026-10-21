"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { StoreImage } from "@/components/ui/StoreImage";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage, useStore } from "@/lib/admin/hooks";
import { addToSale, changeDue, isSellable, lineKey, PAYMENT_METHODS, removeLine, saleTotals, setLineQuantity, toSalePayload, type PaymentMethod, type SaleLine } from "@/lib/admin/pos";
import type { AdminOrder, AdminProduct, AdminVariant } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";
import { randomId } from "@/lib/random-id";
import { useDebounced } from "@/lib/use-debounced";

import { Modal } from "../Modal";
import { PosShiftBar } from "../PosShiftBar";
import { MoneyField } from "../MoneyField";
import { Card, CardBody, EmptyState, ErrorState, Notice, PageHeader, Spinner, TextInput } from "../ui";

const focusSearch = () => document.getElementById("pos-search")?.focus();

const EMPTY_CUSTOMER = { name: "", email: "", phone: "" };

export function PosPage() {
  const queryClient = useQueryClient();
  const { data: store } = useStore();
  const currency = store?.currency ?? "NGN";
  const money = (minor: number) => formatMoney(minor, currency);

  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tendered, setTendered] = useState<number | null>(null);
  const [discount, setDiscount] = useState<number | null>(null);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [showCustomer, setShowCustomer] = useState(false);
  const [choosing, setChoosing] = useState<AdminProduct | null>(null);
  const [receipt, setReceipt] = useState<AdminOrder | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  const products = useQuery({
    queryKey: ["pos-products", debounced],
    queryFn: () => adminApi.list<AdminProduct>("products", { status: "active", search: debounced, per_page: 36 }),
  });

  const totals = saleTotals(lines, discount ?? 0);
  const change = method === "cash" ? changeDue(totals.total, tendered ?? totals.total) : null;
  const cashShort = method === "cash" && tendered !== null && tendered < totals.total;

  function add(product: AdminProduct, variant: AdminVariant | null) {
    setLines((current) => addToSale(current, product, variant));
    setChoosing(null);
    setFormError(null);
  }

  function tap(product: AdminProduct) {
    if (!isSellable(product)) return;
    if (product.variants.length > 0) setChoosing(product);
    else add(product, null);
  }

  /** A barcode scanner types the code and presses Enter: an exact SKU match goes straight into the sale. */
  function onSearchEnter() {
    const term = search.trim().toLowerCase();
    const items = products.data?.items ?? [];
    if (term === "") return;

    for (const p of items) {
      if (p.sku?.toLowerCase() === term && isSellable(p) && p.variants.length === 0) return scanned(p, null);
      const v = p.variants.find((x) => x.sku?.toLowerCase() === term);
      if (v) return scanned(p, v);
    }

    const sellable = items.filter((p) => isSellable(p) && p.variants.length === 0);
    if (items.length === 1 && sellable.length === 1) scanned(sellable[0], null);
  }

  function scanned(product: AdminProduct, variant: AdminVariant | null) {
    add(product, variant);
    setSearch("");
    focusSearch();
  }

  const charge = useMutation({
    mutationFn: () => {
      const payload = toSalePayload({ lines, method, tendered, discount: discount ?? 0, customer, notes: "" });
      const fingerprint = JSON.stringify(payload);
      // The same sale retried (e.g. after a dropped connection) reuses its key, so it can never be charged twice.
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: `pos-${randomId()}` };

      return adminApi.post<AdminOrder>("pos/sales", payload, { idempotencyKey: attempt.current.key });
    },
    onSuccess: (order) => {
      setReceipt(order);
      void queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      void queryClient.invalidateQueries({ queryKey: ["pos-shift"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e) => {
      const fields = apiFieldErrors(e);
      setErrors(fields);
      setFormError(Object.keys(fields).length ? null : errorMessage(e));
      void queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    },
  });

  function startNewSale() {
    setReceipt(null);
    setLines([]);
    setTendered(null);
    setDiscount(null);
    setCustomer(EMPTY_CUSTOMER);
    setShowCustomer(false);
    setErrors({});
    setFormError(null);
    attempt.current = null;
    focusSearch();
  }

  function submit() {
    setErrors({});
    setFormError(null);
    if (lines.length === 0) return setFormError("Add at least one item to the sale.");
    if (cashShort) return setErrors({ amount_tendered: "The cash received is less than the total." });
    charge.mutate();
  }

  const items = products.data?.items ?? [];

  return (
    <>
      <PageHeader title="Point of sale" description="Ring up in-person sales. Stock and your reports update straight away." />

      <PosShiftBar currency={currency} />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <section aria-label="Products" className="min-w-0 space-y-4">
          <TextInput
            id="pos-search"
            label="Find a product"
            type="search"
            placeholder="Search by name or SKU, or scan a barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSearchEnter(); } }}
            autoFocus
          />

          {products.isLoading ? <Spinner /> : products.error ? <ErrorState message={errorMessage(products.error)} onRetry={() => products.refetch()} /> : items.length === 0 ? (
            <EmptyState title={debounced ? "No products match" : "No active products"} description={debounced ? "Try a different name or SKU." : "Add products to start selling."} />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((p) => {
                const sellable = isSellable(p);
                const stockLeft = p.variants.length > 0 ? p.variants.reduce((sum, v) => sum + v.stock, 0) : p.stock;

                return (
                  <li key={p.id}>
                    <button type="button" disabled={!sellable} onClick={() => tap(p)} className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white text-left shadow-[0_1px_2px_rgb(20_10_90/0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_rgb(91_61_245/0.4)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
                      <span className="relative block aspect-[4/3] bg-neutral-100">
                        <StoreImage src={p.images[0]?.url} alt="" sizes="200px" className="object-cover" />
                      </span>
                      <span className="flex flex-1 flex-col gap-0.5 p-3">
                        <span className="line-clamp-2 text-sm font-semibold">{p.name}</span>
                        <span className="text-sm text-neutral-600">{p.variants.length > 0 ? `From ${money(Math.min(...p.variants.map((v) => v.price ?? p.price)))}` : money(p.price)}</span>
                        <span className="mt-auto pt-1 text-xs text-neutral-500">{!sellable ? "Sold out" : p.trackInventory ? `${stockLeft} in stock` : "In stock"}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside aria-label="Current sale" className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardBody className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Current sale</h2>

              {lines.length === 0 ? <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">Tap a product to add it.</p> : (
                <ul className="divide-y divide-black/[0.06]">
                  {lines.map((l) => {
                    const key = lineKey(l);

                    return (
                      <li key={key} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{l.name}{l.variantName ? <span className="text-neutral-500"> · {l.variantName}</span> : null}</p>
                          <p className="text-xs text-neutral-500">{money(l.unitPrice)} each</p>
                        </div>
                        <div className="flex items-center rounded-lg border border-black/15">
                          <button type="button" aria-label={`Decrease ${l.name}`} className="px-2.5 py-1" onClick={() => l.quantity <= 1 ? setLines((c) => removeLine(c, key)) : setLines((c) => setLineQuantity(c, key, l.quantity - 1))}>−</button>
                          <span className="w-7 text-center text-sm" aria-live="polite">{l.quantity}</span>
                          <button type="button" aria-label={`Increase ${l.name}`} disabled={l.stock !== null && l.quantity >= l.stock} className="px-2.5 py-1 disabled:opacity-30" onClick={() => setLines((c) => setLineQuantity(c, key, l.quantity + 1))}>+</button>
                        </div>
                        <p className="w-20 text-right text-sm font-semibold">{money(l.unitPrice * l.quantity)}</p>
                      </li>
                    );
                  })}
                </ul>
              )}

              <MoneyField label="Discount" currency={currency} value={discount} onChange={setDiscount} optional error={errors.discount_amount} />

              <dl className="space-y-1 border-t border-black/[0.06] pt-3 text-sm">
                <div className="flex justify-between"><dt className="text-neutral-500">Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
                {totals.discount > 0 ? <div className="flex justify-between"><dt className="text-neutral-500">Discount</dt><dd>−{money(totals.discount)}</dd></div> : null}
                <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
              </dl>

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">Payment</legend>
                <div role="radiogroup" className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <label key={m.value} className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-medium ${method === m.value ? "border-brand bg-brand-soft text-brand" : "border-black/10 hover:bg-neutral-50"}`}>
                      <input type="radio" name="method" className="sr-only" checked={method === m.value} onChange={() => setMethod(m.value)} />
                      {m.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {method === "cash" ? (
                <div className="space-y-2">
                  <MoneyField label="Cash received" currency={currency} value={tendered} onChange={setTendered} optional error={errors.amount_tendered} hint="Leave empty if the customer paid the exact amount." />
                  {change !== null && change > 0 ? <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Change to give: {money(change)}</p> : null}
                </div>
              ) : null}

              <div>
                <button type="button" className="text-sm font-medium text-brand hover:underline" aria-expanded={showCustomer} onClick={() => setShowCustomer((v) => !v)}>{showCustomer ? "Hide customer details" : "Add customer details (optional)"}</button>
                {showCustomer ? (
                  <div className="mt-3 space-y-3">
                    <TextInput label="Name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} error={errors["customer.name"]} />
                    <TextInput label="Email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} error={errors["customer.email"]} />
                    <TextInput label="Phone" type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} error={errors["customer.phone"]} />
                  </div>
                ) : null}
              </div>

              {formError ? <Notice tone="red">{formError}</Notice> : null}

              <Button type="button" className="w-full !py-3 text-base" disabled={charge.isPending || lines.length === 0} onClick={submit}>
                {charge.isPending ? "Recording sale…" : `Charge ${money(totals.total)}`}
              </Button>
              {lines.length > 0 ? <button type="button" className="w-full text-sm text-neutral-500 hover:text-neutral-800" onClick={startNewSale}>Clear sale</button> : null}
            </CardBody>
          </Card>
        </aside>
      </div>

      <Modal open={choosing !== null} onClose={() => setChoosing(null)} title={choosing ? `Choose an option for ${choosing.name}` : "Choose an option"}>
        <ul className="space-y-2">
          {choosing?.variants.map((v) => {
            const out = choosing.trackInventory && v.stock < 1;

            return (
              <li key={v.id}>
                <button type="button" disabled={out} onClick={() => add(choosing, v)} className="flex w-full items-center justify-between rounded-xl border border-black/10 px-4 py-3 text-left text-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <span className="font-medium">{v.name}</span>
                  <span>{money(v.price ?? choosing.price)}<span className="ml-3 text-xs text-neutral-500">{out ? "Sold out" : choosing.trackInventory ? `${v.stock} in stock` : ""}</span></span>
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>

      <Modal open={receipt !== null} onClose={startNewSale} title="Sale complete" footer={<>
        <Button type="button" onClick={startNewSale}>New sale</Button>
      </>}>
        {receipt ? (
          <div className="space-y-4 text-sm">
            <p className="text-3xl font-extrabold">{formatMoney(receipt.total, receipt.currency)}</p>
            <p className="text-neutral-600">Order {receipt.orderNumber} · paid by {receipt.paymentMethod === "transfer" ? "bank transfer" : receipt.paymentMethod}</p>
            {receipt.change ? <p className="rounded-xl bg-emerald-50 p-3 text-base font-semibold text-emerald-800">Give change: {formatMoney(receipt.change, receipt.currency)}</p> : null}
            <ul className="divide-y divide-black/[0.06] rounded-xl border border-black/10">
              {receipt.items.map((i, n) => <li key={n} className="flex justify-between px-3 py-2"><span>{i.quantity} × {i.name}{i.variantName ? ` (${i.variantName})` : ""}</span><span>{formatMoney(i.total, receipt.currency)}</span></li>)}
            </ul>
            <a href={`/api/admin/orders/${receipt.id}/invoice`} download className="inline-block font-medium text-brand hover:underline">Download receipt (PDF)</a>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
