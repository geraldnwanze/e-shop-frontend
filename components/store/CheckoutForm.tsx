"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageBanner, Panel, StatusCard } from "@/components/store/PageBanner";
import { Container } from "@/components/ui/Container";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { isSafeRedirect, serverKeyToField, toCheckoutPayload, type AddressValues, type CheckoutValues } from "@/lib/checkout";
import { useCustomer } from "@/lib/hooks/use-customer";
import { formatMoney } from "@/lib/money";
import { randomId } from "@/lib/random-id";
import { normalizeCode, RECOVERY_CODE_KEY } from "@/lib/recovery-code";
import { checkoutSchema, fieldErrors } from "@/lib/schemas";
import type { Order, PaymentInit, ShippingLocations, ShippingQuote } from "@/lib/types";

import { FormField } from "./FormField";
import { SelectField } from "./SelectField";

const emptyAddress: AddressValues = { firstName: "", lastName: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "NG", phone: "" };

interface Props {
  requirePhone: boolean;
  allowGuest: boolean;
  shippingFlatRate: number;
}

const LAST_ORDER_KEY = "sf:lastOrder";
const IDEMPOTENCY_KEY = "sf:idem:checkout";

/** Same payload => same key (safe network retries); changed payload => new key. */
function idempotencyKeyFor(payload: string): string {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(IDEMPOTENCY_KEY) ?? "null") as { payload: string; key: string } | null;
    if (stored && stored.payload === payload) return stored.key;

    const key = `co-${randomId()}`;
    window.sessionStorage.setItem(IDEMPOTENCY_KEY, JSON.stringify({ payload, key }));
    return key;
  } catch {
    return `co-${randomId()}`;
  }
}

function readSavedCode(): string | null {
  try {
    return normalizeCode(window.localStorage.getItem(RECOVERY_CODE_KEY));
  } catch {
    return null;
  }
}

