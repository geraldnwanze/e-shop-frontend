"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { StoreImage } from "@/components/ui/StoreImage";
import { api } from "@/lib/api/client";
import { formatMoney } from "@/lib/money";
import { useDebounced } from "@/lib/use-debounced";
import type { Product, Store } from "@/lib/types";

const MIN_CHARS = 2;

/**
 * Header search with suggestions that appear as you type. Enter (or "See all results") opens the full
 * product list; arrow keys move through the suggestions; Escape closes them.
 */
export function LiveSearch({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const router = useRouter();
  const listId = useId();
  const box = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = useDebounced(value.trim(), 250);
  const enabled = term.length >= MIN_CHARS;

  const store = useQuery({ queryKey: ["store"], queryFn: () => api.get<Store>("store"), staleTime: 300_000, enabled });
  const results = useQuery({
    queryKey: ["live-search", term],
    enabled,
    staleTime: 30_000,
    queryFn: ({ signal }) => api.getPage<Product[]>("products", { search: term, per_page: 6 }, { signal }),
  });

  useEffect(() => {
    function away(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);

    return () => document.removeEventListener("mousedown", away);
  }, []);

  const items = enabled ? (results.data?.data ?? []) : [];
  const total = results.data?.meta.total ?? items.length;
  const showPanel = open && value.trim().length >= MIN_CHARS;
  const allHref = `/products?search=${encodeURIComponent(value.trim())}`;

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") return setOpen(false);
    if (!showPanel || items.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      setOpen(false);
      router.push(`/products/${items[active].slug}`);
    }
  }

  return (
    <form ref={box} action="/products" role="search" className={`relative ${className}`}>
      <label htmlFor={`${listId}-input`} className="sr-only">Search products</label>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 fill-none stroke-current opacity-50" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="9" cy="9" r="5.5" />
        <path d="M13.5 13.5L17 17" />
      </svg>
      <input
        id={`${listId}-input`}
        name="search"
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search products"
        className={`w-full rounded-full border py-2 pl-9 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-accent/60 ${tone === "dark" ? "border-white/20 bg-white/10 text-white placeholder:text-white/60" : "border-black/10 bg-black/[0.04] placeholder:opacity-60 focus:bg-white"}`}
      />

      {showPanel ? (
        <div id={listId} role="listbox" aria-label="Search suggestions" className="absolute left-0 right-0 top-full z-50 mt-2 min-w-72 overflow-hidden rounded-xl bg-white text-black shadow-2xl ring-1 ring-black/10 md:left-auto md:w-96">
          {results.isFetching && items.length === 0 ? <p role="status" className="px-4 py-3 text-sm opacity-60">Searching…</p> : null}
          {!results.isFetching && enabled && items.length === 0 ? <p role="status" className="px-4 py-3 text-sm opacity-70">No products match “{term}”.</p> : null}
          {items.map((product, i) => (
            <Link key={product.id} id={`${listId}-${i}`} role="option" aria-selected={i === active} href={`/products/${product.slug}`} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 ${i === active ? "bg-black/5" : "hover:bg-black/[0.03]"}`}>
              <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-black/5">
                <StoreImage src={product.images[0]?.url} alt={product.name} className="object-cover" sizes="44px" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{product.name}</span>
                {product.category ? <span className="block truncate text-xs opacity-60">{product.category.name}</span> : null}
              </span>
              <span className="shrink-0 text-sm font-semibold">{formatMoney(product.price, store.data?.currency ?? "NGN")}</span>
            </Link>
          ))}
          {items.length > 0 ? (
            <Link href={allHref} onClick={() => setOpen(false)} className="block border-t border-black/10 px-4 py-3 text-center text-sm font-medium hover:bg-black/[0.03]">
              See all {total > items.length ? `${total} ` : ""}results for “{value.trim()}”
            </Link>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
