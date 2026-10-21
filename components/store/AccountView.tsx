"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { PageBanner, Panel } from "@/components/store/PageBanner";
import { Price } from "@/components/ui/Price";
import { StoreImage } from "@/components/ui/StoreImage";
import { Container } from "@/components/ui/Container";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toApiAddress, type AddressValues } from "@/lib/checkout";
import { useCustomer, useLogout } from "@/lib/hooks/use-customer";
import { useToggleWishlist, useWishlist } from "@/lib/hooks/use-wishlist";
import { hasInvoice } from "@/lib/invoice";
import { formatMoney } from "@/lib/money";
import { addressSchema, fieldErrors } from "@/lib/schemas";
import type { Order, SavedAddress, Store } from "@/lib/types";

import { FormField } from "./FormField";

const emptyAddress: AddressValues = { firstName: "", lastName: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "NG", phone: "" };

export function AccountView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: customer, isLoading } = useCustomer();
  const logout = useLogout();

  useEffect(() => {
    if (!isLoading && customer === null) router.replace("/account/login");
  }, [isLoading, customer, router]);

  const orders = useQuery({ queryKey: ["account", "orders"], queryFn: () => api.get<Order[]>("account/orders"), enabled: !!customer });
  const addresses = useQuery({ queryKey: ["account", "addresses"], queryFn: () => api.get<SavedAddress[]>("account/addresses"), enabled: !!customer });

  const store = useQuery({ queryKey: ["store"], queryFn: () => api.get<Store>("store"), staleTime: 300_000 });
  const wishlist = useWishlist();
  const toggleWishlist = useToggleWishlist();

  const [form, setForm] = useState<AddressValues>(emptyAddress);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const addAddress = useMutation({
    mutationFn: (values: AddressValues) => api.post("account/addresses", toApiAddress(values)),
    onSuccess: () => {
      setForm(emptyAddress);
      return queryClient.invalidateQueries({ queryKey: ["account", "addresses"] });
    },
  });
  const removeAddress = useMutation({
    mutationFn: (id: string) => api.delete(`account/addresses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account", "addresses"] }),
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = addressSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setFormError(null);
    try {
      await addAddress.mutateAsync({ ...emptyAddress, ...parsed.data });
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Could not save the address.");
    }
  }

  if (isLoading || !customer) return <Container className="py-16"><p role="status">Loading your account…</p></Container>;

  const field = (name: keyof AddressValues, label: string) => (
    <FormField label={label} name={`addr-${name}`} value={form[name] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))} error={errors[name]} />
  );

  return (
    <>
    <PageBanner title={`Hi, ${customer.firstName}`} crumbs={[{ label: "Home", href: "/" }, { label: "My account" }]}>
      <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>{customer.email}</span>
        <button type="button" className="underline underline-offset-4" onClick={() => logout.mutate(undefined, { onSuccess: () => router.push("/") })} disabled={logout.isPending}>Sign out</button>
      </span>
    </PageBanner>
    <Container className="space-y-8 py-10">
      <Panel id="wishlist-h" title="Wishlist">
        {wishlist.isLoading ? <p role="status">Loading…</p> : wishlist.data && wishlist.data.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {wishlist.data.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 text-sm">
                <Link href={`/products/${p.slug}`} className="relative block aspect-square overflow-hidden rounded-[var(--sf-radius)]">
                  <StoreImage src={p.images[0]?.url} alt={p.images[0]?.alt ?? p.name} className="object-cover" />
                </Link>
                <Link href={`/products/${p.slug}`} className="font-medium">{p.name}</Link>
                <Price amount={p.price} compareAt={p.compareAtPrice} currency={store.data?.currency ?? "NGN"} />
                {!p.inStock ? <p className="opacity-60">Sold out</p> : null}
                <button type="button" className="self-start underline underline-offset-4" onClick={() => toggleWishlist.mutate({ productId: p.id, saved: true })}>Remove</button>
              </li>
            ))}
          </ul>
        ) : <p className="opacity-70">Nothing saved yet. Use “Save for later” on a product page.</p>}
      </Panel>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel id="orders-h" title="Orders" className="h-fit">
          {orders.isLoading ? <p role="status">Loading…</p> : orders.data && orders.data.length > 0 ? (
            <ul className="divide-y divide-black/10 overflow-hidden rounded-[var(--sf-radius)] border border-black/10">
              {orders.data.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div>
                    <Link href={`/account/orders/${o.id}`} className="font-medium underline underline-offset-4">{o.orderNumber}</Link>
                    <p className="opacity-60">{new Date(o.placedAt).toLocaleDateString()} · {o.status.toLowerCase()} · payment {o.paymentStatus.toLowerCase().replace(/_/g, " ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatMoney(o.total, o.currency)}</p>
                    {hasInvoice(o.paymentStatus) ? <a href={`/api/shop/account/orders/${o.id}/invoice`} download className="text-xs underline underline-offset-4">Download invoice</a> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="opacity-70">No orders placed while signed in yet.</p>}
        </Panel>

        <Panel id="addr-h" title="Saved addresses" className="h-fit">
          <ul className="space-y-3">
            {addresses.data?.map((a) => (
              <li key={a.id} className="flex justify-between gap-4 rounded-[var(--sf-radius)] border border-black/10 p-4 text-sm">
                <address className="not-italic">{a.firstName} {a.lastName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}{a.state ? `, ${a.state}` : ""} {a.postalCode} {a.country}</address>
                <button type="button" className="self-start text-sm underline underline-offset-4" onClick={() => removeAddress.mutate(a.id)}>Delete</button>
              </li>
            ))}
          </ul>
          <form onSubmit={submit} noValidate className="mt-6 grid gap-3 sm:grid-cols-2">
            <h3 className="font-medium sm:col-span-2">Add an address</h3>
            {formError ? <p role="alert" className="text-sm text-red-700 sm:col-span-2">{formError}</p> : null}
            {field("firstName", "First name")}
            {field("lastName", "Last name")}
            <div className="sm:col-span-2">{field("line1", "Address")}</div>
            {field("city", "City")}
            {field("state", "State / region")}
            {field("postalCode", "Postal code")}
            {field("country", "Country (2-letter)")}
            <div className="sm:col-span-2"><Button type="submit" disabled={addAddress.isPending}>{addAddress.isPending ? "Saving…" : "Save address"}</Button></div>
          </form>
        </Panel>
      </div>
    </Container>
    </>
  );
}
