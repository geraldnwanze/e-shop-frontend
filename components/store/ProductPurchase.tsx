"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { useCart } from "@/components/cart/CartProvider";
import { ApiError } from "@/lib/api/errors";
import type { Product } from "@/lib/types";
import { stockNote } from "@/lib/stock-note";
import { productMessage, whatsappLink, type WhatsAppSettings } from "@/lib/whatsapp";

import { NotifyMe } from "./NotifyMe";
import { WishlistButton } from "./WishlistButton";
import { WhatsAppButton } from "./WhatsAppButton";

export function ProductPurchase({ product, currency, acceptingOrders = true, whatsapp, productUrl }: { product: Product; currency: string; acceptingOrders?: boolean; whatsapp?: WhatsAppSettings; productUrl?: string }) {
  const { addItem } = useCart();
  const hasVariants = product.variants.length > 0;
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");
  const [error, setError] = useState<string | null>(null);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const price = variant?.price ?? product.price;
  const note = stockNote(hasVariants ? variant?.unitsLeft : product.unitsLeft);
  const available = hasVariants ? (variant ? variant.inStock : false) : product.inStock;

  async function add() {
    setError(null);
    if (hasVariants && !variant) return setError("Please choose an option.");

    setState("adding");
    try {
      await addItem({ productId: product.id, variantId: variant?.id ?? null, quantity });
      setState("added");
      window.setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setState("idle");
      setError(e instanceof ApiError ? e.message : "Could not add to cart. Please try again.");
    }
  }

  return (
    <div className="mt-6 space-y-6 border-t border-black/10 pt-6">
      <Price amount={price} compareAt={variant ? null : product.compareAtPrice} currency={currency} className="text-3xl" />

      {hasVariants ? (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">Choose an option</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={!v.inStock}
                aria-pressed={variantId === v.id}
                onClick={() => setVariantId(v.id)}
                className={`rounded-[var(--sf-pill,9999px)] border px-5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${variantId === v.id ? "border-primary bg-primary text-primary-fg shadow-md" : "border-black/20 hover:border-primary"}`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {note ? <p className="text-sm font-medium text-amber-700">{note}</p> : null}

      <div className="flex items-center gap-4">
        <label htmlFor="qty" className="sr-only">Quantity</label>
        <div className="flex items-center rounded-[var(--sf-pill,9999px)] border border-black/20 bg-white/60">
          <button type="button" aria-label="Decrease quantity" className="px-3 py-2" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
          <input id="qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(Math.min(100, Math.max(1, Number.parseInt(e.target.value, 10) || 1)))} className="w-12 bg-transparent text-center text-sm" />
          <button type="button" aria-label="Increase quantity" className="px-3 py-2" onClick={() => setQuantity((q) => Math.min(100, q + 1))}>+</button>
        </div>
        <Button type="button" onClick={add} disabled={state === "adding" || !acceptingOrders || (!hasVariants && !product.inStock)} className="flex-1 !py-3.5 !text-base shadow-md shadow-primary/20">
          {!acceptingOrders ? "Not available yet" : !available && !hasVariants ? "Sold out" : state === "adding" ? "Adding…" : state === "added" ? "Added ✓" : "Add to cart"}
        </Button>
      </div>

      {acceptingOrders && (hasVariants ? product.variants.some((v) => !v.inStock) : !product.inStock) ? (
        <NotifyMe slug={product.slug} options={product.variants.filter((v) => !v.inStock).map((v) => ({ id: v.id, name: v.name }))} />
      ) : null}

      {whatsapp && productUrl && (hasVariants ? variant : true) ? (() => {
        const href = whatsappLink(whatsapp, productMessage(whatsapp, { name: product.name, variantName: variant?.name ?? null, quantity, unitPrice: price, currency, url: productUrl }));

        return href ? <WhatsAppButton href={href} className="w-full" /> : null;
      })() : whatsapp?.enabled && hasVariants ? (
        <WhatsAppButton href="#" className="w-full" onBeforeOpen={() => { setError("Please choose an option."); return false; }} />
      ) : null}

      <WishlistButton productId={product.id} />

      <p role={error ? "alert" : "status"} className={error ? "text-sm text-red-600" : "sr-only"}>
        {error ?? (state === "added" ? "Added to cart" : "")}
      </p>
    </div>
  );
}
