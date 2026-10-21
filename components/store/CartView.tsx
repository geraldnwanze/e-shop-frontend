"use client";

import Link from "next/link";
import { useState } from "react";

import { CartDiscount } from "@/components/cart/CartDiscount";
import { useCart } from "@/components/cart/CartProvider";
import { PageBanner, Panel } from "@/components/store/PageBanner";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { StoreImage } from "@/components/ui/StoreImage";
import { ApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/money";
import { cartMessage, whatsappLink, type WhatsAppSettings } from "@/lib/whatsapp";

import { WhatsAppButton } from "./WhatsAppButton";

export function CartView({ whatsapp }: { whatsapp?: WhatsAppSettings }) {
  const { cart, cartId, isLoading, updateQuantity, removeItem } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<unknown>) {
    setError(null);
    setBusy(id);
    try {
      await action();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update your cart.");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <Container className="py-16"><p role="status">Loading your cart…</p></Container>;

  if (!cart || cart.items.length === 0) {
    return (
      <>
        <PageBanner title="Your cart" crumbs={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
        <Container className="py-20 text-center">
          <div aria-hidden="true" className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-3xl">🛒</div>
          <h2 className="font-heading mt-6 text-2xl">Your cart is empty</h2>
          <p className="mt-2 opacity-70">Looks like you haven&apos;t added anything yet.</p>
          <div className="mt-8"><ButtonLink href="/products" className="!rounded-[var(--sf-pill,9999px)] !px-8 !py-3">Continue shopping</ButtonLink></div>
        </Container>
      </>
    );
  }

  const blocked = cart.items.some((i) => !i.available);

  return (
    <>
    <PageBanner title="Your cart" crumbs={[{ label: "Home", href: "/" }, { label: "Cart" }]}>{cart.itemCount} item{cart.itemCount === 1 ? "" : "s"}</PageBanner>
    <Container className="py-10">
      {error ? <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-4">
          {cart.items.map((item) => (
            <li key={item.id} className="flex gap-4 rounded-[var(--sf-radius)] bg-surface p-4 shadow-sm ring-1 ring-black/10 sm:gap-5 sm:p-5">
              <Link href={`/products/${item.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-[var(--sf-radius)] bg-black/5 sm:size-28">
                <StoreImage src={item.image} alt="" className="object-cover" sizes="96px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex justify-between gap-4">
                  <div>
                    <Link href={`/products/${item.slug}`} className="font-medium">{item.name}</Link>
                    {item.variantName ? <p className="text-sm opacity-60">{item.variantName}</p> : null}
                    {!item.available ? <p role="alert" className="mt-1 text-sm text-red-600">Not enough stock for this quantity. Reduce it or remove the item.</p> : null}
                  </div>
                  <p className="font-semibold">{formatMoney(item.lineTotal, cart.currency)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-[var(--sf-pill,9999px)] border border-black/20 bg-white/60 text-sm">
                    <button type="button" aria-label={`Decrease quantity of ${item.name}`} disabled={busy === item.id || item.quantity <= 1} className="px-3 py-1.5 disabled:opacity-40" onClick={() => run(item.id, () => updateQuantity(item.id, item.quantity - 1))}>−</button>
                    <span className="w-8 text-center" aria-live="polite">{item.quantity}</span>
                    <button type="button" aria-label={`Increase quantity of ${item.name}`} disabled={busy === item.id || item.quantity >= 100} className="px-3 py-1.5 disabled:opacity-40" onClick={() => run(item.id, () => updateQuantity(item.id, item.quantity + 1))}>+</button>
                  </div>
                  <button type="button" disabled={busy === item.id} className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100" onClick={() => run(item.id, () => removeItem(item.id))}>Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Panel className="h-fit lg:sticky lg:top-24" title="Order summary" id="summary-h">
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal ({cart.itemCount} item{cart.itemCount === 1 ? "" : "s"})</dt><dd className="font-medium">{formatMoney(cart.subtotal, cart.currency)}</dd></div>
          </dl>
          {cartId ? <CartDiscount cartId={cartId} subtotal={cart.subtotal} currency={cart.currency} /> : null}
          <p className="mt-2 text-xs opacity-60">Shipping is added at checkout, and the final total is confirmed there.</p>
          <div className="mt-6">
            {blocked ? <p className="text-sm text-red-600">Fix the items marked above to continue.</p> : <ButtonLink href="/checkout" className="w-full !py-3.5 !text-base shadow-md shadow-primary/20">Checkout</ButtonLink>}
          </div>
          {!blocked && whatsapp ? (() => {
            const href = whatsappLink(whatsapp, cartMessage(whatsapp, cart));

            return href ? <div className="mt-3"><WhatsAppButton href={href} className="w-full" /></div> : null;
          })() : null}
        </Panel>
      </div>
    </Container>
    </>
  );
}