export function CheckoutForm({ requirePhone, allowGuest, shippingFlatRate }: Props) {
  const router = useRouter();
  const { cart, cartId, isLoading, reset } = useCart();
  const { data: customer, isLoading: customerLoading } = useCustomer();

  const [values, setValues] = useState<CheckoutValues>({ email: "", firstName: "", lastName: "", phone: "", shipping: emptyAddress, billingSameAsShipping: true, notes: "" });

  // A reminder email's recovery link leaves its discount code in storage; it fills the field until the shopper types their own.
  const savedCode = useSyncExternalStore(() => () => undefined, readSavedCode, () => null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<Pick<Order, "id" | "orderNumber" | "total" | "currency"> & { email: string } | null>(null);

  // Delivery: the address decides which zone applies, and the zone decides which methods are offered.
  const locations = useQuery({ queryKey: ["shipping-locations"], queryFn: () => api.get<ShippingLocations>("shipping/locations"), staleTime: 5 * 60_000 });
  const country = values.shipping.country.trim().toUpperCase();
  const state = values.shipping.state ?? "";
  const quoteReady = Boolean(cartId) && country.length === 2 && (country !== "NG" || state !== "");
  const quote = useQuery({
    queryKey: ["shipping-options", cartId, country, state, cart?.subtotal],
    enabled: quoteReady,
    queryFn: () => api.post<ShippingQuote>("shipping/options", { cart_id: cartId, country, state: state || null }),
  });
  const zonesConfigured = locations.data?.configured === true || quote.data?.configured === true;
  const options = quote.data?.options ?? [];
  const selectedRate = options.find((o) => o.id === values.shippingRateId) ?? (options.length === 1 ? options[0] : null);
  const noDelivery = zonesConfigured && quoteReady && quote.data?.available === false;

  /** Tell the store who this cart belongs to, so a reminder can be sent if the shopper leaves. Best effort only. */
  function rememberEmail() {
    const email = values.email.trim();

    if (cartId && /^\S+@\S+\.\S+$/.test(email)) {
      void api.put(`cart/${cartId}/contact`, { email }).catch(() => undefined);
    }
  }

  const set = (patch: Partial<CheckoutValues>) => setValues((v) => ({ ...v, ...patch }));
  const setAddress = (key: "shipping" | "billing", patch: Partial<AddressValues>) =>
    setValues((v) => ({ ...v, [key]: { ...emptyAddress, ...v[key], ...patch } }));

  // Signed-in customers: identity comes from the account (the server enforces this too).
  const identity = customer ? { email: customer.email, firstName: customer.firstName, lastName: customer.lastName } : null;
  const withCode: CheckoutValues = { ...values, discountCode: values.discountCode ?? savedCode ?? "" };
  const effective: CheckoutValues = identity ? { ...withCode, ...identity } : withCode;

  async function startPayment(order: { id: string; email: string; orderNumber: string }) {
    setFormError(null);
    try {
      const init = await api.post<PaymentInit>("payments/initialize", { order_id: order.id, email: order.email }, { idempotencyKey: `pay-${order.id}` });

      if (init.requiresPayment && isSafeRedirect(init.payment?.authorizationUrl)) {
        window.location.assign(init.payment.authorizationUrl);
        return;
      }

      router.push("/checkout/complete");
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "We couldn't start the payment. Your order is saved, you can try again.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!cartId || !cart) return;

    const parsed = checkoutSchema(requirePhone).safeParse(effective);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError("Please fix the highlighted fields.");
      return;
    }

    if (noDelivery) {
      setFormError(quote.data?.message ?? "Sorry, we don't deliver to that address yet.");
      return;
    }

    if (zonesConfigured && !selectedRate) {
      setErrors({ shippingRateId: "Choose a delivery method" });
      setFormError("Please choose how you'd like your order delivered.");
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);

    const payload = toCheckoutPayload(cartId, { ...effective, shippingRateId: selectedRate?.id ?? null });

    try {
      const order = await api.post<Order>("checkout", payload, { idempotencyKey: idempotencyKeyFor(JSON.stringify(payload)) });
      const summary = { id: order.id, orderNumber: order.orderNumber, total: order.total, currency: order.currency, email: order.customer.email };

      try {
        window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(summary));
        window.sessionStorage.removeItem(IDEMPOTENCY_KEY);
      } catch {
        /* ignore */
      }

      setPlaced(summary);
      reset();
      try { window.localStorage.removeItem(RECOVERY_CODE_KEY); } catch { /* storage unavailable */ }
      await startPayment(summary);
    } catch (e) {
      if (e instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(e.fieldErrors)) mapped[serverKeyToField(key)] = messages[0];
        const savedCodeRejected = mapped.discountCode !== undefined && values.discountCode === undefined && savedCode !== null;

        if (savedCodeRejected) {
          // A code from a reminder email that has expired or been used: drop it so it cannot block the order again.
          try { window.localStorage.removeItem(RECOVERY_CODE_KEY); } catch { /* storage unavailable */ }
          set({ discountCode: "" });
          delete mapped.discountCode;
          setErrors(mapped);
          setFormError("The saved discount code is no longer valid, so we removed it. You can place your order again without it.");
          return;
        }

        setErrors(mapped);
        setFormError(e.code === "INSUFFICIENT_STOCK" ? `${e.message} Please adjust your cart.` : e.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (placed) {
    return formError ? (
      <StatusCard
        tone="warn"
        title={`Order ${placed.orderNumber} placed`}
        actions={<><Button onClick={() => startPayment(placed)}>Try payment again</Button><ButtonLink href="/orders/track" variant="secondary">Track order</ButtonLink></>}
      >
        <span role="alert" className="text-red-700">{formError}</span>
      </StatusCard>
    ) : (
      <StatusCard tone="success" title={`Order ${placed.orderNumber} placed`}>Redirecting you to payment…</StatusCard>
    );
  }

  if (isLoading || customerLoading) return <Container className="py-16"><p role="status">Loading…</p></Container>;

  if (!cart || cart.items.length === 0) {
    return (
      <Container className="py-20 text-center">
        <h1 className="font-heading text-3xl">Nothing to check out</h1>
        <div className="mt-6"><ButtonLink href="/products">Browse products</ButtonLink></div>
      </Container>
    );
  }

  if (!customer && !allowGuest) {
    return (
      <Container className="max-w-xl py-20 text-center">
        <h1 className="font-heading text-3xl">Sign in to check out</h1>
        <p className="mt-3 opacity-70">This store requires an account to place orders.</p>
        <div className="mt-6 flex justify-center gap-3"><ButtonLink href="/account/login">Sign in</ButtonLink><ButtonLink href="/account/register" variant="secondary">Create account</ButtonLink></div>
      </Container>
    );
  }

  const err = (key: string) => errors[key];
  const addressFields = (key: "shipping" | "billing") => {
    const a = values[key] ?? emptyAddress;
    const p = (name: keyof AddressValues, label: string, extra: Record<string, string> = {}) => (
      <FormField key={name} label={label} name={`${key}-${name}`} value={a[name] ?? ""} onChange={(e) => setAddress(key, { [name]: e.target.value })} error={err(`${key}.${name}`)} {...extra} />
    );
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {p("firstName", "First name", { autoComplete: "given-name" })}
        {p("lastName", "Last name", { autoComplete: "family-name" })}
        <div className="sm:col-span-2">{p("line1", "Address", { autoComplete: "address-line1" })}</div>
        <div className="sm:col-span-2">{p("line2", "Apartment, suite, etc. (optional)", { autoComplete: "address-line2" })}</div>
        {p("city", "City", { autoComplete: "address-level2" })}
        {key === "shipping" && locations.data && a.country.toUpperCase() === "NG" ? (
          <SelectField label="State" name={`${key}-state`} value={a.state ?? ""} onChange={(e) => setAddress(key, { state: e.target.value })} error={err(`${key}.state`)} placeholder="Select a state" options={locations.data.states.map((s) => ({ value: s, label: s }))} autoComplete="address-level1" />
        ) : p("state", "State / region", { autoComplete: "address-level1" })}
        {p("postalCode", "Postal code", { autoComplete: "postal-code" })}
        {key === "shipping" && locations.data && locations.data.countries.length > 0 ? (
          <SelectField label="Country" name={`${key}-country`} value={a.country.toUpperCase()} onChange={(e) => setAddress(key, { country: e.target.value, state: "" })} error={err(`${key}.country`)} options={locations.data.countries.map((c) => ({ value: c.code, label: c.name }))} autoComplete="country" />
        ) : p("country", "Country (2-letter code)", { autoComplete: "country", maxLength: "2" })}
      </div>
    );
  };

  const billStep = zonesConfigured ? 4 : 3;
  const extraStep = billStep + 1;
  const shippingCost = zonesConfigured ? (selectedRate?.price ?? 0) : shippingFlatRate;
  const estimatedTotal = cart.subtotal + shippingCost;

  return (
    <>
    <PageBanner title="Checkout" crumbs={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
    <Container className="py-10">
      <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          {formError ? <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{formError}</p> : null}

          <Panel id="contact-h" title="Contact" step={1}>
            {customer ? (
              <p className="text-sm">Ordering as <strong>{customer.firstName} {customer.lastName}</strong> ({customer.email})</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Email" type="email" name="email" autoComplete="email" value={values.email} onChange={(e) => set({ email: e.target.value })} onBlur={rememberEmail} error={err("email")} className="sm:col-span-2" />
                <FormField label="First name" name="firstName" autoComplete="given-name" value={values.firstName} onChange={(e) => set({ firstName: e.target.value })} error={err("firstName")} />
                <FormField label="Last name" name="lastName" autoComplete="family-name" value={values.lastName} onChange={(e) => set({ lastName: e.target.value })} error={err("lastName")} />
              </div>
            )}
            <FormField label={requirePhone ? "Phone" : "Phone (optional)"} type="tel" name="phone" autoComplete="tel" value={values.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} error={err("phone")} className="mt-4 sm:max-w-xs" />
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" name="acceptsMarketing" checked={values.acceptsMarketing === true} onChange={(e) => set({ acceptsMarketing: e.target.checked })} className="mt-0.5" />
              <span>Email me news and offers from this store. <span className="opacity-60">You can unsubscribe at any time.</span></span>
            </label>
          </Panel>

          <Panel id="ship-h" title="Shipping address" step={2}>
            {addressFields("shipping")}
          </Panel>

          {zonesConfigured ? (
            <Panel id="delivery-h" title="Delivery method" step={3}>
              {!quoteReady ? <p className="text-sm opacity-70">Enter your address to see delivery options.</p> : quote.isLoading ? <p role="status" className="text-sm opacity-70">Finding delivery options…</p> : noDelivery ? (
                <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{quote.data?.message ?? "Sorry, we don't deliver to that address yet."}</p>
              ) : quote.isError ? <p role="alert" className="text-sm text-red-700">We couldn&apos;t load delivery options. Please try again.</p> : (
                <div role="radiogroup" aria-label="Delivery method" className="space-y-2">
                  {options.map((o) => (
                    <label key={o.id} className={`flex cursor-pointer items-start justify-between gap-4 rounded-[var(--sf-radius)] border p-4 text-sm ${selectedRate?.id === o.id ? "border-primary ring-1 ring-primary" : "border-black/20"}`}>
                      <span className="flex items-start gap-3">
                        <input type="radio" name="shippingRate" className="mt-1" checked={selectedRate?.id === o.id} onChange={() => set({ shippingRateId: o.id })} />
                        <span><span className="block font-medium">{o.name}</span>{o.description ? <span className="block opacity-70">{o.description}</span> : null}{!o.free && o.freeOver ? <span className="block text-xs opacity-60">Free over {formatMoney(o.freeOver, cart.currency)}</span> : null}</span>
                      </span>
                      <span className="font-semibold">{o.free ? "Free" : formatMoney(o.price, cart.currency)}</span>
                    </label>
                  ))}
                </div>
              )}
              {err("shippingRateId") ? <p role="alert" className="mt-2 text-sm text-red-600">{err("shippingRateId")}</p> : null}
            </Panel>
          ) : null}

          <Panel id="bill-h" title="Billing address" step={billStep}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={values.billingSameAsShipping} onChange={(e) => set({ billingSameAsShipping: e.target.checked, billing: e.target.checked ? undefined : { ...values.shipping } })} />
              Same as shipping address
            </label>
            {!values.billingSameAsShipping ? <div className="mt-4">{addressFields("billing")}</div> : null}
            {err("billing") ? <p role="alert" className="mt-1 text-sm text-red-600">{err("billing")}</p> : null}
          </Panel>

          <Panel id="extra-h" title="Additional" step={extraStep}>
            <FormField label="Discount code (optional)" name="discountCode" value={values.discountCode ?? savedCode ?? ""} onChange={(e) => set({ discountCode: e.target.value })} error={err("discountCode")} className="sm:max-w-xs" autoCapitalize="characters" />
            <div className="mt-4">
              <label htmlFor="notes" className="mb-1 block text-sm font-medium">Order notes (optional)</label>
              <textarea id="notes" rows={3} value={values.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} className="w-full rounded-[var(--sf-radius)] border border-black/20 bg-transparent px-3 py-2 text-sm" />
            </div>
          </Panel>
        </div>

        <Panel className="h-fit lg:sticky lg:top-24" id="summary-h" title="Order summary">
          <ul className="mt-4 space-y-3 text-sm">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>{i.quantity} × {i.name}{i.variantName ? ` (${i.variantName})` : ""}</span>
                <span>{formatMoney(i.lineTotal, cart.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(cart.subtotal, cart.currency)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{noDelivery ? "Not available" : zonesConfigured && !selectedRate ? "Choose a delivery method" : shippingCost > 0 ? formatMoney(shippingCost, cart.currency) : "Free"}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatMoney(estimatedTotal, cart.currency)}</dd></div>
          </dl>
          <p className="mt-2 text-xs opacity-60">Discount codes are applied when you place the order. The final total is confirmed by the store.</p>
          <Button type="submit" disabled={submitting || noDelivery} className="mt-6 w-full">{submitting ? "Placing order…" : "Place order & pay"}</Button>
        </Panel>
      </form>
    </Container>
    </>
  );
}
